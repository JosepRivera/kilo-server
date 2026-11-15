import { t } from "elysia";

const name = t.String({ minLength: 1, maxLength: 80 });

const categoryFields = {
	name,
	purchaseIntervalDays: t.Integer({ minimum: 1, maximum: 60 }),
	monthlySpend: t.Number({ minimum: 0 }),
	critical: t.Boolean(),
};

export const restaurantView = t.Object({
	id: t.String(),
	name: t.String(),
	closedWeekdays: t.Array(t.Number()),
});

export const categoryView = t.Object({
	id: t.String(),
	...categoryFields,
});

export const registrationBody = t.Object({
	name,
	inviteCode: t.Optional(t.String()),
});

export const registrationView = t.Object({
	token: t.String(),
	restaurant: restaurantView,
});

export const restaurantPatch = t.Partial(
	t.Object({
		name,
		closedWeekdays: t.Array(t.Integer({ minimum: 1, maximum: 7 }), {
			uniqueItems: true,
		}),
	}),
);

export const categoryBody = t.Object(categoryFields);
export const categoryPatch = t.Partial(categoryBody);
export const idParams = t.Object({ id: t.String({ format: "uuid" }) });
