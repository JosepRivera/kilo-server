import { expect, test } from "bun:test";
import { toDraftItems } from "../../src/modules/voice/draft";
import type { ExtractedItem } from "../../src/voice/extraction";
import { supply } from "../domain/support";

const heard = (over: Partial<ExtractedItem>): ExtractedItem => ({
	name: "Tomate",
	quantity: null,
	phrase: null,
	cost: null,
	suggestedQuantity: null,
	...over,
});

const tomato = supply({
	id: "tomato",
	name: "Tomate",
	phrases: { "medio balde": 6 },
});

test("a known spoken measure becomes a quantity in the supply's unit", () => {
	const [item] = toDraftItems([heard({ phrase: "Medio balde" })], [tomato]);
	expect(item).toMatchObject({ quantity: 6, phrase: null });
});

test("an unknown measure is kept so the app can ask what it means", () => {
	const [item] = toDraftItems([heard({ phrase: "una jaba" })], [tomato]);
	expect(item).toMatchObject({ quantity: null, phrase: "una jaba" });
});

test("a measure is never converted for a supply that is not resolved", () => {
	const [item] = toDraftItems(
		[heard({ name: "limón", phrase: "medio balde" })],
		[tomato],
	);
	expect(item?.resolution.kind).toBe("ambiguous");
	expect(item).toMatchObject({ quantity: null, phrase: "medio balde" });
});

test("keeps what was heard next to the suggested correction", () => {
	const [item] = toDraftItems(
		[heard({ quantity: 13, suggestedQuantity: 3, cost: 26 })],
		[tomato],
	);
	expect(item).toMatchObject({
		spoken: "Tomate",
		quantity: 13,
		suggestedQuantity: 3,
		cost: 26,
		resolution: { kind: "exact", candidate: { supplyId: "tomato" } },
	});
});

test("something outside the catalog stays unknown", () => {
	const [item] = toDraftItems([heard({ name: "huacatay" })], [tomato]);
	expect(item?.resolution).toEqual({ kind: "unknown" });
});
