import { describe, expect, test } from "bun:test";
import { buildApp, client, register } from "./support";

describe("registering", () => {
	test("returns a token once and seeds the category template", async () => {
		const app = buildApp();
		const { status, body } = await client(app).post("/restaurants", {
			name: "Doña Rosa",
		});
		expect(status).toBe(201);
		expect(body.token).toBeString();
		expect(Object.keys(body.restaurant).sort()).toEqual([
			"closedWeekdays",
			"id",
			"name",
		]);

		const categories = await client(app, body.token).get("/categories");
		expect(categories.body).toHaveLength(7);
		expect(categories.body[0]).toEqual({
			id: expect.any(String),
			name: "Bebidas",
			purchaseIntervalDays: 7,
			monthlySpend: 0,
			critical: false,
		});
	});

	test("requires the invite code when one is configured", async () => {
		const app = client(buildApp({ inviteCode: "piloto" }));
		expect((await app.post("/restaurants", { name: "A" })).status).toBe(403);
		expect(
			(await app.post("/restaurants", { name: "A", inviteCode: "otro" }))
				.status,
		).toBe(403);
		expect(
			(await app.post("/restaurants", { name: "A", inviteCode: "piloto" }))
				.status,
		).toBe(201);
	});

	test("rejects an empty name", async () => {
		const { status } = await client(buildApp()).post("/restaurants", {
			name: "",
		});
		expect(status).toBe(422);
	});
});

describe("access", () => {
	test("every other route needs a valid token", async () => {
		const app = buildApp();
		for (const path of ["/restaurant", "/supplies", "/today", "/savings"]) {
			expect((await client(app).get(path)).status).toBe(401);
			expect((await client(app, "not-a-token").get(path)).status).toBe(401);
		}
		expect((await client(app).get("/health")).status).toBe(200);
	});

	test("a restaurant cannot read or write another one's supplies", async () => {
		const app = buildApp();
		const rosa = await register(app);
		const other = await register(app, "La Cusqueñita");
		const { body: supply } = await rosa.post("/supplies", {
			name: "Pollo entero",
		});

		expect((await other.get("/supplies")).body).toEqual([]);
		expect((await other.get(`/supplies/${supply.id}`)).status).toBe(404);
		expect(
			(await other.patch(`/supplies/${supply.id}`, { critical: false })).status,
		).toBe(404);
		expect(
			(
				await other.put(`/supplies/${supply.id}/phrases`, {
					phrase: "una jaba",
					amount: 20,
				})
			).status,
		).toBe(404);
		expect(
			(await other.post("/stock-close", { remaining: { [supply.id]: 1 } }))
				.status,
		).toBe(422);
		expect(
			(
				await other.post("/purchases", {
					lines: [{ supplyId: supply.id, quantity: 1, cost: 1 }],
				})
			).status,
		).toBe(422);
		expect((await rosa.get(`/supplies/${supply.id}`)).body.stock).toBe(0);
	});
});

describe("settings", () => {
	test("renames the restaurant and sets the weekdays it is closed", async () => {
		const rosa = await register();
		const { body } = await rosa.patch("/restaurant", { closedWeekdays: [7] });
		expect(body).toMatchObject({ name: "Doña Rosa", closedWeekdays: [7] });
		expect((await rosa.get("/restaurant")).body.closedWeekdays).toEqual([7]);
		expect(
			(await rosa.patch("/restaurant", { closedWeekdays: [8] })).status,
		).toBe(422);
	});

	test("declares the purchase interval and monthly spend per category", async () => {
		const rosa = await register();
		const [first] = (await rosa.get("/categories")).body;
		const { body } = await rosa.patch(`/categories/${first.id}`, {
			purchaseIntervalDays: 5,
			monthlySpend: 420.5,
		});
		expect(body).toMatchObject({
			purchaseIntervalDays: 5,
			monthlySpend: 420.5,
		});
		expect(
			(await rosa.patch(`/categories/${first.id}`, { purchaseIntervalDays: 0 }))
				.status,
		).toBe(422);
	});

	test("adds a category of its own, once", async () => {
		const rosa = await register();
		const mariscos = {
			name: "Mariscos",
			purchaseIntervalDays: 2,
			monthlySpend: 800,
			critical: true,
		};
		expect((await rosa.post("/categories", mariscos)).status).toBe(201);
		expect((await rosa.post("/categories", mariscos)).status).toBe(409);
	});
});

test("serves the OpenAPI document", async () => {
	const { body } = await client(buildApp()).get("/openapi/json");
	expect(Object.keys(body.paths)).toContain("/today");
});
