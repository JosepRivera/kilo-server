import { addDays, type Day, isoWeekday } from "./day";
import {
	type Category,
	isCount,
	type Kitchen,
	type Lot,
	type StockCount,
	type StockRecord,
	type Supply,
} from "./kitchen";
import { sum } from "./statistics";

const byDay = (a: { day: Day }, b: { day: Day }) => a.day.localeCompare(b.day);
const byPurchase = (a: Lot, b: Lot) =>
	a.purchasedOn.localeCompare(b.purchasedOn);

export class Ledger {
	readonly supplies: Supply[];
	readonly categories: Category[];
	private readonly suppliesById: Map<string, Supply>;
	private readonly categoriesById: Map<string, Category>;
	private readonly storedBySupply: Map<string, StockRecord[]>;
	private readonly lotsBySupply: Map<string, Lot[]>;
	private readonly recordsBySupply = new Map<string, StockRecord[]>();

	constructor(
		private readonly kitchen: Kitchen,
		readonly today: Day,
	) {
		this.supplies = kitchen.supplies;
		this.categories = kitchen.categories;
		this.suppliesById = new Map(kitchen.supplies.map((s) => [s.id, s]));
		this.categoriesById = new Map(kitchen.categories.map((c) => [c.id, c]));
		this.storedBySupply = Map.groupBy(
			kitchen.stock.toSorted(byDay),
			(record) => record.supplyId,
		);
		this.lotsBySupply = Map.groupBy(
			kitchen.lots.toSorted(byPurchase),
			(lot) => lot.supplyId,
		);
	}

	supply(id: string): Supply {
		const supply = this.suppliesById.get(id);
		if (!supply) throw new Error(`Unknown supply ${id}`);
		return supply;
	}

	categoryOf(supply: Supply): Category {
		const category = this.categoriesById.get(supply.categoryId);
		if (!category) throw new Error(`Unknown category ${supply.categoryId}`);
		return category;
	}

	suppliesIn(categoryId: string): Supply[] {
		return this.supplies.filter((s) => s.categoryId === categoryId);
	}

	lotsOf(supplyId: string): Lot[] {
		return this.lotsBySupply.get(supplyId) ?? [];
	}

	countsOf(supplyId: string): StockCount[] {
		return (this.storedBySupply.get(supplyId) ?? []).filter(isCount);
	}

	recordsOf(supplyId: string): StockRecord[] {
		const cached = this.recordsBySupply.get(supplyId);
		if (cached) return cached;
		const records = this.withRecurringClosures(
			supplyId,
			this.storedBySupply.get(supplyId) ?? [],
		);
		this.recordsBySupply.set(supplyId, records);
		return records;
	}

	lastCountBefore(supplyId: string, day: Day): StockCount | undefined {
		return this.countsOf(supplyId).findLast((count) => count.day < day);
	}

	lastCount(supplyId: string): StockCount | undefined {
		return this.countsOf(supplyId).at(-1);
	}

	purchasedBetween(supplyId: string, afterExclusive: Day, untilInclusive: Day) {
		return sum(
			this.lotsOf(supplyId)
				.filter(
					(lot) =>
						lot.purchasedOn > afterExclusive &&
						lot.purchasedOn <= untilInclusive,
				)
				.map((lot) => lot.quantity),
		);
	}

	lastPurchaseIn(categoryId: string): Day | undefined {
		return this.suppliesIn(categoryId)
			.flatMap((supply) => this.lotsOf(supply.id).at(-1)?.purchasedOn ?? [])
			.toSorted()
			.at(-1);
	}

	private withRecurringClosures(
		supplyId: string,
		stored: StockRecord[],
	): StockRecord[] {
		const first = stored[0];
		const { closedWeekdays } = this.kitchen;
		if (!first || closedWeekdays.length === 0) return stored;
		const recorded = new Set(stored.map((record) => record.day));
		const closures: StockRecord[] = [];
		for (let day = first.day; day <= this.today; day = addDays(day, 1)) {
			if (!recorded.has(day) && closedWeekdays.includes(isoWeekday(day))) {
				closures.push({ supplyId, day, remaining: null });
			}
		}
		return [...stored, ...closures].sort(byDay);
	}
}
