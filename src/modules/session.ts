import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import type { Db } from "../db/client";
import { restaurants } from "../db/schema";
import { businessDay } from "../domain/day";

export type Deps = {
	db: Db;
	now: () => Date;
};

/** What routes may see of a restaurant: never its token hash. */
export const restaurantColumns = {
	id: restaurants.id,
	name: restaurants.name,
	closedWeekdays: restaurants.closedWeekdays,
};

export type Restaurant = {
	id: string;
	name: string;
	closedWeekdays: number[];
};

export const newToken = () => randomBytes(32).toString("base64url");

// The token is 256 random bits, so a plain hash is enough to store it safely.
export const hashToken = (token: string) =>
	createHash("sha256").update(token).digest("hex");

/**
 * Every route of a module that uses this plugin requires the device token
 * and gets the restaurant it belongs to, plus the current business day.
 */
export const session = ({ db, now }: Deps) =>
	new Elysia({ name: "session" }).resolve(
		{ as: "scoped" },
		async ({ headers, status }) => {
			const token = headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
			if (!token) return status(401, "Falta el token de acceso");
			const [restaurant] = await db
				.select(restaurantColumns)
				.from(restaurants)
				.where(eq(restaurants.tokenHash, hashToken(token)))
				.limit(1);
			if (!restaurant) return status(401, "Token de acceso inválido");
			return { restaurant, today: businessDay(now()) };
		},
	);
