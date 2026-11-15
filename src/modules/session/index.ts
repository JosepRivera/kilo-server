import { Elysia } from "elysia";
import type { Dependencies } from "../../dependencies";
import { businessDay } from "../../domain/day";
import { findRestaurantByToken } from "./service";
import { bearerToken } from "./tokens";

export const session = ({ db, now }: Dependencies) =>
	new Elysia({ name: "session" }).resolve(
		{ as: "scoped" },
		async ({ headers, status }) => {
			const token = bearerToken(headers.authorization);
			if (!token) return status(401, "Falta el token de acceso");
			const restaurant = await findRestaurantByToken(db, token);
			if (!restaurant) return status(401, "Token de acceso inválido");
			return { restaurant, today: businessDay(now()) };
		},
	);
