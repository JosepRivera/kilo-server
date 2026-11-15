import { expect, test } from "bun:test";
import {
	addDays,
	businessDay,
	daysBetween,
	isoWeekday,
} from "../../src/domain/day";

test("a close dictated at 1am belongs to the day that is ending", () => {
	expect(businessDay(new Date("2026-11-16T06:00:00Z"))).toBe("2026-11-15");
});

test("the business day rolls over at 6am Lima", () => {
	expect(businessDay(new Date("2026-11-16T10:59:00Z"))).toBe("2026-11-15");
	expect(businessDay(new Date("2026-11-16T11:00:00Z"))).toBe("2026-11-16");
});

test("day arithmetic crosses months and counts Monday as 1", () => {
	expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
	expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
	expect(isoWeekday("2026-11-16")).toBe(1);
	expect(isoWeekday("2026-11-15")).toBe(7);
});
