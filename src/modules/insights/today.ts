import type { Engine } from "../../domain/engine";
import { sum } from "../../domain/statistics";
import { toRecommendationView, toSupplyView } from "../supplies/presenter";

function expiryAlerts(engine: Engine) {
	return [...Map.groupBy(engine.expiryAlerts(), (alert) => alert.supplyId)]
		.map(([supplyId, alerts]) => ({
			supply: toSupplyView(engine, engine.ledger.supply(supplyId)),
			daysLeft: Math.min(...alerts.map((alert) => alert.daysLeft)),
			remaining: sum(alerts.map((alert) => alert.lot.remaining)),
			lots: alerts.map((alert) => ({
				purchasedOn: alert.lot.lot.purchasedOn,
				remaining: alert.lot.remaining,
				daysLeft: alert.daysLeft,
			})),
		}))
		.sort(
			(a, b) =>
				a.daysLeft - b.daysLeft ||
				a.supply.name.localeCompare(b.supply.name, "es"),
		);
}

function recommendations(engine: Engine) {
	const dueCategories = new Set(
		engine.ledger.categories
			.filter((category) => engine.isDue(category.id))
			.map((category) => category.id),
	);
	return engine.supplies
		.filter((supply) => dueCategories.has(supply.categoryId))
		.map((supply) => ({
			supply: toSupplyView(engine, supply),
			recommendation: toRecommendationView(engine, supply.id),
			bought: engine.wasBoughtToday(supply.id),
		}));
}

export function buildToday(engine: Engine) {
	const recommended = recommendations(engine);
	return {
		day: engine.today,
		alerts: expiryAlerts(engine),
		toBuy: recommended.filter((line) => line.recommendation.toBuy > 0),
		covered: recommended
			.filter((line) => line.recommendation.toBuy <= 0)
			.map((line) => line.supply),
	};
}
