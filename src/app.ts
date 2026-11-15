import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { insightRoutes } from "./modules/insights";
import { recordRoutes } from "./modules/records";
import { restaurant, signup } from "./modules/restaurants";
import type { Deps } from "./modules/session";
import { supplyRoutes } from "./modules/supplies";

export type AppConfig = Deps & {
	/** When set, registering a restaurant requires this code. */
	inviteCode?: string;
};

/** The whole API, with everything it touches passed in so tests can swap it. */
export const createApp = ({ inviteCode, ...deps }: AppConfig) =>
	new Elysia()
		.use(
			openapi({
				documentation: {
					info: {
						title: "Kilo API",
						version: "0.1.0",
						description:
							"Predicts daily ingredient demand and recommends what to buy.",
					},
				},
			}),
		)
		.get("/health", () => ({ status: "ok" }), { detail: { hide: true } })
		.use(signup(deps, inviteCode))
		.use(restaurant(deps))
		.use(supplyRoutes(deps))
		.use(recordRoutes(deps))
		.use(insightRoutes(deps));
