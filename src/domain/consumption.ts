import { type Day, daysAfterUntil } from "./day";
import { isCount, type StockCount, type StockRecord } from "./kitchen";
import { sum } from "./statistics";

const ESTIMATED_DAY_WEIGHT = 0.5;

export type Consumption = {
	day: Day;
	amount: number;
	estimated: boolean;
	closed: boolean;
};

type PurchasedBetween = (afterExclusive: Day, untilInclusive: Day) => number;

const closure = (day: Day): Consumption => ({
	day,
	amount: 0,
	estimated: false,
	closed: true,
});

function spreadBetweenCounts(
	previous: StockCount,
	current: StockCount,
	closedDays: Day[],
	purchasedBetween: PurchasedBetween,
): Consumption[] {
	const consumed = Math.max(
		0,
		previous.remaining +
			purchasedBetween(previous.day, current.day) -
			current.remaining,
	);
	const openDays = daysAfterUntil(previous.day, current.day).filter(
		(day) => !closedDays.includes(day),
	);
	return openDays.map((day) => ({
		day,
		amount: consumed / openDays.length,
		estimated: openDays.length > 1,
		closed: false,
	}));
}

export function deriveConsumption(
	records: StockRecord[],
	purchasedBetween: PurchasedBetween,
): Consumption[] {
	const consumption: Consumption[] = [];
	let previous: StockCount | undefined;
	let closedDays: Day[] = [];

	for (const record of records) {
		if (!isCount(record)) {
			if (previous) closedDays.push(record.day);
			continue;
		}
		if (previous) {
			consumption.push(
				...spreadBetweenCounts(previous, record, closedDays, purchasedBetween),
			);
		}
		consumption.push(...closedDays.map(closure));
		closedDays = [];
		previous = record;
	}
	consumption.push(...closedDays.map(closure));
	return consumption.sort((a, b) => a.day.localeCompare(b.day));
}

export const countRealDays = (consumption: Consumption[]) =>
	Math.floor(
		sum(consumption.map((c) => (c.estimated ? ESTIMATED_DAY_WEIGHT : 1))),
	);
