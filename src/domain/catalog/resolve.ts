import type { Supply } from "../kitchen";
import type { CategoryKey } from "./category-template";
import { MASTER_CATALOG } from "./master-catalog";
import { normalizeTerm } from "./text";

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

type KnownSupply = Pick<Supply, "id" | "name" | "unit">;
type Indexed = { key: string; family?: string; candidate: Candidate };

function indexCandidates(supplies: KnownSupply[]): Indexed[] {
	const index = new Map<string, Indexed>();
	for (const entry of MASTER_CATALOG) {
		const key = normalizeTerm(entry.name);
		index.set(key, {
			key,
			family: entry.family,
			candidate: {
				supplyId: null,
				name: entry.name,
				unit: entry.unit,
				category: entry.category,
			},
		});
	}
	for (const supply of supplies) {
		const key = normalizeTerm(supply.name);
		index.set(key, {
			key,
			family: index.get(key)?.family,
			candidate: {
				supplyId: supply.id,
				name: supply.name,
				unit: supply.unit,
				category: null,
			},
		});
	}
	return [...index.values()];
}

const matchesEveryWord = (term: string, key: string) => {
	const nameWords = key.split(" ");
	return term
		.split(" ")
		.every((word) => nameWords.some((nameWord) => nameWord.startsWith(word)));
};

export function resolve(spoken: string, supplies: KnownSupply[]): Resolution {
	const term = normalizeTerm(spoken);
	if (!term) return { kind: "unknown" };

	const index = indexCandidates(supplies);
	const exact = index.find((item) => item.key === term);
	if (exact) return { kind: "exact", candidate: exact.candidate };

	const family = index.filter((item) => item.family === term);
	const matches =
		family.length > 1
			? family
			: index.filter((item) => matchesEveryWord(term, item.key));

	const [only] = matches;
	if (!only) return { kind: "unknown" };
	if (matches.length === 1) return { kind: "exact", candidate: only.candidate };
	return {
		kind: "ambiguous",
		candidates: matches.map((item) => item.candidate),
	};
}
