import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { categories, supplies, supplyPhrases } from "../db/schema";
import {
	findCatalogEntry,
	foldText,
	normalizeTerm,
	resolve,
} from "../domain/catalog";
import { loadEngine } from "./kitchen";
import { type Deps, session } from "./session";
import {
	supplyDetailView,
	supplyView,
	toSupplyDetailView,
	toSupplyView,
} from "./views";

const params = t.Object({ id: t.String({ format: "uuid" }) });
const NOT_FOUND = "Insumo no encontrado";

const candidate = t.Object({
	supplyId: t.Union([t.String(), t.Null()]),
	name: t.String(),
	unit: t.String(),
	category: t.Union([t.String(), t.Null()]),
});

export const resolutionView = t.Union([
	t.Object({ kind: t.Literal("exact"), candidate }),
	t.Object({ kind: t.Literal("ambiguous"), candidates: t.Array(candidate) }),
	t.Object({ kind: t.Literal("unknown") }),
]);

export const supplyRoutes = (deps: Deps) =>
	new Elysia()
		.use(session(deps))
		.get(
			"/supplies",
			async ({ restaurant, today }) => {
				const engine = await loadEngine(deps.db, restaurant, today);
				return engine.kitchen.supplies.map((s) => toSupplyView(engine, s));
			},
			{ response: t.Array(supplyView) },
		)
		.get(
			"/supplies/:id",
			async ({ restaurant, today, params, status }) => {
				const engine = await loadEngine(deps.db, restaurant, today);
				const supply = engine.kitchen.supplies.find((s) => s.id === params.id);
				return supply
					? toSupplyDetailView(engine, supply)
					: status(404, NOT_FOUND);
			},
			{
				params,
				response: { 200: supplyDetailView, 404: t.String() },
				detail: {
					summary: "Forecast, recent days, lots and the why of a purchase",
				},
			},
		)
		.post(
			"/supplies",
			async ({ restaurant, today, body, status }) => {
				const { db } = deps;
				const find = async () => {
					const engine = await loadEngine(db, restaurant, today);
					const key = normalizeTerm(body.name);
					const supply = engine.kitchen.supplies.find(
						(s) => normalizeTerm(s.name) === key,
					);
					return supply && toSupplyView(engine, supply);
				};
				// Asking for a supply that already exists returns it: the app can
				// call this for every candidate the user picks without checking.
				const existing = await find();
				if (existing) return existing;

				const entry = findCatalogEntry(body.name);
				const unit = body.unit ?? entry?.unit;
				if (!unit) return status(422, "Falta la unidad de medida");
				const owned = await db
					.select({
						id: categories.id,
						key: categories.key,
						critical: categories.critical,
					})
					.from(categories)
					.where(eq(categories.restaurantId, restaurant.id));
				const category = body.categoryId
					? owned.find((c) => c.id === body.categoryId)
					: owned.find((c) => entry && c.key === entry.category);
				if (!category) return status(422, "Elige una categoría");

				await db.insert(supplies).values({
					restaurantId: restaurant.id,
					categoryId: category.id,
					name: entry?.name ?? body.name.trim(),
					unit,
					shelfLifeDays: body.shelfLifeDays ?? entry?.shelfLifeDays ?? 7,
					referencePrice: body.referencePrice ?? entry?.referencePrice ?? 0,
					icon: entry?.icon ?? null,
					critical: category.critical,
				});
				const created = await find();
				if (!created) throw new Error("Supply was not created");
				return status(201, created);
			},
			{
				body: t.Object({
					name: t.String({ minLength: 1, maxLength: 80 }),
					unit: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
					categoryId: t.Optional(t.String({ format: "uuid" })),
					shelfLifeDays: t.Optional(t.Integer({ minimum: 1, maximum: 3650 })),
					referencePrice: t.Optional(t.Number({ minimum: 0 })),
				}),
				response: { 200: supplyView, 201: supplyView, 422: t.String() },
				detail: {
					summary: "Add a supply; a master-catalog name fills in the rest",
				},
			},
		)
		.patch(
			"/supplies/:id",
			async ({ restaurant, params, body, status }) => {
				const [updated] = await deps.db
					.update(supplies)
					.set(body)
					.where(
						and(
							eq(supplies.id, params.id),
							eq(supplies.restaurantId, restaurant.id),
						),
					)
					.returning({ id: supplies.id });
				return updated ? status(204, undefined) : status(404, NOT_FOUND);
			},
			{
				params,
				body: t.Object({ critical: t.Boolean() }),
				response: { 204: t.Void(), 404: t.String() },
				detail: { summary: "Critical (counted nightly) or secondary (weekly)" },
			},
		)
		.put(
			"/supplies/:id/phrases",
			async ({ restaurant, params, body, status }) => {
				const [owned] = await deps.db
					.select({ id: supplies.id })
					.from(supplies)
					.where(
						and(
							eq(supplies.id, params.id),
							eq(supplies.restaurantId, restaurant.id),
						),
					);
				if (!owned) return status(404, NOT_FOUND);
				const row = {
					supplyId: owned.id,
					phrase: foldText(body.phrase),
					amount: body.amount,
				};
				await deps.db
					.insert(supplyPhrases)
					.values(row)
					.onConflictDoUpdate({
						target: [supplyPhrases.supplyId, supplyPhrases.phrase],
						set: { amount: row.amount },
					});
				return status(204, undefined);
			},
			{
				params,
				body: t.Object({
					phrase: t.String({ minLength: 1, maxLength: 60 }),
					amount: t.Number({ exclusiveMinimum: 0 }),
				}),
				response: { 204: t.Void(), 404: t.String() },
				detail: {
					summary: "Remember what 'medio balde' means for this supply",
				},
			},
		)
		.get(
			"/catalog/resolve",
			async ({ restaurant, query }) =>
				resolve(
					query.term,
					await deps.db
						.select({
							id: supplies.id,
							name: supplies.name,
							unit: supplies.unit,
						})
						.from(supplies)
						.where(eq(supplies.restaurantId, restaurant.id)),
				),
			{
				query: t.Object({ term: t.String({ minLength: 1, maxLength: 80 }) }),
				response: resolutionView,
				detail: {
					summary: "Exact, ambiguous or unknown: never a silent guess",
				},
			},
		);
