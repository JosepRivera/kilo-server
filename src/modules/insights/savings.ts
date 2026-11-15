import { lastMonths, monthOf } from "../../domain/day";
import type { Engine } from "../../domain/engine";
import type { WasteEvent } from "../../domain/lots";
import { sum } from "../../domain/statistics";
import { toSupplyView } from "../supplies/presenter";

const MONTHS_SHOWN = 4;
const TOP_WASTED = 5;

const solesOf = (events: WasteEvent[] = []) =>
	sum(events.map((event) => event.soles));

export function buildSavings(engine: Engine) {
	const currentMonth = monthOf(engine.today);
	const wasteByMonth = Map.groupBy(engine.waste(), (event) =>
		monthOf(event.day),
	);
	const months = lastMonths(currentMonth, MONTHS_SHOWN).map((month) => ({
		month,
		soles: solesOf(wasteByMonth.get(month)),
	}));
	const wasteBySupply = Map.groupBy(
		wasteByMonth.get(currentMonth) ?? [],
		(event) => event.supplyId,
	);
	return {
		months,
		current: months.at(-1)?.soles ?? 0,
		previous: months.at(-2)?.soles ?? 0,
		topWasted: [...wasteBySupply]
			.map(([supplyId, events]) => ({
				supply: toSupplyView(engine, engine.ledger.supply(supplyId)),
				soles: solesOf(events),
			}))
			.sort((a, b) => b.soles - a.soles)
			.slice(0, TOP_WASTED),
	};
}
