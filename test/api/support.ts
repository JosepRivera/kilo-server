import { createApp } from "../../src/app";
import { db } from "../../src/db/client";
import type { Dependencies } from "../../src/dependencies";

export const clock = {
	now: new Date(),
	set(day: string) {
		this.now = new Date(`${day}T17:00:00Z`);
	},
};

export const buildApp = (config: Partial<Dependencies> = {}) =>
	createApp({ db, now: () => clock.now, ...config });

type App = { handle(request: Request): Promise<Response> };

export function client(app: App, token?: string) {
	const send = async (
		method: string,
		path: string,
		body?: string | FormData,
	) => {
		const headers = new Headers();
		if (token) headers.set("authorization", `Bearer ${token}`);
		if (typeof body === "string")
			headers.set("content-type", "application/json");
		const response = await app.handle(
			new Request(`http://kilo.test${path}`, { method, headers, body }),
		);
		const text = await response.text();
		const isJson = response.headers.get("content-type")?.includes("json");
		const parsed: any = isJson ? JSON.parse(text) : text;
		return { status: response.status, body: parsed };
	};
	const call = (method: string, path: string, body?: unknown) =>
		send(method, path, body === undefined ? undefined : JSON.stringify(body));
	return {
		get: (path: string) => call("GET", path),
		post: (path: string, body?: unknown) => call("POST", path, body),
		patch: (path: string, body: unknown) => call("PATCH", path, body),
		put: (path: string, body: unknown) => call("PUT", path, body),
		postForm: (path: string, form: FormData) => send("POST", path, form),
	};
}

export async function register(app: App = buildApp(), name = "Doña Rosa") {
	const { body } = await client(app).post("/restaurants", { name });
	return client(app, body.token as string);
}
