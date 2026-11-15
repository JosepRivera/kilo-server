import { type Day, daysBetween, isoWeekday } from "./day";
import { rootMeanSquare } from "./statistics";

const LEVEL_SMOOTHING = 0.3;
const TREND_SMOOTHING = 0.05;
const SEASON_SMOOTHING = 0.3;
const TREND_DAMPING = 0.9;
const DAYS_IN_WEEK = 7;
const OBSERVATIONS_BEFORE_SEASON = 7;
const OBSERVATIONS_BEFORE_TREND = 14;
const ERROR_WINDOW = 28;
const MIN_ERRORS = 7;

export type Observation = { day: Day; amount: number; closed: boolean };

export type Model = {
	forecast(day: Day): number;
	typicalError: number | null;
};

type State = {
	level: number;
	trend: number;
	season: number[];
	observed: number;
	lastDay: Day | undefined;
};

const seasonOf = (state: State, day: Day) =>
	state.season[isoWeekday(day) - 1] ?? 0;

function recentreSeason(state: State) {
	const drift = state.season.reduce((total, s) => total + s, 0) / DAYS_IN_WEEK;
	state.season = state.season.map((s) => s - drift);
	state.level += drift;
}

function learn(state: State, { day, amount }: Observation) {
	const seasonal = seasonOf(state, day);
	const previousLevel = state.level;
	state.level =
		LEVEL_SMOOTHING * (amount - seasonal) +
		(1 - LEVEL_SMOOTHING) * (state.level + state.trend);
	state.observed++;
	if (state.observed > OBSERVATIONS_BEFORE_SEASON) {
		state.season[isoWeekday(day) - 1] =
			SEASON_SMOOTHING * (amount - state.level) +
			(1 - SEASON_SMOOTHING) * seasonal;
		recentreSeason(state);
	}
	if (state.observed > OBSERVATIONS_BEFORE_TREND) {
		state.trend =
			TREND_SMOOTHING * (state.level - previousLevel) +
			(1 - TREND_SMOOTHING) * TREND_DAMPING * state.trend;
	}
	state.lastDay = day;
}

const dampedSteps = (steps: number) =>
	(TREND_DAMPING * (1 - TREND_DAMPING ** steps)) / (1 - TREND_DAMPING);

export function fit(observations: Observation[], initialLevel: number): Model {
	const state: State = {
		level: initialLevel,
		trend: 0,
		season: new Array<number>(DAYS_IN_WEEK).fill(0),
		observed: 0,
		lastDay: undefined,
	};
	const errors: number[] = [];

	for (const observation of observations) {
		if (!observation.closed) {
			errors.push(
				observation.amount -
					(state.level + state.trend + seasonOf(state, observation.day)),
			);
		}
		learn(state, observation);
	}

	const recentErrors = errors.slice(-ERROR_WINDOW);
	return {
		typicalError:
			recentErrors.length < MIN_ERRORS ? null : rootMeanSquare(recentErrors),
		forecast(day) {
			const steps = state.lastDay
				? Math.max(1, daysBetween(state.lastDay, day))
				: 1;
			return Math.max(
				0,
				state.level + dampedSteps(steps) * state.trend + seasonOf(state, day),
			);
		},
	};
}
