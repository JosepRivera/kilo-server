export const sum = (values: number[]) =>
	values.reduce((total, value) => total + value, 0);

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = values.toSorted((a, b) => a - b);
	const middle = sorted.length >> 1;
	return sorted.length % 2 === 1
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export const rootMeanSquare = (values: number[]) =>
	Math.sqrt(sum(values.map((value) => value * value)) / values.length);
