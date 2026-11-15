import { COLD_START_DAYS, coldStartEstimate } from "./cold-start";
import {
	type Consumption,
	countRealDays,
	deriveConsumption,
} from "./consumption";
import { addDays, type Day, daysBetween } from "./day";
import { fit, type Model } from "./holt-winters";
import type { Kitchen, Supply } from "./kitchen";
import { Ledger } from "./ledger";
import {
	type LotReplay,
	type LotState,
	replayLots,
	type WasteEvent,
} from "./lots";
import {
	isPurchaseDue,
	type Recommendation,
	recommend,
} from "./recommendation";
import {
	type CloseCheck,
	closeCheck,
	type PriceCheck,
	priceCheck,
} from "./review";
import { sum } from "./statistics";

const EXPIRY_ALERT_DAYS = 1;

export type ExpiryAlert = { supplyId: string; lot: LotState; daysLeft: number };

export class Engine {
	readonly ledger: Ledger;
	readonly today: Day;
	private readonly consumptionBySupply = new Map<string, Consumption[]>();
	private readonly modelBySupply = new Map<string, Model>();
	private readonly replayBySupply = new Map<string, LotReplay>();

	constructor(kitchen: Kitchen, today: Day) {
		this.ledger = new Ledger(kitchen, today);
		this.today = today;
	}

	get supplies(): Supply[] {
		return this.ledger.supplies;
	}

	consumption(supplyId: string): Consumption[] {
		return this.cached(this.consumptionBySupply, supplyId, () =>
			deriveConsumption(this.ledger.recordsOf(supplyId), (after, until) =>
				this.ledger.purchasedBetween(supplyId, after, until),
			),
		);
	}

	realDays(supplyId: string): number {
		return countRealDays(this.consumption(supplyId));
	}

	isLearning(supplyId: string): boolean {
		return this.realDays(supplyId) < COLD_START_DAYS;
	}

	forecast(supplyId: string, day: Day): number {
		return this.model(supplyId).forecast(day);
	}

	recommend(supplyId: string): Recommendation {
		const supply = this.ledger.supply(supplyId);
		return recommend({
			supplyId,
			unit: supply.unit,
			horizonDays: this.ledger.categoryOf(supply).purchaseIntervalDays,
			today: this.today,
			model: this.model(supplyId),
			onHand: this.currentStock(supplyId),
		});
	}

	isDue(categoryId: string): boolean {
		const category = this.ledger.categories.find((c) => c.id === categoryId);
		if (!category) throw new Error(`Unknown category ${categoryId}`);
		return isPurchaseDue(
			this.ledger.lastPurchaseIn(categoryId),
			this.today,
			category.purchaseIntervalDays,
		);
	}

	wasBoughtToday(supplyId: string): boolean {
		return this.ledger.lotsOf(supplyId).at(-1)?.purchasedOn === this.today;
	}

	activeLots(supplyId: string): LotState[] {
		return this.replay(supplyId).active;
	}

	currentStock(supplyId: string): number {
		if (this.ledger.lotsOf(supplyId).length > 0) {
			return sum(this.activeLots(supplyId).map((entry) => entry.remaining));
		}
		return this.ledger.lastCount(supplyId)?.remaining ?? 0;
	}

	expectedRemainingTonight(supplyId: string): number {
		return Math.max(
			0,
			this.currentStock(supplyId) - this.forecast(supplyId, this.today),
		);
	}

	daysSinceLastCount(supplyId: string): number | null {
		const last = this.ledger.lastCount(supplyId);
		return last ? daysBetween(last.day, this.today) : null;
	}

	expiringLots(supplyId: string): ExpiryAlert[] {
		return this.activeLots(supplyId).flatMap((lot) => {
			if (lot.lot.expiresOn === null) return [];
			const daysLeft = daysBetween(this.today, lot.lot.expiresOn);
			return daysLeft <= EXPIRY_ALERT_DAYS ? [{ supplyId, lot, daysLeft }] : [];
		});
	}

	expiryAlerts(): ExpiryAlert[] {
		return this.supplies
			.flatMap((supply) => this.expiringLots(supply.id))
			.sort((a, b) => a.daysLeft - b.daysLeft);
	}

	waste(): WasteEvent[] {
		return this.supplies.flatMap((supply) => this.replay(supply.id).waste);
	}

	closeCheck(supplyId: string): CloseCheck | null {
		const last = this.ledger.lastCountBefore(supplyId, this.today);
		if (!last) return null;
		const closuresSince = this.ledger
			.recordsOf(supplyId)
			.filter(
				(record) =>
					record.remaining === null &&
					record.day > last.day &&
					record.day < this.today,
			).length;
		return closeCheck({
			today: this.today,
			base:
				last.remaining +
				this.ledger.purchasedBetween(supplyId, last.day, this.today),
			gapDays: Math.max(1, daysBetween(last.day, this.today) - closuresSince),
			referencePrice: this.ledger.supply(supplyId).referencePrice,
			recentConsumption: (days) => this.openDaysWithin(supplyId, days),
		});
	}

	priceCheck(supplyId: string): PriceCheck | null {
		return priceCheck(this.ledger.lotsOf(supplyId));
	}

	private openDaysWithin(supplyId: string, days: number): Consumption[] {
		const from = addDays(this.today, -days);
		return this.consumption(supplyId).filter(
			(c) => c.day >= from && c.day < this.today && !c.closed,
		);
	}

	private model(supplyId: string): Model {
		return this.cached(this.modelBySupply, supplyId, () => {
			const supply = this.ledger.supply(supplyId);
			return fit(
				this.consumption(supplyId).filter((c) => c.day < this.today),
				coldStartEstimate(
					supply,
					this.ledger.categoryOf(supply),
					this.ledger.suppliesIn(supply.categoryId).length,
				),
			);
		});
	}

	private replay(supplyId: string): LotReplay {
		return this.cached(this.replayBySupply, supplyId, () =>
			replayLots({
				supplyId,
				lots: this.ledger.lotsOf(supplyId),
				counts: this.ledger.countsOf(supplyId),
				referencePrice: this.ledger.supply(supplyId).referencePrice,
				today: this.today,
			}),
		);
	}

	private cached<T>(cache: Map<string, T>, key: string, compute: () => T): T {
		const hit = cache.get(key);
		if (hit !== undefined) return hit;
		const value = compute();
		cache.set(key, value);
		return value;
	}
}
