import { describe, expect, test } from "bun:test";
import { addDays } from "../../src/domain/day";
import { COLD_START_DAYS, consumedPerDay } from "../../src/domain/engine";
import { category, count, engine, lot, supply } from "./support";

// 2026-11-09 is a Monday.
const MON = "2026-11-09";
const day = (offset: number) => addDays(MON, offset);

/** `days` daily counts ending the day before `today`, using `perDay` each day. */
const steadyHistory = (today: string, days: number, perDay: number) => {
	const stock = [];
	const lots = [];
	for (let i = days; i >= 0; i--) {
		const d = addDays(today, -1 - i);
		// Restock to 100 every morning, count what is left every night.
		if (i < days) lots.push(lot(d, perDay, null));
		stock.push(count(d, 100));
	}
	return { stock, lots };
};

describe("consumption", () => {
	test("is yesterday's stock minus today's", () => {
		const e = engine(day(2), { stock: [count(MON, 15), count(day(1), 12)] });
		expect(e.consumption("chicken")).toEqual([
			{ day: day(1), amount: 3, estimated: false, closed: false },
		]);
	});

	test("counts what was bought in between", () => {
		const e = engine(day(2), {
			stock: [count(MON, 10), count(day(1), 9)],
			lots: [lot(day(1), 5, null)],
		});
		expect(e.consumption("chicken")[0]?.amount).toBe(6);
	});

	test("spreads a forgotten stretch evenly and marks it estimated", () => {
		// The docs example: Monday 15 kg, Thursday 6 kg, nothing in between.
		const e = engine(day(4), { stock: [count(MON, 15), count(day(3), 6)] });
		expect(e.consumption("chicken")).toEqual(
			[1, 2, 3].map((i) => ({
				day: day(i),
				amount: 3,
				estimated: true,
				closed: false,
			})),
		);
	});

	test("a planned closure is a real day with zero consumption", () => {
		const e = engine(day(3), {
			stock: [count(MON, 15), count(day(1), null), count(day(2), 11)],
		});
		expect(e.consumption("chicken")).toEqual([
			{ day: day(1), amount: 0, estimated: false, closed: true },
			{ day: day(2), amount: 4, estimated: false, closed: false },
		]);
	});

	test("a recurring closed weekday needs no record, and a real one wins", () => {
		// Closed on Wednesdays (3). Day 2 is a Wednesday.
		const closed = engine(day(4), {
			closedWeekdays: [3],
			stock: [count(MON, 15), count(day(1), 12), count(day(3), 8)],
		});
		expect(
			closed.consumption("chicken").map((c) => [c.amount, c.closed]),
		).toEqual([
			[3, false],
			[0, true],
			[4, false],
		]);

		const opened = engine(day(4), {
			closedWeekdays: [3],
			stock: [
				count(MON, 15),
				count(day(1), 12),
				count(day(2), 10),
				count(day(3), 8),
			],
		});
		expect(opened.consumption("chicken").map((c) => c.amount)).toEqual([
			3, 2, 2,
		]);
	});

	test("a forgotten stretch skips the closed day when spreading", () => {
		const e = engine(day(4), {
			closedWeekdays: [3],
			stock: [count(MON, 15), count(day(3), 6)],
		});
		expect(
			e.consumption("chicken").map((c) => [c.amount, c.estimated, c.closed]),
		).toEqual([
			[4.5, true, false],
			[0, false, true],
			[4.5, true, false],
		]);
	});

	test("an estimated day counts half towards the 28 days of cold start", () => {
		const e = engine(day(6), {
			stock: [count(MON, 15), count(day(1), 12), count(day(4), 6)],
		});
		// 1 real day + 3 estimated days = 2.5, floored.
		expect(e.realDays("chicken")).toBe(2);
		expect(e.isLearning("chicken")).toBe(true);
	});
});

describe("forecast", () => {
	test("starts from the category spend split evenly across its supplies", () => {
		const e = engine(MON, {
			supplies: [
				supply(),
				supply({ id: "beef", name: "Carne de res" }),
				supply({ id: "fish", name: "Pescado" }),
			],
		});
		// S/3000 ÷ 3 supplies ÷ 30 days ÷ S/10 per kg.
		expect(e.coldStartEstimate("chicken")).toBeCloseTo(3.33, 2);
		expect(e.forecast("chicken", MON)).toBeCloseTo(3.33, 2);
	});

	test("follows real consumption once the cold start is over", () => {
		const today = day(40);
		const e = engine(today, steadyHistory(today, COLD_START_DAYS + 7, 4));
		expect(e.isLearning("chicken")).toBe(false);
		expect(e.forecast("chicken", today)).toBeCloseTo(4, 0);
	});
});

describe("recommendation", () => {
	test("is demand plus buffer minus stock, rounded up to half a kilo", () => {
		const today = day(40);
		const e = engine(today, steadyHistory(today, 35, 4));
		const r = e.recommend("chicken");
		expect(r.horizonDays).toBe(3);
		expect(r.demand).toBeCloseTo(12, 0);
		expect(r.buffer).toBeGreaterThanOrEqual(0.1 * r.demand);
		expect(r.buffer).toBeLessThanOrEqual(0.6 * r.demand);
		expect(r.onHand).toBe(100);
		expect(r.toBuy).toBe(0);
	});

	test("asks for the shortfall when stock does not cover the horizon", () => {
		const e = engine(day(2), { stock: [count(MON, 12), count(day(1), 2)] });
		const r = e.recommend("chicken");
		expect(r.toBuy).toBeGreaterThan(0);
		expect(r.toBuy % 0.5).toBe(0);
		expect(r.toBuy).toBeGreaterThanOrEqual(r.demand + r.buffer - r.onHand);
	});

	test("whole units are rounded up to whole units", () => {
		const e = engine(MON, {
			supplies: [supply({ unit: "unidades", referencePrice: 0.6 })],
			categories: [category({ monthlySpend: 100 })],
		});
		expect(Number.isInteger(e.recommend("chicken").toBuy)).toBe(true);
	});

	test("a category is due on its purchase day or after its interval", () => {
		const bought = (daysAgo: number) =>
			engine(day(10), { lots: [lot(day(10 - daysAgo), 5, null)] });
		expect(engine(day(10)).isDue("protein")).toBe(true);
		expect(bought(0).isDue("protein")).toBe(true);
		expect(bought(1).isDue("protein")).toBe(false);
		expect(bought(3).isDue("protein")).toBe(true);
	});
});

describe("lots", () => {
	test("the oldest lot is consumed first", () => {
		const e = engine(day(1), {
			lots: [lot(MON, 10, day(3)), lot(day(1), 10, day(4))],
			stock: [count(day(1), 14)],
		});
		expect(e.activeLots("chicken").map((l) => l.remaining)).toEqual([4, 10]);
		expect(e.currentStock("chicken")).toBe(14);
	});

	test("alerts name the lot that expires today or tomorrow", () => {
		const e = engine(day(2), {
			lots: [lot(MON, 10, day(3)), lot(day(2), 10, day(5))],
			stock: [count(day(1), 6)],
		});
		const alerts = e.expiryAlerts();
		expect(alerts).toHaveLength(1);
		expect(alerts[0]?.lot.lot.purchasedOn).toBe(MON);
		expect(alerts[0]?.daysLeft).toBe(1);
	});

	test("what is left of an expired lot is waste at its purchase cost", () => {
		const e = engine(day(5), {
			lots: [lot(MON, 10, day(3))],
			stock: [count(day(1), 4)],
		});
		expect(e.currentStock("chicken")).toBe(0);
		expect(e.waste()).toEqual([
			{ day: day(4), supplyId: "chicken", quantity: 4, soles: 40 },
		]);
	});

	test("stock no purchase explains becomes an opening lot that never expires", () => {
		const e = engine(day(30), {
			lots: [lot(day(1), 5, day(4))],
			stock: [count(MON, 8), count(day(1), 13), count(day(2), 6)],
		});
		// 8 kg were there before any purchase; FIFO uses them before the lot.
		expect(e.activeLots("chicken")).toHaveLength(1);
		const [opening] = e.activeLots("chicken");
		expect(opening?.lot.expiresOn).toBeNull();
		expect(opening?.remaining).toBe(1);
		// The purchased lot expired untouched; the opening stock never does.
		expect(e.waste().map((w) => w.soles)).toEqual([50]);
	});
});

describe("review flags", () => {
	const fortnight = (today: string, perDay: number, price = 10) => ({
		...steadyHistory(today, 14, perDay),
		supplies: [supply({ referencePrice: price })],
	});

	test("flags a close that implies more than 3× the usual consumption", () => {
		// The docs example: usual 4 kg, threshold 12 kg, a 13 kg day is flagged.
		const today = day(20);
		const check = engine(today, fortnight(today, 4)).closeCheck("chicken");
		expect(check?.usual).toBe(4);
		expect(check?.base).toBe(100);
		expect(check?.reviewBelow).toBe(88);
		if (!check) throw new Error("expected a check");
		expect(consumedPerDay(check, 87)).toBe(13);
	});

	test("does not flag excess worth less than S/10", () => {
		const today = day(20);
		// Usual 1 kg at S/2: 3× is only S/4 over, so the floor of S/10 rules.
		const check = engine(today, fortnight(today, 1, 2)).closeCheck("chicken");
		expect(check?.reviewBelow).toBe(100 - (1 + 10 / 2));
	});

	test("has nothing to compare against without history", () => {
		expect(engine(MON).closeCheck("chicken")).toBeNull();
		expect(engine(MON).priceCheck("chicken")).toBeNull();
	});

	test("a unit price is reviewed beyond 40% of the median of past lots", () => {
		const e = engine(day(5), {
			lots: [lot(MON, 10, null), lot(day(1), 10, null), lot(day(2), 5, null)],
		});
		const check = e.priceCheck("chicken");
		expect(check?.usual).toBe(10);
		expect(check?.low).toBeCloseTo(6);
		expect(check?.high).toBeCloseTo(14);
	});
});
