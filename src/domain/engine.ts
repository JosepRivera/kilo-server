import { addDays, type Day, daysBetween, monthOf, weekday } from "./day";
import { fit, type Model } from "./holt-winters";

export const COLD_START_DAYS = 28;
// z for a 90% service level: accept running short on about 1 in 10 purchases.
const SERVICE_Z = 1.28;
const BUFFER_FLOOR = 0.1;
const BUFFER_CEILING = 0.6;
const ANOMALY_FACTOR = 3;
const ANOMALY_FLOOR_SOLES = 10;
const PRICE_TOLERANCE = 0.4;
const ESTIMATED_DAY_WEIGHT = 0.5;
const EPSILON = 0.001;

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
	/** Informal spoken measures ("medio balde") in this supply's own unit. */
	phrases: Record<string, number>;
};

/** `remaining: null` is a planned closure: a real day with no consumption. */
export type StockRecord = {
	supplyId: string;
	day: Day;
	remaining: number | null;
};

/** `expiresOn: null` never expires (stock that predates any purchase). */
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
	/** Weekdays (1 = Monday … 7 = Sunday) the restaurant never opens. */
	closedWeekdays: number[];
};

export type Consumption = {
	day: Day;
	amount: number;
	estimated: boolean;
	closed: boolean;
};

export type LotState = { lot: Lot; remaining: number };

export type WasteEvent = {
	day: Day;
	supplyId: string;
	quantity: number;
	soles: number;
};

export type Recommendation = {
	supplyId: string;
	toBuy: number;
	onHand: number;
	demand: number;
	buffer: number;
	horizonDays: number;
};

export type ExpiryAlert = { supplyId: string; lot: LotState; daysLeft: number };

/** What a dictated close is compared against; flagged when below `reviewBelow`. */
export type CloseCheck = {
	base: number;
	gapDays: number;
	usual: number;
	reviewBelow: number;
};

export type PriceCheck = { usual: number; low: number; high: number };

export const isCountUnit = (unit: string) => unit !== "kg" && unit !== "litros";

export const unitStep = (unit: string) => (isCountUnit(unit) ? 1 : 0.5);

export const consumedPerDay = (check: CloseCheck, remaining: number) =>
	Math.max(0, check.base - remaining) / check.gapDays;

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = values.toSorted((a, b) => a - b);
	const middle = sorted.length >> 1;
	return sorted.length % 2 === 1
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);
const byDay = (a: { day: Day }, b: { day: Day }) => a.day.localeCompare(b.day);

/**
 * Everything Kilo derives from one restaurant's records as of `today`.
 * Read-only and memoized per supply: build one per request, then discard.
 */
export class Engine {
	private readonly supplies: Map<string, Supply>;
	private readonly categories: Map<string, Category>;
	private readonly stock: Map<string, StockRecord[]>;
	private readonly lots: Map<string, Lot[]>;
	private readonly siblings = new Map<string, number>();
	private readonly cache = new Map<string, unknown>();

	constructor(
		readonly kitchen: Kitchen,
		readonly today: Day,
	) {
		this.supplies = new Map(kitchen.supplies.map((s) => [s.id, s]));
		this.categories = new Map(kitchen.categories.map((c) => [c.id, c]));
		this.stock = Map.groupBy(kitchen.stock.toSorted(byDay), (r) => r.supplyId);
		this.lots = Map.groupBy(
			kitchen.lots.toSorted((a, b) =>
				a.purchasedOn.localeCompare(b.purchasedOn),
			),
			(l) => l.supplyId,
		);
		for (const s of kitchen.supplies) {
			this.siblings.set(
				s.categoryId,
				(this.siblings.get(s.categoryId) ?? 0) + 1,
			);
		}
	}

	private memo<T>(key: string, compute: () => T): T {
		if (!this.cache.has(key)) this.cache.set(key, compute());
		return this.cache.get(key) as T;
	}

	supply(id: string): Supply {
		const supply = this.supplies.get(id);
		if (!supply) throw new Error(`Unknown supply ${id}`);
		return supply;
	}

	private category(id: string): Category {
		const category = this.categories.get(id);
		if (!category) throw new Error(`Unknown category ${id}`);
		return category;
	}

	lotsOf(id: string): Lot[] {
		return this.lots.get(id) ?? [];
	}

	/** Stored records plus the recurring closures nobody had to dictate. */
	records(id: string): StockRecord[] {
		return this.memo(`records:${id}`, () => {
			const stored = this.stock.get(id) ?? [];
			const first = stored[0];
			const { closedWeekdays } = this.kitchen;
			if (!first || closedWeekdays.length === 0) return stored;
			const recorded = new Set(stored.map((r) => r.day));
			const out = [...stored];
			for (let d = first.day; d <= this.today; d = addDays(d, 1)) {
				// A real record always wins over the recurring rule.
				if (!recorded.has(d) && closedWeekdays.includes(weekday(d))) {
					out.push({ supplyId: id, day: d, remaining: null });
				}
			}
			return out.sort(byDay);
		});
	}

	private lastCount(id: string, before = "9999-12-31") {
		const record = this.records(id).findLast(
			(r) => r.remaining !== null && r.day < before,
		);
		return record
			? { day: record.day, remaining: record.remaining ?? 0 }
			: null;
	}

	private purchased(id: string, afterExclusive: Day, untilInclusive: Day) {
		return sum(
			this.lotsOf(id)
				.filter(
					(l) =>
						l.purchasedOn > afterExclusive && l.purchasedOn <= untilInclusive,
				)
				.map((l) => l.quantity),
		);
	}

	/**
	 * Daily consumption between consecutive counts. A forgotten stretch is
	 * spread evenly over its open days and marked estimated; planned closures
	 * stay real zeros.
	 */
	consumption(id: string): Consumption[] {
		return this.memo(`consumption:${id}`, () => {
			const out: Consumption[] = [];
			let previous: { day: Day; remaining: number } | undefined;
			let closures: Day[] = [];
			const flushClosures = () => {
				for (const day of closures) {
					out.push({ day, amount: 0, estimated: false, closed: true });
				}
				closures = [];
			};
			for (const record of this.records(id)) {
				if (record.remaining === null) {
					if (previous) closures.push(record.day);
					continue;
				}
				if (previous) {
					const total = Math.max(
						0,
						previous.remaining +
							this.purchased(id, previous.day, record.day) -
							record.remaining,
					);
					const open: Day[] = [];
					for (
						let d = addDays(previous.day, 1);
						d <= record.day;
						d = addDays(d, 1)
					) {
						if (!closures.includes(d)) open.push(d);
					}
					for (const day of open) {
						out.push({
							day,
							amount: total / open.length,
							estimated: open.length > 1,
							closed: false,
						});
					}
				}
				flushClosures();
				previous = { day: record.day, remaining: record.remaining };
			}
			flushClosures();
			return out.sort(byDay);
		});
	}

	/** Days of history, an estimated day counting half. */
	realDays(id: string): number {
		return Math.floor(
			sum(
				this.consumption(id).map((c) =>
					c.estimated ? ESTIMATED_DAY_WEIGHT : 1,
				),
			),
		);
	}

	isLearning(id: string): boolean {
		return this.realDays(id) < COLD_START_DAYS;
	}

	/** Layer 2: the category's declared spend split evenly across its supplies. */
	coldStartEstimate(id: string): number {
		const supply = this.supply(id);
		if (supply.referencePrice <= 0) return 0;
		const { monthlySpend } = this.category(supply.categoryId);
		const siblings = this.siblings.get(supply.categoryId) ?? 1;
		return monthlySpend / siblings / 30 / supply.referencePrice;
	}

	private window(id: string, days: number): Consumption[] {
		const from = addDays(this.today, -days);
		return this.consumption(id).filter(
			(c) => c.day >= from && c.day < this.today && !c.closed,
		);
	}

	private model(id: string): Model {
		return this.memo(`model:${id}`, () =>
			fit(
				this.consumption(id).filter((c) => c.day < this.today),
				this.coldStartEstimate(id),
			),
		);
	}

	forecast(id: string, day: Day): number {
		return this.model(id).forecast(day);
	}

	recommend(id: string): Recommendation {
		const supply = this.supply(id);
		const horizonDays = this.category(supply.categoryId).purchaseIntervalDays;
		let demand = 0;
		for (let i = 0; i < horizonDays; i++) {
			demand += this.forecast(id, addDays(this.today, i));
		}
		const error = this.model(id).error ?? 0.3 * this.forecast(id, this.today);
		const buffer = Math.min(
			Math.max(
				SERVICE_Z * error * Math.sqrt(horizonDays),
				BUFFER_FLOOR * demand,
			),
			BUFFER_CEILING * demand,
		);
		const onHand = this.currentStock(id);
		const raw = demand + buffer - onHand;
		const step = unitStep(supply.unit);
		return {
			supplyId: id,
			toBuy: raw <= 0 ? 0 : Math.ceil(raw / step) * step,
			onHand,
			demand,
			buffer,
			horizonDays,
		};
	}

	/** A category is due on its purchase day, or when it was never bought. */
	isDue(categoryId: string): boolean {
		let last: Day | undefined;
		for (const supply of this.kitchen.supplies) {
			if (supply.categoryId !== categoryId) continue;
			const latest = this.lotsOf(supply.id).at(-1)?.purchasedOn;
			if (latest && (!last || latest > last)) last = latest;
		}
		if (!last) return true;
		const gap = daysBetween(last, this.today);
		return gap === 0 || gap >= this.category(categoryId).purchaseIntervalDays;
	}

	/** Replays purchases and counts day by day, consuming the oldest lot first. */
	private simulateLots(id: string): { lots: LotState[]; waste: WasteEvent[] } {
		return this.memo(`lots:${id}`, () => {
			const lots = this.lotsOf(id);
			const waste: WasteEvent[] = [];
			const first = lots[0];
			if (!first) return { lots: [], waste };

			const counted = new Map<Day, number>();
			for (const r of this.stock.get(id) ?? []) {
				if (r.remaining !== null) counted.set(r.day, r.remaining);
			}
			const firstCount = counted.keys().next().value;
			let queue: LotState[] = [];
			let next = 0;
			const start =
				firstCount && firstCount < first.purchasedOn
					? firstCount
					: first.purchasedOn;

			for (let d = start; d <= this.today; d = addDays(d, 1)) {
				queue = queue.filter(({ lot, remaining }) => {
					if (lot.expiresOn === null || lot.expiresOn >= d) return true;
					waste.push({
						day: d,
						supplyId: id,
						quantity: remaining,
						soles: (remaining * lot.cost) / lot.quantity,
					});
					return false;
				});
				for (
					let lot = lots[next];
					lot && lot.purchasedOn <= d;
					lot = lots[++next]
				) {
					queue.push({ lot, remaining: lot.quantity });
				}
				const remaining = counted.get(d);
				if (remaining === undefined) continue;

				let used = sum(queue.map((entry) => entry.remaining)) - remaining;
				if (used < -EPSILON) {
					// More on the shelf than any purchase explains: opening stock.
					const quantity = -used;
					queue.unshift({
						lot: {
							id: `opening-${id}-${d}`,
							supplyId: id,
							purchasedOn: d,
							quantity,
							cost: quantity * this.supply(id).referencePrice,
							expiresOn: null,
						},
						remaining: quantity,
					});
				}
				for (const entry of queue) {
					if (used <= 0) break;
					const take = Math.min(used, entry.remaining);
					entry.remaining -= take;
					used -= take;
				}
				queue = queue.filter((entry) => entry.remaining > EPSILON);
			}
			return { lots: queue, waste };
		});
	}

	activeLots(id: string): LotState[] {
		return this.simulateLots(id).lots;
	}

	currentStock(id: string): number {
		if (this.lotsOf(id).length > 0) {
			return sum(this.activeLots(id).map((entry) => entry.remaining));
		}
		return this.lastCount(id)?.remaining ?? 0;
	}

	expectedRemainingTonight(id: string): number {
		return Math.max(0, this.currentStock(id) - this.forecast(id, this.today));
	}

	/** Lots expiring today or tomorrow, most urgent first. */
	expiryAlerts(): ExpiryAlert[] {
		const alerts: ExpiryAlert[] = [];
		for (const { id } of this.kitchen.supplies) {
			for (const lot of this.activeLots(id)) {
				if (lot.lot.expiresOn === null) continue;
				const daysLeft = daysBetween(this.today, lot.lot.expiresOn);
				if (daysLeft <= 1) alerts.push({ supplyId: id, lot, daysLeft });
			}
		}
		return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
	}

	/** Soles lost to expired stock, by "YYYY-MM". */
	monthlyWaste(): Map<string, number> {
		const out = new Map<string, number>();
		for (const { id } of this.kitchen.supplies) {
			for (const event of this.simulateLots(id).waste) {
				const month = monthOf(event.day);
				out.set(month, (out.get(month) ?? 0) + event.soles);
			}
		}
		return out;
	}

	/**
	 * A plain threshold rule, explainable on purpose: review when consumption
	 * exceeds 3× its median and the excess is worth at least S/10.
	 */
	closeCheck(id: string): CloseCheck | null {
		const last = this.lastCount(id, this.today);
		if (!last) return null;
		const closures = this.records(id).filter(
			(r) => r.remaining === null && r.day > last.day && r.day < this.today,
		).length;
		const gapDays = Math.max(1, daysBetween(last.day, this.today) - closures);

		const recent = this.window(id, 28);
		const sameWeekday = recent
			.filter((c) => weekday(c.day) === weekday(this.today))
			.map((c) => c.amount);
		const usual =
			sameWeekday.length >= 4
				? median(sameWeekday)
				: median(this.window(id, 14).map((c) => c.amount));
		if (usual <= 0) return null;

		const price = this.supply(id).referencePrice;
		const threshold = Math.max(
			ANOMALY_FACTOR * usual,
			usual + (price > 0 ? ANOMALY_FLOOR_SOLES / price : 0),
		);
		const base = last.remaining + this.purchased(id, last.day, this.today);
		return { base, gapDays, usual, reviewBelow: base - gapDays * threshold };
	}

	/** Unit prices further than 40% from the median of past lots need review. */
	priceCheck(id: string): PriceCheck | null {
		const lots = this.lotsOf(id);
		if (lots.length === 0) return null;
		const usual = median(lots.map((l) => l.cost / l.quantity));
		return {
			usual,
			low: usual * (1 - PRICE_TOLERANCE),
			high: usual * (1 + PRICE_TOLERANCE),
		};
	}
}
