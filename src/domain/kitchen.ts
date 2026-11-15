import type { Day } from "./day";

export type Category = {
	id: string;
	name: string;
	purchaseIntervalDays: number;
	monthlySpend: number;
};

export type Supply = {
	id: string;
	name: string;
	unit: string;
	categoryId: string;
	shelfLifeDays: number;
	referencePrice: number;
	icon: string | null;
	critical: boolean;
	phrases: Record<string, number>;
};

export type StockRecord = {
	supplyId: string;
	day: Day;
	remaining: number | null;
};

export type StockCount = StockRecord & { remaining: number };

export type Lot = {
	id: string;
	supplyId: string;
	purchasedOn: Day;
	quantity: number;
	cost: number;
	expiresOn: Day | null;
};

export type Kitchen = {
	categories: Category[];
	supplies: Supply[];
	stock: StockRecord[];
	lots: Lot[];
	closedWeekdays: number[];
};

export const isCount = (record: StockRecord): record is StockCount =>
	record.remaining !== null;

export const unitPrice = (lot: Lot) => lot.cost / lot.quantity;
