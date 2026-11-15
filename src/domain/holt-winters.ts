import { type Day, daysBetween, weekday } from "./day";

// Starting smoothing parameters, to be tuned with pilot data.
const ALPHA = 0.3;
const BETA = 0.05;
const GAMMA = 0.3;
// Damping keeps a noisy trend from running away over a two-week horizon.
const PHI = 0.9;
const SEASON_WARMUP = 7;
const TREND_WARMUP = 14;
const ERROR_WINDOW = 28;
const MIN_ERRORS = 7;

export type Observation = { day: Day; amount: number; closed: boolean };

export type Model = {
	/** Expected consumption on `day`, never negative. */
	forecast(day: Day): number;
	/** Typical one-day miss (RMSE), or null while there is too little history. */
	error: number | null;
};

/**
 * Additive Holt-Winters with a weekly season. The cold-start estimate is only
 * the initial level: every real day pulls the model away from it.
 */
export function fit(observations: Observation[], initialLevel: number): Model {
	let level = initialLevel;
	let trend = 0;
	const season = new Array<number>(8).fill(0);
	const errors: number[] = [];
	let lastDay: Day | undefined;
	let seen = 0;

	for (const { day, amount, closed } of observations) {
		const wd = weekday(day);
		const seasonal = season[wd] ?? 0;
		if (!closed) errors.push(amount - (level + trend + seasonal));
		const previous = level;
		level = ALPHA * (amount - seasonal) + (1 - ALPHA) * (level + trend);
		// Warm up in stages: the first week only settles the level, the second
		// adds the weekday pattern, and the trend waits for both. Learning all
		// three at once lets a wrong cold-start level leak into the others.
		seen++;
		if (seen > SEASON_WARMUP) {
			season[wd] = GAMMA * (amount - level) + (1 - GAMMA) * seasonal;
			// Keep the season centred on zero so it cannot absorb level error.
			const drift = season.reduce((sum, s) => sum + s, 0) / 7;
			for (let i = 1; i <= 7; i++) season[i] = (season[i] ?? 0) - drift;
			level += drift;
		}
		if (seen > TREND_WARMUP) {
			trend = BETA * (level - previous) + (1 - BETA) * PHI * trend;
		}
		lastDay = day;
	}

	const recent = errors.slice(-ERROR_WINDOW);
	const error =
		recent.length < MIN_ERRORS
			? null
			: Math.sqrt(recent.reduce((sum, e) => sum + e * e, 0) / recent.length);

	return {
		error,
		forecast(day) {
			const steps = lastDay ? Math.max(1, daysBetween(lastDay, day)) : 1;
			const damped = (PHI * (1 - PHI ** steps)) / (1 - PHI);
			return Math.max(0, level + damped * trend + (season[weekday(day)] ?? 0));
		},
	};
}
