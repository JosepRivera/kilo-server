import { t } from "elysia";

const day = t.String({ format: "date" });

export const supplyView = t.Object({
	id: t.String(),
	name: t.String(),
	unit: t.String(),
	categoryId: t.String(),
	icon: t.Union([t.String(), t.Null()]),
	critical: t.Boolean(),
	shelfLifeDays: t.Number(),
	referencePrice: t.Number(),
	phrases: t.Record(t.String(), t.Number()),
	stock: t.Number(),
	realDays: t.Number(),
	learning: t.Boolean(),
	expiresInDays: t.Union([t.Number(), t.Null()]),
	dueForClose: t.Boolean(),
	expectedRemaining: t.Number(),
	closeCheck: t.Union([
		t.Object({
			base: t.Number(),
			gapDays: t.Number(),
			usual: t.Number(),
			reviewBelow: t.Number(),
		}),
		t.Null(),
	]),
	priceCheck: t.Union([
		t.Object({ usual: t.Number(), low: t.Number(), high: t.Number() }),
		t.Null(),
	]),
});

export const recommendationView = t.Object({
	toBuy: t.Number(),
	onHand: t.Number(),
	demand: t.Number(),
	buffer: t.Number(),
	horizonDays: t.Number(),
	typicalError: t.Number(),
});

export const supplyDetailView = t.Composite([
	supplyView,
	t.Object({
		recommendation: recommendationView,
		week: t.Array(t.Object({ day, amount: t.Number() })),
		recent: t.Array(
			t.Object({
				day,
				amount: t.Number(),
				kind: t.UnionEnum(["real", "estimated", "closed", "missing"]),
			}),
		),
		lots: t.Array(
			t.Object({
				id: t.String(),
				purchasedOn: day,
				expiresOn: day,
				remaining: t.Number(),
				daysLeft: t.Number(),
			}),
		),
	}),
]);

const candidate = t.Object({
	supplyId: t.Union([t.String(), t.Null()]),
	name: t.String(),
	unit: t.String(),
	category: t.Union([t.String(), t.Null()]),
});

export const resolutionView = t.Union([
	t.Object({ kind: t.Literal("exact"), candidate }),
	t.Object({ kind: t.Literal("ambiguous"), candidates: t.Array(candidate) }),
	t.Object({ kind: t.Literal("unknown") }),
]);

export const supplyBody = t.Object({
	name: t.String({ minLength: 1, maxLength: 80 }),
	unit: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
	categoryId: t.Optional(t.String({ format: "uuid" })),
	shelfLifeDays: t.Optional(t.Integer({ minimum: 1, maximum: 3650 })),
	referencePrice: t.Optional(t.Number({ minimum: 0 })),
});

export const supplyPatch = t.Object({ critical: t.Boolean() });

export const phraseBody = t.Object({
	phrase: t.String({ minLength: 1, maxLength: 60 }),
	amount: t.Number({ exclusiveMinimum: 0 }),
});

export const resolveQuery = t.Object({
	term: t.String({ minLength: 1, maxLength: 80 }),
});

export const supplyParams = t.Object({ id: t.String({ format: "uuid" }) });
