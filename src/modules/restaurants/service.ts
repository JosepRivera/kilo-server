import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { categories, restaurants } from "../../db/schema";
import { CATEGORY_TEMPLATE } from "../../domain/catalog/category-template";
import { type Restaurant, restaurantColumns } from "../session/service";
import { hashToken, newToken } from "../session/tokens";

const categoryColumns = {
	id: categories.id,
	name: categories.name,
	purchaseIntervalDays: categories.purchaseIntervalDays,
	monthlySpend: categories.monthlySpend,
	critical: categories.critical,
};

type CategoryFields = {
	name: string;
	purchaseIntervalDays: number;
	monthlySpend: number;
	critical: boolean;
};

export const restaurantService = (db: Db) => ({
	async register(name: string) {
		const token = newToken();
		const restaurant = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(restaurants)
				.values({ name, tokenHash: hashToken(token) })
				.returning(restaurantColumns);
			if (!created) throw new Error("Restaurant was not created");
			await tx.insert(categories).values(
				CATEGORY_TEMPLATE.map((category) => ({
					...category,
					restaurantId: created.id,
				})),
			);
			return created;
		});
		return { token, restaurant };
	},

	async update(
		restaurant: Restaurant,
		changes: Partial<Pick<Restaurant, "name" | "closedWeekdays">>,
	) {
		const [updated] = await db
			.update(restaurants)
			.set(changes)
			.where(eq(restaurants.id, restaurant.id))
			.returning(restaurantColumns);
		return updated ?? restaurant;
	},

	listCategories(restaurantId: string) {
		return db
			.select(categoryColumns)
			.from(categories)
			.where(eq(categories.restaurantId, restaurantId))
			.orderBy(categories.name);
	},

	async addCategory(restaurantId: string, fields: CategoryFields) {
		const [created] = await db
			.insert(categories)
			.values({ ...fields, restaurantId })
			.onConflictDoNothing()
			.returning(categoryColumns);
		return created;
	},

	async updateCategory(
		restaurantId: string,
		categoryId: string,
		changes: Partial<CategoryFields>,
	) {
		const [updated] = await db
			.update(categories)
			.set(changes)
			.where(
				and(
					eq(categories.id, categoryId),
					eq(categories.restaurantId, restaurantId),
				),
			)
			.returning(categoryColumns);
		return updated;
	},
});
