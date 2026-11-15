import { addDays, type Day, isoWeekday } from "../src/domain/day";
import { roundToStep, roundUpToStep } from "../src/domain/units";

const WEEKDAY_FACTORS = [0.8, 0.85, 0.95, 1, 1.35, 1.5, 0.55];
const NOISE = 0.15;
const PURCHASE_MARGIN = 1.4;

export type DemoSupply = {
	name: string;
	dailyUse: number;
	unit: string;
	shelfLifeDays: number;
	referencePrice: number;
	purchaseIntervalDays: number;
};

export type DemoCount = { day: Day; remaining: number };

export type DemoLot = {
	purchasedOn: Day;
	quantity: number;
	cost: number;
	expiresOn: Day;
};

export type DemoHistory = { counts: DemoCount[]; lots: DemoLot[] };

export function seededRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const usageOn = (supply: DemoSupply, day: Day, random: () => number) =>
	supply.dailyUse *
	(WEEKDAY_FACTORS[isoWeekday(day) - 1] ?? 1) *
	(1 + (random() * 2 - 1) * NOISE);

export function simulateHistory(
	supply: DemoSupply,
	today: Day,
	days: number,
	random: () => number,
): DemoHistory {
	const counts: DemoCount[] = [];
	const lots: DemoLot[] = [];
	let stock = 0;

	for (let offset = -days; offset < 0; offset++) {
		const day = addDays(today, offset);
		if ((offset + days) % supply.purchaseIntervalDays === 0) {
			const needed =
				supply.dailyUse * supply.purchaseIntervalDays * PURCHASE_MARGIN;
			const quantity = roundUpToStep(
				Math.max(needed - stock, supply.dailyUse),
				supply.unit,
			);
			lots.push({
				purchasedOn: day,
				quantity,
				cost: Math.round(quantity * supply.referencePrice * 100) / 100,
				expiresOn: addDays(day, supply.shelfLifeDays),
			});
			stock += quantity;
		}
		stock = roundToStep(
			Math.max(0, stock - usageOn(supply, day, random)),
			supply.unit,
		);
		counts.push({ day, remaining: stock });
	}
	return { counts, lots };
}
