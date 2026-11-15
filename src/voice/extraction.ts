import { z } from "zod";

export type DictationKind = "close" | "purchase";

export type KnownSupply = {
	name: string;
	unit: string;
	expectedRemaining: number;
	phrases: string[];
};

export type ExtractionRequest = {
	kind: DictationKind;
	transcript: string;
	supplies: KnownSupply[];
};

export const extractionSchema = z.object({
	items: z.array(
		z.object({
			name: z.string(),
			quantity: z.number().nullable(),
			phrase: z.string().nullable(),
			cost: z.number().nullable(),
			suggestedQuantity: z.number().nullable(),
		}),
	),
});

export type ExtractedItem = z.infer<typeof extractionSchema>["items"][number];

export type Extractor = (
	request: ExtractionRequest,
) => Promise<ExtractedItem[]>;
