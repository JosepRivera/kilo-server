import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { categories, restaurants } from "../db/schema";
import { CATEGORY_TEMPLATE } from "../domain/catalog";
import {
	type Deps,
	hashToken,
	newToken,
	restaurantColumns,
	session,
} from "./session";

const restaurantView = t.Object({
	id: t.String(),
	name: t.String(),
	closedWeekdays: t.Array(t.Number()),
});

const categoryView = t.Object({
	id: t.String(),
	name: t.String(),
	purchaseIntervalDays: t.Number(),
	monthlySpend: t.Number(),
	critical: t.Boolean(),
});

const categoryColumns = {
	id: categories.id,
	name: categories.name,
	purchaseIntervalDays: categories.purchaseIntervalDays,
	monthlySpend: categories.monthlySpend,
	critical: categories.critical,
};

const name = t.String({ minLength: 1, maxLength: 80 });
const weekdays = t.Array(t.Integer({ minimum: 1, maximum: 7 }), {
	uniqueItems: true,
});
const categoryFields = {
	name,
	purchaseIntervalDays: t.Integer({ minimum: 1, maximum: 60 }),
	monthlySpend: t.Number({ minimum: 0 }),
	critical: t.Boolean(),
};

/** Registers a restaurant; the only route that needs no token. */
export const signup = ({ db }: Deps, inviteCode?: string) =>
	new Elysia().post(
		"/restaurants",
		async ({ body, status }) => {
			if (inviteCode && body.inviteCode !== inviteCode) {
				return status(403, "Código de invitación inválido");
			}
			const token = newToken();
			const restaurant = await db.transaction(async (tx) => {
				const [created] = await tx
					.insert(restaurants)
					.values({ name: body.name, tokenHash: hashToken(token) })
					.returning(restaurantColumns);
				if (!created) throw new Error("Restaurant was not created");
				await tx
					.insert(categories)
					.values(
						CATEGORY_TEMPLATE.map((c) => ({ ...c, restaurantId: created.id })),
					);
				return created;
			});
			// The only time the token is ever sent: the app must keep it.
			return status(201, { token, restaurant });
		},
		{
			body: t.Object({ name, inviteCode: t.Optional(t.String()) }),
			response: {
				201: t.Object({ token: t.String(), restaurant: restaurantView }),
				403: t.String(),
			},
			detail: { summary: "Register a restaurant and get its device token" },
		},
	);

export const restaurant = (deps: Deps) =>
	new Elysia()
		.use(session(deps))
		.get("/restaurant", ({ restaurant }) => restaurant, {
			response: restaurantView,
		})
		.patch(
			"/restaurant",
			async ({ restaurant, body }) => {
				const [updated] = await deps.db
					.update(restaurants)
					.set(body)
					.where(eq(restaurants.id, restaurant.id))
					.returning(restaurantColumns);
				return updated ?? restaurant;
			},
			{
				body: t.Partial(t.Object({ name, closedWeekdays: weekdays })),
				response: restaurantView,
				detail: { summary: "Rename, or set the weekdays it never opens" },
			},
		)
		.get(
			"/categories",
			({ restaurant }) =>
				deps.db
					.select(categoryColumns)
					.from(categories)
					.where(eq(categories.restaurantId, restaurant.id))
					.orderBy(categories.name),
			{ response: t.Array(categoryView) },
		)
		.post(
			"/categories",
			async ({ restaurant, body, status }) => {
				const [created] = await deps.db
					.insert(categories)
					.values({ ...body, restaurantId: restaurant.id })
					.onConflictDoNothing()
					.returning(categoryColumns);
				return created
					? status(201, created)
					: status(409, "Ya existe una categoría con ese nombre");
			},
			{
				body: t.Object(categoryFields),
				response: { 201: categoryView, 409: t.String() },
			},
		)
		.patch(
			"/categories/:id",
			async ({ restaurant, params, body, status }) => {
				const [updated] = await deps.db
					.update(categories)
					.set(body)
					.where(
						and(
							eq(categories.id, params.id),
							eq(categories.restaurantId, restaurant.id),
						),
					)
					.returning(categoryColumns);
				return updated ?? status(404, "Categoría no encontrada");
			},
			{
				params: t.Object({ id: t.String({ format: "uuid" }) }),
				body: t.Partial(t.Object(categoryFields)),
				response: { 200: categoryView, 404: t.String() },
				detail: {
					summary: "Purchase interval and monthly spend, per category",
				},
			},
		);
