import { expect, test } from "bun:test";
import { normalizeTerm, resolve } from "../../src/domain/catalog";
import { supply } from "./support";

test("ignores accents, case and plurals", () => {
	expect(normalizeTerm("  Limones ")).toBe(normalizeTerm("limón"));
	expect(normalizeTerm("Ajíes amarillos")).toBe("aji amarillo");
});

test("an exact name resolves straight to the catalog entry", () => {
	const r = resolve("papa canchan", []);
	expect(r).toEqual({
		kind: "exact",
		candidate: {
			supplyId: null,
			name: "Papa canchán",
			unit: "kg",
			category: "produce",
		},
	});
});

test("the restaurant's own supply shadows the catalog entry", () => {
	const r = resolve("Tomates", [supply({ id: "s1", name: "Tomate" })]);
	expect(r.kind === "exact" && r.candidate.supplyId).toBe("s1");
});

test("'limón' offers every lime, including the one named differently", () => {
	const r = resolve("limón", []);
	expect(r.kind === "ambiguous" && r.candidates.map((c) => c.name)).toEqual([
		"Limón sutil",
		"Limón tahití",
		"Lima persa",
	]);
});

test("a partial name that fits several supplies asks which one", () => {
	const r = resolve("papa", [supply({ id: "s1", name: "Papa huayro" })]);
	expect(r.kind === "ambiguous" && r.candidates.map((c) => c.name)).toEqual([
		"Papa canchán",
		"Papa amarilla",
		"Papa huayro",
	]);
});

test("matches whole words, not fragments inside another word", () => {
	const r = resolve("res", []);
	expect(r.kind === "exact" && r.candidate.name).toBe("Carne de res");
});

test("something outside the catalog is unknown, never created silently", () => {
	expect(resolve("huacatay", [])).toEqual({ kind: "unknown" });
	expect(resolve("   ", [])).toEqual({ kind: "unknown" });
});
