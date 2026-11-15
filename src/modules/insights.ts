import { Elysia } from "elysia";
import { monthOf } from "../domain/day";
import { loadEngine } from "./kitchen";
import { type Deps, session } from "./session";
import {
	savingsView,
	todayView,
	toRecommendationView,
	toSupplyView,
} from "./views";

const MONTHS_SHOWN = 4;
const TOP_WASTED = 5;

/** The `count` months ending in `month` ("YYYY-MM"), oldest first. */
function lastMonths(month: string, count: number): string[] {
	const [year = 0, index = 1] = month.split("-").map(Number);
	return Array.from({ length: count }, (_, i) =>
		new Date(Date.UTC(year, index - count + i, 1)).toISOString().slice(0, 7),
	);
}

export const insightRoutes = (deps: Deps) =>
	new Elysia()
		.use(session(deps))
		.get(
			"/today",
			async ({ restaurant, today }) => {
				const engine = await loadEngine(deps.db, restaurant, today);
				const views = new Map(
					engine.kitchen.supplies.map((s) => [s.id, toSupplyView(engine, s)]),
				);
				const view = (id: string) => {
					const found = views.get(id);
					if (!found) throw new Error(`Unknown supply ${id}`);
					return found;
				};

				const due = new Set(
					engine.kitchen.categories
						.filter((c) => engine.isDue(c.id))
						.map((c) => c.id),
				);
				const recommended = engine.kitchen.supplies
					.filter((s) => due.has(s.categoryId))
					.map((s) => ({
						supply: view(s.id),
						recommendation: toRecommendationView(engine, s.id),
						bought: engine.lotsOf(s.id).at(-1)?.purchasedOn === today,
					}));

				const alerts = [
					...Map.groupBy(engine.expiryAlerts(), (a) => a.supplyId),
				].map(([id, group]) => ({
					supply: view(id),
					daysLeft: Math.min(...group.map((a) => a.daysLeft)),
					remaining: group.reduce((sum, a) => sum + a.lot.remaining, 0),
					lots: group.map((a) => ({
						purchasedOn: a.lot.lot.purchasedOn,
						remaining: a.lot.remaining,
						daysLeft: a.daysLeft,
					})),
				}));

				return {
					day: today,
					alerts: alerts.sort(
						(a, b) =>
							a.daysLeft - b.daysLeft ||
							a.supply.name.localeCompare(b.supply.name, "es"),
					),
					toBuy: recommended.filter((r) => r.recommendation.toBuy > 0),
					covered: recommended
						.filter((r) => r.recommendation.toBuy <= 0)
						.map((r) => r.supply),
				};
			},
			{
				response: todayView,
				detail: { summary: "What expires, what to buy and what is covered" },
			},
		)
		.get(
			"/savings",
			async ({ restaurant, today }) => {
				const engine = await loadEngine(deps.db, restaurant, today);
				const waste = engine.waste();
				const byMonth = Map.groupBy(waste, (w) => monthOf(w.day));
				const total = (events: typeof waste = []) =>
					events.reduce((sum, w) => sum + w.soles, 0);

				const months = lastMonths(monthOf(today), MONTHS_SHOWN).map(
					(month) => ({
						month,
						soles: total(byMonth.get(month)),
					}),
				);
				const bySupply = Map.groupBy(
					byMonth.get(monthOf(today)) ?? [],
					(w) => w.supplyId,
				);
				return {
					months,
					// Always against the month right before, never a fixed baseline.
					current: months.at(-1)?.soles ?? 0,
					previous: months.at(-2)?.soles ?? 0,
					topWasted: [...bySupply]
						.map(([id, events]) => ({
							supply: toSupplyView(engine, engine.supply(id)),
							soles: total(events),
						}))
						.sort((a, b) => b.soles - a.soles)
						.slice(0, TOP_WASTED),
				};
			},
			{
				response: savingsView,
				detail: { summary: "Soles lost to expired stock, month against month" },
			},
		);
