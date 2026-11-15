import type { Supply } from "./engine";

/** The categories every new restaurant starts with; they can rename or add. */
export const CATEGORY_TEMPLATE = [
	{
		key: "protein",
		name: "Proteínas",
		purchaseIntervalDays: 3,
		critical: true,
	},
	{
		key: "produce",
		name: "Verduras y frutas",
		purchaseIntervalDays: 3,
		critical: true,
	},
	{
		key: "dairy",
		name: "Lácteos y huevos",
		purchaseIntervalDays: 4,
		critical: true,
	},
	{ key: "bakery", name: "Panadería", purchaseIntervalDays: 1, critical: true },
	{
		key: "grocery",
		name: "Granos y abarrotes",
		purchaseIntervalDays: 10,
		critical: false,
	},
	{
		key: "seasoning",
		name: "Condimentos y especias",
		purchaseIntervalDays: 14,
		critical: false,
	},
	{
		key: "beverage",
		name: "Bebidas",
		purchaseIntervalDays: 7,
		critical: false,
	},
] as const;

export type CategoryKey = (typeof CATEGORY_TEMPLATE)[number]["key"];

export type CatalogEntry = {
	name: string;
	unit: string;
	category: CategoryKey;
	shelfLifeDays: number;
	/** Soles per unit. Approximate until wired to SISAP wholesale prices. */
	referencePrice: number;
	icon?: string;
	/** Entries a single spoken word can mean ("limón"), offered together. */
	family?: string;
};

const entry = (
	name: string,
	unit: string,
	category: CategoryKey,
	shelfLifeDays: number,
	referencePrice: number,
	icon?: string,
	family?: string,
): CatalogEntry => ({
	name,
	unit,
	category,
	shelfLifeDays,
	referencePrice,
	icon,
	family,
});

// shortcut: the master catalog ships with the code, so a change needs a deploy.
// Move it to a table once it is loaded from SISAP or edited by someone else.
export const MASTER_CATALOG: CatalogEntry[] = [
	entry("Pollo entero", "kg", "protein", 3, 9.5, "chicken"),
	entry("Pechuga de pollo", "kg", "protein", 3, 14, "chicken"),
	entry("Carne de res", "kg", "protein", 4, 24, "beef"),
	entry("Lomo fino", "kg", "protein", 4, 48, "beef"),
	entry("Carne de cerdo", "kg", "protein", 4, 16, "beef"),
	entry("Pescado bonito", "kg", "protein", 2, 12, "fish"),
	entry("Pescado jurel", "kg", "protein", 2, 8, "fish"),
	entry("Langostinos", "kg", "protein", 2, 38, "shrimp"),
	entry("Limón sutil", "kg", "produce", 10, 5, "lime", "limon"),
	entry("Limón tahití", "kg", "produce", 14, 4, "lime", "limon"),
	entry("Lima persa", "kg", "produce", 14, 4.5, "lime", "limon"),
	entry("Papa canchán", "kg", "produce", 14, 2, "potato"),
	entry("Papa amarilla", "kg", "produce", 10, 3.5, "potato"),
	entry("Camote", "kg", "produce", 14, 2.2, "potato"),
	entry("Cebolla roja", "kg", "produce", 20, 2.6, "onion"),
	entry("Tomate", "kg", "produce", 6, 3.5, "tomato"),
	entry("Zanahoria", "kg", "produce", 14, 2, "carrot"),
	entry("Ají amarillo", "kg", "produce", 10, 8, "chili"),
	entry("Ají limo", "kg", "produce", 7, 12, "chili"),
	entry("Rocoto", "kg", "produce", 10, 7, "chili"),
	entry("Ajo", "kg", "produce", 30, 12, "garlic"),
	entry("Culantro", "atados", "produce", 3, 2, "cilantro"),
	entry("Perejil", "atados", "produce", 3, 1.5, "cilantro"),
	entry("Choclo", "unidades", "produce", 4, 1.5, "corn"),
	entry("Palta", "kg", "produce", 5, 9, "avocado"),
	entry("Leche evaporada", "unidades", "dairy", 180, 4.2, "milk"),
	entry("Leche fresca", "litros", "dairy", 5, 5, "milk"),
	entry("Queso fresco", "kg", "dairy", 7, 22, "cheese"),
	entry("Mantequilla", "kg", "dairy", 30, 28, "cheese"),
	entry("Huevos", "unidades", "dairy", 21, 0.6, "egg"),
	entry("Pan francés", "unidades", "bakery", 1, 0.3, "bread"),
	entry("Pan de molde", "unidades", "bakery", 6, 8, "bread"),
	entry("Arroz", "kg", "grocery", 180, 4, "rice"),
	entry("Azúcar", "kg", "grocery", 365, 4.2),
	entry("Fideos", "kg", "grocery", 365, 5),
	entry("Lentejas", "kg", "grocery", 365, 8),
	entry("Frejol canario", "kg", "grocery", 365, 9),
	entry("Harina", "kg", "grocery", 180, 3.8),
	entry("Aceite vegetal", "litros", "grocery", 365, 8.5, "oil"),
	entry("Sal", "kg", "seasoning", 730, 1.5, "salt"),
	entry("Pimienta", "kg", "seasoning", 365, 45, "salt"),
	entry("Comino", "kg", "seasoning", 365, 30, "salt"),
	entry("Sillao", "litros", "seasoning", 365, 9),
	entry("Vinagre", "litros", "seasoning", 365, 4),
	entry("Agua de mesa", "unidades", "beverage", 365, 1.2),
	entry("Gaseosa", "unidades", "beverage", 180, 2.5),
];

/** Lowercase, no accents, single spaces: how a spoken phrase is stored. */
export function foldText(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.join(" ");
}

/** Folded and without plural endings: "Limones" and "limón" match. */
export function normalizeTerm(text: string): string {
	return (
		foldText(text)
			.split(" ")
			// Drop "s" and then "e": "tomates"/"tomate" and "limones"/"limón" meet.
			.map((word) =>
				word.length > 3 ? word.replace(/s$/, "").replace(/e$/, "") : word,
			)
			.join(" ")
	);
}

/** A supply the restaurant already has, or a master-catalog entry it could add. */
export type Candidate = {
	supplyId: string | null;
	name: string;
	unit: string;
	category: CategoryKey | null;
};

export type Resolution =
	| { kind: "exact"; candidate: Candidate }
	| { kind: "ambiguous"; candidates: Candidate[] }
	| { kind: "unknown" };

/**
 * Resolves a spoken name. Never guesses: several matches go back to the user
 * as a choice, and no match asks for confirmation before creating a supply.
 */
export function resolve(
	spoken: string,
	supplies: Pick<Supply, "id" | "name" | "unit">[],
): Resolution {
	const term = normalizeTerm(spoken);
	if (!term) return { kind: "unknown" };

	const candidates = new Map<string, Candidate & { family?: string }>();
	for (const e of MASTER_CATALOG) {
		candidates.set(normalizeTerm(e.name), {
			supplyId: null,
			name: e.name,
			unit: e.unit,
			category: e.category,
			family: e.family,
		});
	}
	// The restaurant's own supplies shadow the catalog entry they came from.
	for (const s of supplies) {
		const key = normalizeTerm(s.name);
		candidates.set(key, {
			supplyId: s.id,
			name: s.name,
			unit: s.unit,
			category: null,
			family: candidates.get(key)?.family,
		});
	}
	const strip = ({
		family: _,
		...candidate
	}: Candidate & { family?: string }) => candidate;

	const exact = candidates.get(term);
	if (exact) return { kind: "exact", candidate: strip(exact) };

	const words = term.split(" ");
	const all = [...candidates];
	const family = all.filter(([, c]) => c.family === term);
	// Whole-word prefixes, so "res" finds "Carne de res" but not "Queso fresco".
	const matches =
		family.length > 1
			? family
			: all.filter(([key]) => {
					const nameWords = key.split(" ");
					return words.every((w) => nameWords.some((n) => n.startsWith(w)));
				});
	const [only] = matches;
	if (!only) return { kind: "unknown" };
	if (matches.length === 1) return { kind: "exact", candidate: strip(only[1]) };
	return { kind: "ambiguous", candidates: matches.map(([, c]) => strip(c)) };
}

export const findCatalogEntry = (name: string) =>
	MASTER_CATALOG.find((e) => normalizeTerm(e.name) === normalizeTerm(name));
