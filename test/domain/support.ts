import type { Day } from "../../src/domain/day";
import { Engine } from "../../src/domain/engine";
import type {
	Category,
	Kitchen,
	Lot,
	StockRecord,
	Supply,
} from "../../src/domain/kitchen";

export const category = (over: Partial<Category> = {}): Category => ({
	id: "protein",
	name: "Proteínas",
	purchaseIntervalDays: 3,
	monthlySpend: 3000,
	...over,
});

export const supply = (over: Partial<Supply> = {}): Supply => ({
	id: "chicken",
	name: "Pollo entero",
	unit: "kg",
	categoryId: "protein",
	shelfLifeDays: 3,
	referencePrice: 10,
	icon: null,
	critical: true,
	phrases: {},
	...over,
});

export const count = (
	day: Day,
	remaining: number | null,
	supplyId = "chicken",
): StockRecord => ({ supplyId, day, remaining });

let lotSeq = 0;
export const lot = (
	purchasedOn: Day,
	quantity: number,
	expiresOn: Day | null,
	over: Partial<Lot> = {},
): Lot => ({
	id: `lot-${++lotSeq}`,
	supplyId: "chicken",
	purchasedOn,
	quantity,
	cost: quantity * 10,
	expiresOn,
	...over,
});

export const engine = (today: Day, over: Partial<Kitchen> = {}) =>
	new Engine(
		{
			categories: [category()],
			supplies: [supply()],
			stock: [],
			lots: [],
			closedWeekdays: [],
			...over,
		},
		today,
	);
