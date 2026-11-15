import { resolve } from "../../domain/catalog/resolve";
import { foldText } from "../../domain/catalog/text";
import type { Supply } from "../../domain/kitchen";
import type { ExtractedItem } from "../../voice/extraction";

function knownMeasure(
	item: ExtractedItem,
	supply: Supply | undefined,
): number | undefined {
	if (!item.phrase || !supply) return undefined;
	return supply.phrases[foldText(item.phrase)];
}

export function toDraftItems(items: ExtractedItem[], supplies: Supply[]) {
	return items.map((item) => {
		const resolution = resolve(item.name, supplies);
		const supply =
			resolution.kind === "exact"
				? supplies.find((s) => s.id === resolution.candidate.supplyId)
				: undefined;
		const measured = knownMeasure(item, supply);
		return {
			spoken: item.name,
			resolution,
			quantity: measured ?? item.quantity,
			phrase: measured === undefined ? item.phrase : null,
			cost: item.cost,
			suggestedQuantity: item.suggestedQuantity,
		};
	});
}
