import { expect, test } from "bun:test";
import { addDays, weekday } from "../../src/domain/day";
import { fit, type Observation } from "../../src/domain/holt-winters";

const START = "2026-09-07"; // a Monday

const series = (days: number, amount: (day: string) => number): Observation[] =>
	Array.from({ length: days }, (_, i) => {
		const day = addDays(START, i);
		return { day, amount: amount(day), closed: false };
	});

test("with no history the forecast is the cold-start estimate", () => {
	const model = fit([], 3.3);
	expect(model.forecast(START)).toBe(3.3);
	expect(model.error).toBeNull();
});

test("28 real days leave almost nothing of a wrong initial estimate", () => {
	const model = fit(
		series(28, () => 4),
		40,
	);
	expect(model.forecast(addDays(START, 28))).toBeCloseTo(4, 0);
});

test("learns that Fridays sell more than Tuesdays", () => {
	const model = fit(
		series(56, (day) => (weekday(day) === 5 ? 9 : 3)),
		4,
	);
	const friday = model.forecast(addDays(START, 56 + 4));
	const tuesday = model.forecast(addDays(START, 56 + 1));
	expect(friday).toBeGreaterThan(tuesday * 2);
});

test("reports a typical miss only once there is a week of history", () => {
	expect(
		fit(
			series(6, () => 4),
			4,
		).error,
	).toBeNull();
	expect(
		fit(
			series(7, () => 4),
			4,
		).error,
	).toBeCloseTo(0, 5);
});

test("never forecasts negative consumption", () => {
	const falling = series(20, (day) =>
		Math.max(0, 10 - 2 * Number(day.slice(8))),
	);
	expect(fit(falling, 10).forecast(addDays(START, 40))).toBeGreaterThanOrEqual(
		0,
	);
});
