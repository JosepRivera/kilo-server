import type { Consumption } from "./consumption";
import { type Day, isoWeekday } from "./day";
import { type Lot, unitPrice } from "./kitchen";
import { median } from "./statistics";

const ANOMALY_FACTOR = 3;
const ANOMALY_FLOOR_SOLES = 10;
const PRICE_TOLERANCE = 0.4;
const SAME_WEEKDAY_SAMPLES = 4;
const SAME_WEEKDAY_WINDOW_DAYS = 28;
const GENERAL_WINDOW_DAYS = 14;

export type CloseCheck = {
	base: number;
	gapDays: number;
	usual: number;
	reviewBelow: number;
};

export type PriceCheck = { usual: number; low: number; high: number };

type CloseCheckInput = {
	today: Day;
	base: number;
	gapDays: number;
	referencePrice: number;
	recentConsumption: (days: number) => Consumption[];
};

export const consumedPerDay = (check: CloseCheck, remaining: number) =>
	Math.max(0, check.base - remaining) / check.gapDays;

function usualConsumption(
	today: Day,
	recentConsumption: (days: number) => Consumption[],
): number {
	const sameWeekday = recentConsumption(SAME_WEEKDAY_WINDOW_DAYS)
		.filter((c) => isoWeekday(c.day) === isoWeekday(today))
		.map((c) => c.amount);
	return sameWeekday.length >= SAME_WEEKDAY_SAMPLES
		? median(sameWeekday)
		: median(recentConsumption(GENERAL_WINDOW_DAYS).map((c) => c.amount));
}

export function closeCheck({
	today,
	base,
	gapDays,
	referencePrice,
	recentConsumption,
}: CloseCheckInput): CloseCheck | null {
	const usual = usualConsumption(today, recentConsumption);
	if (usual <= 0) return null;
	const floorQuantity =
		referencePrice > 0 ? ANOMALY_FLOOR_SOLES / referencePrice : 0;
	const threshold = Math.max(ANOMALY_FACTOR * usual, usual + floorQuantity);
	return { base, gapDays, usual, reviewBelow: base - gapDays * threshold };
}

export function priceCheck(lots: Lot[]): PriceCheck | null {
	if (lots.length === 0) return null;
	const usual = median(lots.map(unitPrice));
	return {
		usual,
		low: usual * (1 - PRICE_TOLERANCE),
		high: usual * (1 + PRICE_TOLERANCE),
	};
}
