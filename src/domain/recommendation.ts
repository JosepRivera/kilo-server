import { type Day, daysBetween, daysFrom } from "./day";
import type { Model } from "./holt-winters";
import { sum } from "./statistics";
import { roundUpToStep } from "./units";

const SERVICE_LEVEL_Z = 1.28;
const BUFFER_FLOOR = 0.1;
const BUFFER_CEILING = 0.6;
const ERROR_SHARE_WITHOUT_HISTORY = 0.3;

export type Recommendation = {
	supplyId: string;
	toBuy: number;
	onHand: number;
	demand: number;
	buffer: number;
	horizonDays: number;
	typicalError: number;
};

type RecommendInput = {
	supplyId: string;
	unit: string;
	horizonDays: number;
	today: Day;
	model: Model;
	onHand: number;
};

export function recommend({
	supplyId,
	unit,
	horizonDays,
	today,
	model,
	onHand,
}: RecommendInput): Recommendation {
	const demand = sum(daysFrom(today, horizonDays).map(model.forecast));
	const typicalError =
		model.typicalError ?? ERROR_SHARE_WITHOUT_HISTORY * model.forecast(today);
	const buffer = Math.min(
		Math.max(
			SERVICE_LEVEL_Z * typicalError * Math.sqrt(horizonDays),
			BUFFER_FLOOR * demand,
		),
		BUFFER_CEILING * demand,
	);
	const shortfall = demand + buffer - onHand;
	return {
		supplyId,
		toBuy: shortfall <= 0 ? 0 : roundUpToStep(shortfall, unit),
		onHand,
		demand,
		buffer,
		horizonDays,
		typicalError,
	};
}

export function isPurchaseDue(
	lastPurchase: Day | undefined,
	today: Day,
	intervalDays: number,
): boolean {
	if (!lastPurchase) return true;
	const daysSince = daysBetween(lastPurchase, today);
	return daysSince === 0 || daysSince >= intervalDays;
}
