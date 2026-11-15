import { and, eq, gte } from "drizzle-orm";
import type { Db } from "../../db/client";
import {
	categories,
	lots,
	stockRecords,
	supplies,
	supplyPhrases,
} from "../../db/schema";
import { addDays, type Day } from "../../domain/day";
import { Engine } from "../../domain/engine";
import type { Restaurant } from "../session/service";

const HISTORY_DAYS = 400;

export async function loadEngine(
	db: Db,
	restaurant: Restaurant,
	today: Day,
): Promise<Engine> {
	const ownSupply = eq(supplies.restaurantId, restaurant.id);
	const since = addDays(today, -HISTORY_DAYS);

	const [categoryRows, supplyRows, phraseRows, stockRows, lotRows] =
		await Promise.all([
			db
				.select()
				.from(categories)
				.where(eq(categories.restaurantId, restaurant.id))
				.orderBy(categories.name),
			db.select().from(supplies).where(ownSupply).orderBy(supplies.name),
			db
				.select({
					supplyId: supplyPhrases.supplyId,
					phrase: supplyPhrases.phrase,
					amount: supplyPhrases.amount,
				})
				.from(supplyPhrases)
				.innerJoin(supplies, eq(supplies.id, supplyPhrases.supplyId))
				.where(ownSupply),
			db
				.select({
					supplyId: stockRecords.supplyId,
					day: stockRecords.day,
					remaining: stockRecords.remaining,
				})
				.from(stockRecords)
				.innerJoin(supplies, eq(supplies.id, stockRecords.supplyId))
				.where(and(ownSupply, gte(stockRecords.day, since))),
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
				.where(and(ownSupply, gte(lots.purchasedOn, since))),
		]);

	const phrasesBySupply = Map.groupBy(phraseRows, (row) => row.supplyId);
	return new Engine(
		{
			categories: categoryRows,
			supplies: supplyRows.map(({ restaurantId: _, ...supply }) => ({
				...supply,
				phrases: Object.fromEntries(
					(phrasesBySupply.get(supply.id) ?? []).map((row) => [
						row.phrase,
						row.amount,
					]),
				),
			})),
			stock: stockRows,
			lots: lotRows,
			closedWeekdays: restaurant.closedWeekdays,
		},
		today,
	);
}
