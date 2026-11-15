const MIN_LENGTH_TO_SINGULARIZE = 4;

const singular = (word: string) =>
	word.length >= MIN_LENGTH_TO_SINGULARIZE
		? word.replace(/s$/, "").replace(/e$/, "")
		: word;

export const foldText = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.join(" ");

export const normalizeTerm = (text: string) =>
	foldText(text).split(" ").map(singular).join(" ");
