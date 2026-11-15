import { and, eq, gte } from "drizzle-orm";
import type { Db } from "../db/client";
import {
	categories,
	lots,
	stockRecords,
	supplies,
	supplyPhrases,
} from "../db/schema";
import { addDays, type Day } from "../domain/day";
import { Engine, type Supply } from "../domain/engine";
import type { Restaurant } from "./session";

// shortcut: forecasts are recomputed from raw history on every request, which
// is instant for a pilot. Materialize them in a nightly job once a restaurant's
// history makes this show up in response times.
const HISTORY_DAYS = 400;

/** Loads one restaurant's records and builds the engine that reads them. */
export async function loadEngine(
	db: Db,
	restaurant: Restaurant,
	today: Day,
): Promise<Engine> {
	const mine = eq(supplies.restaurantId, restaurant.id);
	const since = addDays(today, -HISTORY_DAYS);
	const [categoryRows, supplyRows, phraseRows, stockRows, lotRows] =
		await Promise.all([
			db
				.select()
				.from(categories)
				.where(eq(categories.restaurantId, restaurant.id))
				.orderBy(categories.name),
			db.select().from(supplies).where(mine).orderBy(supplies.name),
			db
				.select({
					supplyId: supplyPhrases.supplyId,
					phrase: supplyPhrases.phrase,
					amount: supplyPhrases.amount,
				})
				.from(supplyPhrases)
				.innerJoin(supplies, eq(supplies.id, supplyPhrases.supplyId))
				.where(mine),
			db
				.select({
					supplyId: stockRecords.supplyId,
					day: stockRecords.day,
					remaining: stockRecords.remaining,
				})
				.from(stockRecords)
				.innerJoin(supplies, eq(supplies.id, stockRecords.supplyId))
				.where(and(mine, gte(stockRecords.day, since))),
			db
				.select({
					id: lots.id,
					supplyId: lots.supplyId,
					purchasedOn: lots.purchasedOn,
					quantity: lots.quantity,
					cost: lots.cost,
					expiresOn: lots.expiresOn,
				})
				.from(lots)
				.innerJoin(supplies, eq(supplies.id, lots.supplyId))
				.where(and(mine, gte(lots.purchasedOn, since))),
		]);

	const phrases = Map.groupBy(phraseRows, (p) => p.supplyId);
	return new Engine(
		{
			categories: categoryRows,
			supplies: supplyRows.map(
				({ restaurantId: _, ...supply }): Supply => ({
					...supply,
					phrases: Object.fromEntries(
						(phrases.get(supply.id) ?? []).map((p) => [p.phrase, p.amount]),
					),
				}),
			),
			stock: stockRows,
			lots: lotRows,
			closedWeekdays: restaurant.closedWeekdays,
		},
		today,
	);
}
