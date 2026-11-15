import { addDays, daysBetween, daysFrom } from "../../domain/day";
import type { Engine } from "../../domain/engine";
import type { Supply } from "../../domain/kitchen";
import { roundToStep } from "../../domain/units";

const DAYS_BETWEEN_SECONDARY_COUNTS = 7;
const DAYS_SHOWN = 7;

function isDueForClose(engine: Engine, supply: Supply): boolean {
	if (supply.critical) return true;
	const daysSince = engine.daysSinceLastCount(supply.id);
	return daysSince === null || daysSince >= DAYS_BETWEEN_SECONDARY_COUNTS;
}

function expiresInDays(engine: Engine, supplyId: string): number | null {
	const expiring = engine.expiringLots(supplyId).map((alert) => alert.daysLeft);
	return expiring.length > 0 ? Math.min(...expiring) : null;
}

export function toSupplyView(engine: Engine, supply: Supply) {
	const { id } = supply;
	return {
		...supply,
		stock: engine.currentStock(id),
		realDays: engine.realDays(id),
		learning: engine.isLearning(id),
		expiresInDays: expiresInDays(engine, id),
		dueForClose: isDueForClose(engine, supply),
		expectedRemaining: roundToStep(
			engine.expectedRemainingTonight(id),
			supply.unit,
		),
		closeCheck: engine.closeCheck(id),
		priceCheck: engine.priceCheck(id),
	};
}

export function toRecommendationView(engine: Engine, supplyId: string) {
	const { supplyId: _, ...recommendation } = engine.recommend(supplyId);
	return recommendation;
}

function recentDays(engine: Engine, supplyId: string) {
	const byDay = new Map(engine.consumption(supplyId).map((c) => [c.day, c]));
	return daysFrom(addDays(engine.today, -DAYS_SHOWN), DAYS_SHOWN)
		.reverse()
		.map((day) => {
			const consumption = byDay.get(day);
			if (!consumption) return { day, amount: 0, kind: "missing" as const };
			if (consumption.closed)
				return { day, amount: 0, kind: "closed" as const };
			return {
				day,
				amount: consumption.amount,
				kind: consumption.estimated
					? ("estimated" as const)
					: ("real" as const),
			};
		});
}

function expiringLotViews(engine: Engine, supplyId: string) {
	return engine.activeLots(supplyId).flatMap(({ lot, remaining }) =>
		lot.expiresOn
			? [
					{
						id: lot.id,
						purchasedOn: lot.purchasedOn,
						expiresOn: lot.expiresOn,
						remaining,
						daysLeft: daysBetween(engine.today, lot.expiresOn),
					},
				]
			: [],
	);
}

export function toSupplyDetailView(engine: Engine, supply: Supply) {
	const { id } = supply;
	return {
		...toSupplyView(engine, supply),
		recommendation: toRecommendationView(engine, id),
		week: daysFrom(engine.today, DAYS_SHOWN).map((day) => ({
			day,
			amount: engine.forecast(id, day),
		})),
		recent: recentDays(engine, id),
		lots: expiringLotViews(engine, id),
	};
}
