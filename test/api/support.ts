import { type AppConfig, createApp } from "../../src/app";
import { db } from "../../src/db/client";

/** A clock tests can move; noon in Lima on the given business day. */
export const clock = {
	now: new Date(),
	set(day: string) {
		this.now = new Date(`${day}T17:00:00Z`);
	},
};

export const buildApp = (config: Partial<AppConfig> = {}) =>
	createApp({ db, now: () => clock.now, ...config });

type App = { handle(request: Request): Promise<Response> };

/** A tiny HTTP client bound to one app and, optionally, one device token. */
export function client(app: App, token?: string) {
	const call = async (method: string, path: string, body?: unknown) => {
		const headers = new Headers();
		if (token) headers.set("authorization", `Bearer ${token}`);
		if (body !== undefined) headers.set("content-type", "application/json");
		const response = await app.handle(
			new Request(`http://kilo.test${path}`, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
			}),
		);
		const text = await response.text();
		const json = response.headers.get("content-type")?.includes("json");
		// biome-ignore lint/suspicious/noExplicitAny: tests read arbitrary JSON
		const parsed: any = json ? JSON.parse(text) : text;
		return { status: response.status, body: parsed };
	};
	return {
		get: (path: string) => call("GET", path),
		post: (path: string, body?: unknown) => call("POST", path, body),
		patch: (path: string, body: unknown) => call("PATCH", path, body),
		put: (path: string, body: unknown) => call("PUT", path, body),
	};
}

/** Registers a fresh restaurant and returns a client that acts as it. */
export async function register(app: App = buildApp(), name = "Doña Rosa") {
	const { body } = await client(app).post("/restaurants", { name });
	return client(app, body.token as string);
}
