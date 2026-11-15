import { Elysia } from "elysia";
import type { Dependencies } from "../../dependencies";
import { loadEngine } from "../kitchen/repository";
import { session } from "../session";
import { savingsView, todayView } from "./model";
import { buildSavings } from "./savings";
import { buildToday } from "./today";

export const insightRoutes = (dependencies: Dependencies) =>
	new Elysia()
		.use(session(dependencies))
		.get(
			"/today",
			async ({ restaurant, today }) =>
				buildToday(await loadEngine(dependencies.db, restaurant, today)),
			{
				response: todayView,
				detail: { summary: "What expires, what to buy and what is covered" },
			},
		)
		.get(
			"/savings",
			async ({ restaurant, today }) =>
				buildSavings(await loadEngine(dependencies.db, restaurant, today)),
			{
				response: savingsView,
				detail: { summary: "Soles lost to expired stock, month against month" },
			},
		);
