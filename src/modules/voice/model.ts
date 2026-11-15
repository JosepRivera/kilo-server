import { t } from "elysia";
import { resolutionView } from "../supplies/model";

const MAX_AUDIO_SIZE = "10m";
const MAX_TEXT_LENGTH = 2000;

export const dictationBody = t.Object({
	kind: t.UnionEnum(["close", "purchase"]),
	audio: t.Optional(t.File({ maxSize: MAX_AUDIO_SIZE })),
	text: t.Optional(t.String({ minLength: 1, maxLength: MAX_TEXT_LENGTH })),
});

export const draftView = t.Object({
	transcript: t.String(),
	items: t.Array(
		t.Object({
			spoken: t.String(),
			resolution: resolutionView,
			quantity: t.Union([t.Number(), t.Null()]),
			phrase: t.Union([t.String(), t.Null()]),
			cost: t.Union([t.Number(), t.Null()]),
			suggestedQuantity: t.Union([t.Number(), t.Null()]),
		}),
	),
});
