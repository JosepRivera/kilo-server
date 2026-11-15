import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../../db/client";
import { lots, stockRecords, supplies } from "../../db/schema";
import { addDays, type Day } from "../../domain/day";

type PurchaseLine = {
	supplyId: string;
	quantity: number;
	cost: number;
	expiresOn?: string;
};

type OwnedSupply = { id: string; shelfLifeDays: number };

export const recordService = (db: Db) => {
	const ownedAmong = async (
		restaurantId: string,
		supplyIds: string[],
	): Promise<Map<string, OwnedSupply> | null> => {
		const wanted = [...new Set(supplyIds)];
		const found = await db
			.select({ id: supplies.id, shelfLifeDays: supplies.shelfLifeDays })
			.from(supplies)
			.where(
				and(
					eq(supplies.restaurantId, restaurantId),
					inArray(supplies.id, wanted),
				),
			);
		return found.length === wanted.length
			? new Map(found.map((supply) => [supply.id, supply]))
			: null;
	};

	const upsertRecords = (rows: (typeof stockRecords.$inferInsert)[]) =>
		db
			.insert(stockRecords)
			.values(rows)
			.onConflictDoUpdate({
				target: [stockRecords.supplyId, stockRecords.day],
				set: { remaining: sql`excluded.remaining` },
			});

	return {
		async saveClose(
			restaurantId: string,
			day: Day,
			remaining: Record<string, number>,
		): Promise<boolean> {
			const supplyIds = Object.keys(remaining);
			if (!(await ownedAmong(restaurantId, supplyIds))) return false;
			await upsertRecords(
				supplyIds.map((supplyId) => ({
					supplyId,
					day,
					remaining: remaining[supplyId] ?? 0,
				})),
			);
			return true;
		},

		async markNoConsumption(restaurantId: string, day: Day): Promise<void> {
			const own = await db
				.select({ id: supplies.id })
				.from(supplies)
				.where(eq(supplies.restaurantId, restaurantId));
			if (own.length === 0) return;
			await upsertRecords(
				own.map(({ id }) => ({ supplyId: id, day, remaining: null })),
			);
		},

		async savePurchase(
			restaurantId: string,
			day: Day,
			lines: PurchaseLine[],
		): Promise<number | null> {
			const owned = await ownedAmong(
				restaurantId,
				lines.map((line) => line.supplyId),
			);
			if (!owned) return null;
			const created = await db
				.insert(lots)
				.values(
					lines.map((line) => ({
						...line,
						purchasedOn: day,
						expiresOn:
							line.expiresOn ??
							addDays(day, owned.get(line.supplyId)?.shelfLifeDays ?? 0),
					})),
				)
				.returning({ id: lots.id });
			return created.length;
		},
	};
};
