import { t } from "elysia";

const supplyId = t.String({ format: "uuid" });
const MAX_LINES = 200;

export const closeBody = t.Object({
	remaining: t.Record(supplyId, t.Number({ minimum: 0 }), {
		minProperties: 1,
	}),
});

export const purchaseBody = t.Object({
	lines: t.Array(
		t.Object({
			supplyId,
			quantity: t.Number({ exclusiveMinimum: 0 }),
			cost: t.Number({ minimum: 0 }),
			expiresOn: t.Optional(t.String({ format: "date" })),
		}),
		{ minItems: 1, maxItems: MAX_LINES },
	),
});

export const purchaseView = t.Object({ lots: t.Number() });
