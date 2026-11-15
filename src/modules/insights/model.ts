import { t } from "elysia";
import { recommendationView, supplyView } from "../supplies/model";

const day = t.String({ format: "date" });

export const todayView = t.Object({
	day,
	alerts: t.Array(
		t.Object({
			supply: supplyView,
			daysLeft: t.Number(),
			remaining: t.Number(),
			lots: t.Array(
				t.Object({
					purchasedOn: day,
					remaining: t.Number(),
					daysLeft: t.Number(),
				}),
			),
		}),
	),
	toBuy: t.Array(
		t.Object({
			supply: supplyView,
			recommendation: recommendationView,
			bought: t.Boolean(),
		}),
	),
	covered: t.Array(supplyView),
});

export const savingsView = t.Object({
	months: t.Array(t.Object({ month: t.String(), soles: t.Number() })),
	current: t.Number(),
	previous: t.Number(),
	topWasted: t.Array(t.Object({ supply: supplyView, soles: t.Number() })),
});
