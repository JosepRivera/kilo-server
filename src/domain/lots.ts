import { addDays, type Day } from "./day";
import { type Lot, type StockCount, unitPrice } from "./kitchen";
import { sum } from "./statistics";

const EPSILON = 0.001;

export type LotState = { lot: Lot; remaining: number };

export type WasteEvent = {
	day: Day;
	supplyId: string;
	quantity: number;
	soles: number;
};

export type LotReplay = { active: LotState[]; waste: WasteEvent[] };

type ReplayInput = {
	supplyId: string;
	lots: Lot[];
	counts: StockCount[];
	referencePrice: number;
	today: Day;
};

const isExpired = (lot: Lot, day: Day) =>
	lot.expiresOn !== null && lot.expiresOn < day;

const openingLot = (
	supplyId: string,
	day: Day,
	quantity: number,
	referencePrice: number,
): LotState => ({
	lot: {
		id: `opening-${supplyId}-${day}`,
		supplyId,
		purchasedOn: day,
		quantity,
		cost: quantity * referencePrice,
		expiresOn: null,
	},
	remaining: quantity,
});

function consumeOldestFirst(queue: LotState[], quantity: number) {
	let pending = quantity;
	for (const entry of queue) {
		if (pending <= 0) break;
		const taken = Math.min(pending, entry.remaining);
		entry.remaining -= taken;
		pending -= taken;
	}
}

export function replayLots({
	supplyId,
	lots,
	counts,
	referencePrice,
	today,
}: ReplayInput): LotReplay {
	const firstLot = lots[0];
	if (!firstLot) return { active: [], waste: [] };

	const countByDay = new Map(
		counts.map((count) => [count.day, count.remaining]),
	);
	const firstCountDay = counts[0]?.day;
	const start =
		firstCountDay && firstCountDay < firstLot.purchasedOn
			? firstCountDay
			: firstLot.purchasedOn;

	const waste: WasteEvent[] = [];
	let queue: LotState[] = [];
	let nextLot = 0;

	for (let day = start; day <= today; day = addDays(day, 1)) {
		for (const { lot, remaining } of queue.filter((e) =>
			isExpired(e.lot, day),
		)) {
			waste.push({
				day,
				supplyId,
				quantity: remaining,
				soles: remaining * unitPrice(lot),
			});
		}
		queue = queue.filter((entry) => !isExpired(entry.lot, day));

		for (
			let lot = lots[nextLot];
			lot && lot.purchasedOn <= day;
			lot = lots[++nextLot]
		) {
			queue.push({ lot, remaining: lot.quantity });
		}

		const counted = countByDay.get(day);
		if (counted === undefined) continue;

		const used = sum(queue.map((entry) => entry.remaining)) - counted;
		if (used < -EPSILON) {
			queue.unshift(openingLot(supplyId, day, -used, referencePrice));
		}
		consumeOldestFirst(queue, used);
		queue = queue.filter((entry) => entry.remaining > EPSILON);
	}
	return { active: queue, waste };
}
