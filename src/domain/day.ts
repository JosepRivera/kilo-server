export type Day = string;

const MS_PER_DAY = 86_400_000;
const LIMA_OFFSET_HOURS = 5;
const BUSINESS_DAY_STARTS_AT_HOUR = 6;
const MS_PER_HOUR = 3_600_000;

const toMs = (day: Day) => Date.parse(`${day}T00:00:00Z`);
const fromMs = (ms: number): Day => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: Day, days: number): Day =>
	fromMs(toMs(day) + days * MS_PER_DAY);

export const daysBetween = (from: Day, to: Day) =>
	Math.round((toMs(to) - toMs(from)) / MS_PER_DAY);

export const isoWeekday = (day: Day) => new Date(toMs(day)).getUTCDay() || 7;

export const monthOf = (day: Day) => day.slice(0, 7);

export const businessDay = (now: Date): Day =>
	fromMs(
		now.getTime() -
			(LIMA_OFFSET_HOURS + BUSINESS_DAY_STARTS_AT_HOUR) * MS_PER_HOUR,
	);

export const daysFrom = (start: Day, count: number): Day[] =>
	Array.from({ length: count }, (_, i) => addDays(start, i));

export const daysAfterUntil = (
	afterExclusive: Day,
	untilInclusive: Day,
): Day[] =>
	daysFrom(
		addDays(afterExclusive, 1),
		Math.max(0, daysBetween(afterExclusive, untilInclusive)),
	);

export const lastMonths = (month: string, count: number): string[] => {
	const [year = 0, monthNumber = 1] = month.split("-").map(Number);
	return Array.from({ length: count }, (_, i) =>
		new Date(Date.UTC(year, monthNumber - count + i, 1))
			.toISOString()
			.slice(0, 7),
	);
};
