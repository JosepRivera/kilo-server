const CONTINUOUS_UNITS = new Set(["kg", "litros"]);
const CONTINUOUS_STEP = 0.5;
const COUNT_STEP = 1;

export const unitStep = (unit: string) =>
	CONTINUOUS_UNITS.has(unit) ? CONTINUOUS_STEP : COUNT_STEP;

export const roundUpToStep = (value: number, unit: string) =>
	Math.ceil(value / unitStep(unit)) * unitStep(unit);

export const roundToStep = (value: number, unit: string) =>
	Math.round(value / unitStep(unit)) * unitStep(unit);
