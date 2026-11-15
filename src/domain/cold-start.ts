import type { Category, Supply } from "./kitchen";

const DAYS_IN_MONTH = 30;

export const COLD_START_DAYS = 28;

export function coldStartEstimate(
	supply: Supply,
	category: Category,
	suppliesInCategory: number,
): number {
	if (supply.referencePrice <= 0 || suppliesInCategory <= 0) return 0;
	return (
		category.monthlySpend /
		suppliesInCategory /
		DAYS_IN_MONTH /
		supply.referencePrice
	);
}
