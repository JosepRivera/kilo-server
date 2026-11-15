import { Elysia, t } from "elysia";
import type { Dependencies } from "../../dependencies";
import { session } from "../session";
import { closeBody, purchaseBody, purchaseView } from "./model";
import { recordService } from "./service";

const FOREIGN_SUPPLY = "Hay insumos que no son de este restaurante";

export const recordRoutes = (dependencies: Dependencies) => {
	const service = recordService(dependencies.db);
	return new Elysia()
		.use(session(dependencies))
		.post(
			"/stock-close",
			async ({ restaurant, today, body, status }) =>
				(await service.saveClose(restaurant.id, today, body.remaining))
					? status(204, undefined)
					: status(422, FOREIGN_SUPPLY),
			{
				body: closeBody,
				response: { 204: t.Void(), 422: t.String() },
				detail: { summary: "Tonight's count: what is left of each supply" },
			},
		)
		.post(
			"/stock-close/none",
			async ({ restaurant, today, status }) => {
				await service.markNoConsumption(restaurant.id, today);
				return status(204, undefined);
			},
			{
				response: { 204: t.Void() },
				detail: { summary: "Today had no consumption (a planned closure)" },
			},
		)
		.post(
			"/purchases",
			async ({ restaurant, today, body, status }) => {
				const created = await service.savePurchase(
					restaurant.id,
					today,
					body.lines,
				);
				return created === null
					? status(422, FOREIGN_SUPPLY)
					: status(201, { lots: created });
			},
			{
				body: purchaseBody,
				response: { 201: purchaseView, 422: t.String() },
				detail: { summary: "What was bought: one lot per line" },
			},
		);
};
