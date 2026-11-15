import { Elysia, t } from "elysia";
import type { Dependencies } from "../../dependencies";
import { session } from "../session";
import {
	phraseBody,
	resolutionView,
	resolveQuery,
	supplyBody,
	supplyDetailView,
	supplyParams,
	supplyPatch,
	supplyView,
} from "./model";
import { supplyService } from "./service";

const NOT_FOUND = "Insumo no encontrado";

export const supplyRoutes = (dependencies: Dependencies) => {
	const service = supplyService(dependencies.db);
	return new Elysia()
		.use(session(dependencies))
		.get(
			"/supplies",
			({ restaurant, today }) => service.list(restaurant, today),
			{
				response: t.Array(supplyView),
			},
		)
		.get(
			"/supplies/:id",
			async ({ restaurant, today, params, status }) =>
				(await service.detail(restaurant, today, params.id)) ??
				status(404, NOT_FOUND),
			{
				params: supplyParams,
				response: { 200: supplyDetailView, 404: t.String() },
				detail: {
					summary: "Forecast, recent days, lots and the why of a purchase",
				},
			},
		)
		.post(
			"/supplies",
			async ({ restaurant, today, body, status }) => {
				const result = await service.add(restaurant, today, body);
				switch (result.outcome) {
					case "existing":
						return result.supply;
					case "created":
						return status(201, result.supply);
					case "missing-unit":
						return status(422, "Falta la unidad de medida");
					case "missing-category":
						return status(422, "Elige una categoría");
				}
			},
			{
				body: supplyBody,
				response: { 200: supplyView, 201: supplyView, 422: t.String() },
				detail: {
					summary: "Add a supply; a master-catalog name fills in the rest",
				},
			},
		)
		.patch(
			"/supplies/:id",
			async ({ restaurant, params, body, status }) =>
				(await service.setCritical(restaurant.id, params.id, body.critical))
					? status(204, undefined)
					: status(404, NOT_FOUND),
			{
				params: supplyParams,
				body: supplyPatch,
				response: { 204: t.Void(), 404: t.String() },
				detail: { summary: "Critical (counted nightly) or secondary (weekly)" },
			},
		)
		.put(
			"/supplies/:id/phrases",
			async ({ restaurant, params, body, status }) =>
				(await service.rememberPhrase(
					restaurant.id,
					params.id,
					body.phrase,
					body.amount,
				))
					? status(204, undefined)
					: status(404, NOT_FOUND),
			{
				params: supplyParams,
				body: phraseBody,
				response: { 204: t.Void(), 404: t.String() },
				detail: {
					summary: "Remember what 'medio balde' means for this supply",
				},
			},
		)
		.get(
			"/catalog/resolve",
			({ restaurant, query }) => service.resolve(restaurant.id, query.term),
			{
				query: resolveQuery,
				response: resolutionView,
				detail: {
					summary: "Exact, ambiguous or unknown: never a silent guess",
				},
			},
		);
};
