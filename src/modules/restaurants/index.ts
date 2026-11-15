import { Elysia, t } from "elysia";
import type { Dependencies } from "../../dependencies";
import { session } from "../session";
import {
	categoryBody,
	categoryPatch,
	categoryView,
	idParams,
	registrationBody,
	registrationView,
	restaurantPatch,
	restaurantView,
} from "./model";
import { restaurantService } from "./service";

export const signupRoutes = ({ db, inviteCode }: Dependencies) => {
	const service = restaurantService(db);
	return new Elysia().post(
		"/restaurants",
		async ({ body, status }) => {
			if (inviteCode && body.inviteCode !== inviteCode) {
				return status(403, "Código de invitación inválido");
			}
			return status(201, await service.register(body.name));
		},
		{
			body: registrationBody,
			response: { 201: registrationView, 403: t.String() },
			detail: { summary: "Register a restaurant and get its device token" },
		},
	);
};

export const restaurantRoutes = (dependencies: Dependencies) => {
	const service = restaurantService(dependencies.db);
	return new Elysia()
		.use(session(dependencies))
		.get("/restaurant", ({ restaurant }) => restaurant, {
			response: restaurantView,
		})
		.patch(
			"/restaurant",
			({ restaurant, body }) => service.update(restaurant, body),
			{
				body: restaurantPatch,
				response: restaurantView,
				detail: { summary: "Rename, or set the weekdays it never opens" },
			},
		)
		.get(
			"/categories",
			({ restaurant }) => service.listCategories(restaurant.id),
			{ response: t.Array(categoryView) },
		)
		.post(
			"/categories",
			async ({ restaurant, body, status }) => {
				const created = await service.addCategory(restaurant.id, body);
				return created
					? status(201, created)
					: status(409, "Ya existe una categoría con ese nombre");
			},
			{ body: categoryBody, response: { 201: categoryView, 409: t.String() } },
		)
		.patch(
			"/categories/:id",
			async ({ restaurant, params, body, status }) =>
				(await service.updateCategory(restaurant.id, params.id, body)) ??
				status(404, "Categoría no encontrada"),
			{
				params: idParams,
				body: categoryPatch,
				response: { 200: categoryView, 404: t.String() },
				detail: {
					summary: "Purchase interval and monthly spend, per category",
				},
			},
		);
};
