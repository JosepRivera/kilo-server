import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import type { Dependencies } from "./dependencies";
import { insightRoutes } from "./modules/insights";
import { recordRoutes } from "./modules/records";
import { restaurantRoutes, signupRoutes } from "./modules/restaurants";
import { supplyRoutes } from "./modules/supplies";

const documentation = {
	info: {
		title: "Kilo API",
		version: "0.1.0",
		description: "Predicts daily ingredient demand and recommends what to buy.",
	},
};

export const createApp = (dependencies: Dependencies) =>
	new Elysia()
		.use(openapi({ documentation }))
		.get("/health", () => ({ status: "ok" }), { detail: { hide: true } })
		.use(signupRoutes(dependencies))
		.use(restaurantRoutes(dependencies))
		.use(supplyRoutes(dependencies))
		.use(recordRoutes(dependencies))
		.use(insightRoutes(dependencies));
