import { t } from "elysia";
import { addDays, daysBetween } from "../domain/day";
import { type Engine, type Supply, unitStep } from "../domain/engine";

// The JSON shapes the app reads. Schemas double as the OpenAPI contract.

const day = t.String({ format: "date" });
const nullable = <T extends Parameters<typeof t.Union>[0][number]>(schema: T) =>
	t.Union([schema, t.Null()]);

export const supplyView = t.Object({
	id: t.String(),
	name: t.String(),
	unit: t.String(),
	categoryId: t.String(),
	icon: nullable(t.String()),
	critical: t.Boolean(),
	shelfLifeDays: t.Number(),
	referencePrice: t.Number(),
	phrases: t.Record(t.String(), t.Number()),
	stock: t.Number(),
	realDays: t.Number(),
	learning: t.Boolean(),
	/** Days until the most urgent lot expires, when that is today or tomorrow. */
	expiresInDays: nullable(t.Number()),
	/** Whether tonight's close should ask for this supply. */
	dueForClose: t.Boolean(),
	expectedRemaining: t.Number(),
	closeCheck: nullable(
		t.Object({
			base: t.Number(),
			gapDays: t.Number(),
			usual: t.Number(),
			reviewBelow: t.Number(),
		}),
	),
	priceCheck: nullable(
		t.Object({ usual: t.Number(), low: t.Number(), high: t.Number() }),
	),
});

export const recommendationView = t.Object({
	toBuy: t.Number(),
	onHand: t.Number(),
	demand: t.Number(),
	buffer: t.Number(),
	horizonDays: t.Number(),
	typicalError: t.Number(),
});

export const supplyDetailView = t.Composite([
	supplyView,
	t.Object({
		recommendation: recommendationView,
		/** Forecast for today and the six days after it. */
		week: t.Array(t.Object({ day, amount: t.Number() })),
		/** The last seven days, most recent first. */
		recent: t.Array(
			t.Object({
				day,
				amount: t.Number(),
				kind: t.UnionEnum(["real", "estimated", "closed", "missing"]),
			}),
		),
		lots: t.Array(
			t.Object({
				id: t.String(),
				purchasedOn: day,
				expiresOn: day,
				remaining: t.Number(),
				daysLeft: t.Number(),
			}),
		),
	}),
]);

export const todayView = t.Object({
	day,
	/** Expiring stock grouped by supply, most urgent first. */
	alerts: t.Array(
		t.Object({
			supply: supplyView,
			daysLeft: t.Number(),
			remaining: t.Number(),
			lots: t.Array(
				t.Object({
					purchasedOn: day,
					remaining: t.Number(),
					daysLeft: t.Number(),
				}),
			),
		}),
	),
	toBuy: t.Array(
		t.Object({
			supply: supplyView,
			recommendation: recommendationView,
			/** Already purchased today. */
			bought: t.Boolean(),
		}),
	),
	covered: t.Array(supplyView),
});

export const savingsView = t.Object({
	/** The last four months, oldest first. */
	months: t.Array(t.Object({ month: t.String(), soles: t.Number() })),
	current: t.Number(),
	previous: t.Number(),
	topWasted: t.Array(t.Object({ supply: supplyView, soles: t.Number() })),
});

const DAYS_BETWEEN_SECONDARY_COUNTS = 7;

export function toSupplyView(engine: Engine, supply: Supply) {
	const { id } = supply;
	const step = unitStep(supply.unit);
	const lastCount = engine
		.records(id)
		.findLast((r) => r.remaining !== null)?.day;
	const expiring = engine
		.activeLots(id)
		.flatMap((l) =>
			l.lot.expiresOn ? [daysBetween(engine.today, l.lot.expiresOn)] : [],
		)
		.filter((daysLeft) => daysLeft <= 1);
	return {
		...supply,
		stock: engine.currentStock(id),
		realDays: engine.realDays(id),
		learning: engine.isLearning(id),
		expiresInDays: expiring.length > 0 ? Math.min(...expiring) : null,
		dueForClose:
			supply.critical ||
			!lastCount ||
			daysBetween(lastCount, engine.today) >= DAYS_BETWEEN_SECONDARY_COUNTS,
		expectedRemaining:
			Math.round(engine.expectedRemainingTonight(id) / step) * step,
		closeCheck: engine.closeCheck(id),
		priceCheck: engine.priceCheck(id),
	};
}

const range = (length: number) => Array.from({ length }, (_, i) => i);

export function toRecommendationView(engine: Engine, supplyId: string) {
	const { supplyId: _, ...recommendation } = engine.recommend(supplyId);
	return recommendation;
}

export function toSupplyDetailView(engine: Engine, supply: Supply) {
	const { id } = supply;
	const { today } = engine;
	const consumption = new Map(engine.consumption(id).map((c) => [c.day, c]));
	return {
		...toSupplyView(engine, supply),
		recommendation: toRecommendationView(engine, id),
		week: range(7).map((i) => {
			const day = addDays(today, i);
			return { day, amount: engine.forecast(id, day) };
		}),
		recent: range(7).map((i) => {
			const day = addDays(today, -1 - i);
			const c = consumption.get(day);
			if (!c) return { day, amount: 0, kind: "missing" as const };
			const kind = c.closed ? "closed" : c.estimated ? "estimated" : "real";
			return { day, amount: c.amount, kind: kind as typeof kind };
		}),
		lots: engine.activeLots(id).flatMap(({ lot, remaining }) =>
			lot.expiresOn
				? [
						{
							id: lot.id,
							purchasedOn: lot.purchasedOn,
							expiresOn: lot.expiresOn,
							remaining,
							daysLeft: daysBetween(today, lot.expiresOn),
						},
					]
				: [],
		),
	};
}
