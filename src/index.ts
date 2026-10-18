import { Elysia } from "elysia";

new Elysia().get("/", () => "Hello Elysia").listen(3000);

console.log(
	`🦊 Elysia is running at http://localhost:${Bun.env.API_HOST_PORT}`,
);
