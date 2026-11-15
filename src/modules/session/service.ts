import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { restaurants } from "../../db/schema";
import { hashToken } from "./tokens";

export type Restaurant = {
	id: string;
	name: string;
	closedWeekdays: number[];
};

export const restaurantColumns = {
	id: restaurants.id,
	name: restaurants.name,
	closedWeekdays: restaurants.closedWeekdays,
};

export async function findRestaurantByToken(
	db: Db,
	token: string,
): Promise<Restaurant | undefined> {
	const [restaurant] = await db
		.select(restaurantColumns)
		.from(restaurants)
		.where(eq(restaurants.tokenHash, hashToken(token)))
		.limit(1);
	return restaurant;
}
