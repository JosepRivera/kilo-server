import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { categories, supplies, supplyPhrases } from "../../db/schema";
import { findCatalogEntry } from "../../domain/catalog/master-catalog";
import { resolve } from "../../domain/catalog/resolve";
import { foldText, normalizeTerm } from "../../domain/catalog/text";
import type { Day } from "../../domain/day";
import { loadEngine } from "../kitchen/repository";
import type { Restaurant } from "../session/service";
import { toSupplyDetailView, toSupplyView } from "./presenter";

const DEFAULT_SHELF_LIFE_DAYS = 7;

type NewSupply = {
	name: string;
	unit?: string;
	categoryId?: string;
	shelfLifeDays?: number;
	referencePrice?: number;
};

type SupplyView = ReturnType<typeof toSupplyView>;

export type AddSupplyResult =
	| { outcome: "existing" | "created"; supply: SupplyView }
	| { outcome: "missing-unit" | "missing-category" };

export const supplyService = (db: Db) => {
	const owned = (restaurantId: string, supplyId: string) =>
		and(eq(supplies.id, supplyId), eq(supplies.restaurantId, restaurantId));

	const findByName = async (
		restaurant: Restaurant,
		today: Day,
		name: string,
	) => {
		const engine = await loadEngine(db, restaurant, today);
		const key = normalizeTerm(name);
		const supply = engine.supplies.find((s) => normalizeTerm(s.name) === key);
		return supply && toSupplyView(engine, supply);
	};

	const categoryFor = async (
		restaurantId: string,
		categoryId: string | undefined,
		catalogKey: string | undefined,
	) => {
		const own = await db
			.select({
				id: categories.id,
				key: categories.key,
				critical: categories.critical,
			})
			.from(categories)
			.where(eq(categories.restaurantId, restaurantId));
		return categoryId
			? own.find((category) => category.id === categoryId)
			: own.find((category) => catalogKey && category.key === catalogKey);
	};

	return {
		async list(restaurant: Restaurant, today: Day) {
			const engine = await loadEngine(db, restaurant, today);
			return engine.supplies.map((supply) => toSupplyView(engine, supply));
		},

		async detail(restaurant: Restaurant, today: Day, supplyId: string) {
			const engine = await loadEngine(db, restaurant, today);
			const supply = engine.supplies.find((s) => s.id === supplyId);
			return supply && toSupplyDetailView(engine, supply);
		},

		async add(
			restaurant: Restaurant,
			today: Day,
			fields: NewSupply,
		): Promise<AddSupplyResult> {
			const existing = await findByName(restaurant, today, fields.name);
			if (existing) return { outcome: "existing", supply: existing };

			const entry = findCatalogEntry(fields.name);
			const unit = fields.unit ?? entry?.unit;
			if (!unit) return { outcome: "missing-unit" };
			const category = await categoryFor(
				restaurant.id,
				fields.categoryId,
				entry?.category,
			);
			if (!category) return { outcome: "missing-category" };

			const name = entry?.name ?? fields.name.trim();
			await db.insert(supplies).values({
				restaurantId: restaurant.id,
				categoryId: category.id,
				name,
				unit,
				shelfLifeDays:
					fields.shelfLifeDays ??
					entry?.shelfLifeDays ??
					DEFAULT_SHELF_LIFE_DAYS,
				referencePrice: fields.referencePrice ?? entry?.referencePrice ?? 0,
				icon: entry?.icon ?? null,
				critical: category.critical,
			});
			const created = await findByName(restaurant, today, name);
			if (!created) throw new Error("Supply was not created");
			return { outcome: "created", supply: created };
		},

		async setCritical(
			restaurantId: string,
			supplyId: string,
			critical: boolean,
		) {
			const updated = await db
				.update(supplies)
				.set({ critical })
				.where(owned(restaurantId, supplyId))
				.returning({ id: supplies.id });
			return updated.length > 0;
		},

		async rememberPhrase(
			restaurantId: string,
			supplyId: string,
			phrase: string,
			amount: number,
		) {
			const [supply] = await db
				.select({ id: supplies.id })
				.from(supplies)
				.where(owned(restaurantId, supplyId));
			if (!supply) return false;
			await db
				.insert(supplyPhrases)
				.values({ supplyId, phrase: foldText(phrase), amount })
				.onConflictDoUpdate({
					target: [supplyPhrases.supplyId, supplyPhrases.phrase],
					set: { amount },
				});
			return true;
		},

		async resolve(restaurantId: string, term: string) {
			return resolve(
				term,
				await db
					.select({ id: supplies.id, name: supplies.name, unit: supplies.unit })
					.from(supplies)
					.where(eq(supplies.restaurantId, restaurantId)),
			);
		},
	};
};
