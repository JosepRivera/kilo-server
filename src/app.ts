import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import type { Dependencies } from "./dependencies";
import { insightRoutes } from "./modules/insights";
import { recordRoutes } from "./modules/records";
import { restaurantRoutes, signupRoutes } from "./modules/restaurants";
import { supplyRoutes } from "./modules/supplies";
import { voiceRoutes } from "./modules/voice";

const documentation = {
	info: {
		title: "Kilo API",
		version: "0.1.0",
		description: "Predicts daily ingredient demand and recommends what to buy.",
	},
};

const MAX_REQUEST_BODY_BYTES = 12 * 1024 * 1024;

export const createApp = (dependencies: Dependencies) =>
	new Elysia({ serve: { maxRequestBodySize: MAX_REQUEST_BODY_BYTES } })
		.use(openapi({ documentation }))
		.get("/health", () => ({ status: "ok" }), { detail: { hide: true } })
		.use(signupRoutes(dependencies))
		.use(restaurantRoutes(dependencies))
		.use(supplyRoutes(dependencies))
		.use(recordRoutes(dependencies))
		.use(insightRoutes(dependencies))
		.use(voiceRoutes(dependencies));
