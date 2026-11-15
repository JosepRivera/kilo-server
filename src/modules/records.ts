import { and, eq, inArray, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import type { Db } from "../db/client";
import { lots, stockRecords, supplies } from "../db/schema";
import { addDays } from "../domain/day";
import { type Deps, session } from "./session";

const supplyId = t.String({ format: "uuid" });
const FOREIGN_SUPPLY = "Hay insumos que no son de este restaurante";

/** The restaurant's supplies among `ids`, or null if any is not its own. */
async function ownSupplies(db: Db, restaurantId: string, ids: string[]) {
	const unique = [...new Set(ids)];
	const owned = await db
		.select({ id: supplies.id, shelfLifeDays: supplies.shelfLifeDays })
		.from(supplies)
		.where(
			and(
				eq(supplies.restaurantId, restaurantId),
				inArray(supplies.id, unique),
			),
		);
	return owned.length === unique.length
		? new Map(owned.map((s) => [s.id, s]))
		: null;
}

const upsertCounts = (db: Db, rows: (typeof stockRecords.$inferInsert)[]) =>
	db
		.insert(stockRecords)
		.values(rows)
		.onConflictDoUpdate({
			target: [stockRecords.supplyId, stockRecords.day],
			set: { remaining: sql`excluded.remaining` },
		});

export const recordRoutes = (deps: Deps) =>
	new Elysia()
		.use(session(deps))
		.post(
			"/stock-close",
			async ({ restaurant, today, body, status }) => {
				const ids = Object.keys(body.remaining);
				if (!(await ownSupplies(deps.db, restaurant.id, ids))) {
					return status(422, FOREIGN_SUPPLY);
				}
				// Dictating again the same night corrects the count, never doubles it.
				await upsertCounts(
					deps.db,
					ids.map((id) => ({
						supplyId: id,
						day: today,
						remaining: body.remaining[id] ?? 0,
					})),
				);
				return status(204, undefined);
			},
			{
				body: t.Object({
					remaining: t.Record(supplyId, t.Number({ minimum: 0 }), {
						minProperties: 1,
					}),
				}),
				response: { 204: t.Void(), 422: t.String() },
				detail: { summary: "Tonight's count: what is left of each supply" },
			},
		)
		.post(
			"/stock-close/none",
			async ({ restaurant, today, status }) => {
				const all = await deps.db
					.select({ id: supplies.id })
					.from(supplies)
					.where(eq(supplies.restaurantId, restaurant.id));
				if (all.length > 0) {
					await upsertCounts(
						deps.db,
						all.map(({ id }) => ({
							supplyId: id,
							day: today,
							remaining: null,
						})),
					);
				}
				return status(204, undefined);
			},
			{
				response: { 204: t.Void() },
				detail: { summary: "Today had no consumption (a planned closure)" },
			},
		)
		.post(
			"/purchases",
			async ({ restaurant, today, body, status }) => {
				const owned = await ownSupplies(
					deps.db,
					restaurant.id,
					body.lines.map((line) => line.supplyId),
				);
				if (!owned) return status(422, FOREIGN_SUPPLY);
				// Two lines of the same supply stay two lots, each with its own cost.
				const created = await deps.db
					.insert(lots)
					.values(
						body.lines.map((line) => ({
							...line,
							purchasedOn: today,
							expiresOn:
								line.expiresOn ??
								addDays(today, owned.get(line.supplyId)?.shelfLifeDays ?? 0),
						})),
					)
					.returning({ id: lots.id });
				return status(201, { lots: created.length });
			},
			{
				body: t.Object({
					lines: t.Array(
						t.Object({
							supplyId,
							quantity: t.Number({ exclusiveMinimum: 0 }),
							cost: t.Number({ minimum: 0 }),
							expiresOn: t.Optional(t.String({ format: "date" })),
						}),
						{ minItems: 1, maxItems: 200 },
					),
				}),
				response: { 201: t.Object({ lots: t.Number() }), 422: t.String() },
				detail: { summary: "What was bought: one lot per line" },
			},
		);
