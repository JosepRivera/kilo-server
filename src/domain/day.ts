/** A business day in Lima, as "YYYY-MM-DD". Compares correctly as a string. */
export type Day = string;

const MS_PER_DAY = 86_400_000;
const toMs = (day: Day) => Date.parse(`${day}T00:00:00Z`);
const fromMs = (ms: number): Day => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: Day, days: number): Day =>
	fromMs(toMs(day) + days * MS_PER_DAY);

export const daysBetween = (from: Day, to: Day) =>
	Math.round((toMs(to) - toMs(from)) / MS_PER_DAY);

/** 1 = Monday … 7 = Sunday. */
export const weekday = (day: Day) => new Date(toMs(day)).getUTCDay() || 7;

export const monthOf = (day: Day) => day.slice(0, 7);

// Lima is UTC-5 all year and the business day rolls over at 06:00, so a
// close dictated at 1am still belongs to the day that is ending.
export const businessDay = (now: Date): Day =>
	fromMs(now.getTime() - 11 * 3_600_000);
