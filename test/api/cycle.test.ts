import { beforeEach, describe, expect, test } from "bun:test";
import { addDays } from "../../src/domain/day";
import { clock, register } from "./support";

// 2026-11-09 is a Monday.
const MON = "2026-11-09";
const day = (offset: number) => addDays(MON, offset);

beforeEach(() => clock.set(MON));

describe("supplies", () => {
	test("a catalog name fills in unit, category, shelf life and icon", async () => {
		const rosa = await register();
		const { status, body } = await rosa.post("/supplies", {
			name: "pollo entero",
		});
		expect(status).toBe(201);
		expect(body).toMatchObject({
			name: "Pollo entero",
			unit: "kg",
			icon: "chicken",
			shelfLifeDays: 3,
			critical: true,
			stock: 0,
			realDays: 0,
			learning: true,
			dueForClose: true,
			closeCheck: null,
			priceCheck: null,
		});
		const categories = (await rosa.get("/categories")).body;
		expect(
			categories.find((c: { id: string }) => c.id === body.categoryId).name,
		).toBe("Proteínas");
	});

	test("adding the same supply twice returns the first one", async () => {
		const rosa = await register();
		const first = await rosa.post("/supplies", { name: "Tomate" });
		const again = await rosa.post("/supplies", { name: "tomates" });
		expect(again.status).toBe(200);
		expect(again.body.id).toBe(first.body.id);
		expect((await rosa.get("/supplies")).body).toHaveLength(1);
	});

	test("a supply outside the catalog needs a unit and a category", async () => {
		const rosa = await register();
		expect((await rosa.post("/supplies", { name: "Huacatay" })).status).toBe(
			422,
		);
		expect(
			(await rosa.post("/supplies", { name: "Huacatay", unit: "atados" }))
				.status,
		).toBe(422);
		const [category] = (await rosa.get("/categories")).body;
		const { status, body } = await rosa.post("/supplies", {
			name: "Huacatay",
			unit: "atados",
			categoryId: category.id,
			referencePrice: 2,
		});
		expect(status).toBe(201);
		expect(body).toMatchObject({
			unit: "atados",
			icon: null,
			referencePrice: 2,
		});
	});

	test("resolves a spoken name against its supplies and the catalog", async () => {
		const rosa = await register();
		const { body: tomato } = await rosa.post("/supplies", { name: "Tomate" });

		const exact = await rosa.get("/catalog/resolve?term=tomates");
		expect(exact.body).toMatchObject({
			kind: "exact",
			candidate: { supplyId: tomato.id },
		});
		const ambiguous = await rosa.get(
			`/catalog/resolve?term=${encodeURI("limón")}`,
		);
		expect(ambiguous.body.candidates).toHaveLength(3);
		const unknown = await rosa.get("/catalog/resolve?term=huacatay");
		expect(unknown.body).toEqual({ kind: "unknown" });
	});

	test("remembers a spoken measure and the critical flag", async () => {
		const rosa = await register();
		const { body: tomato } = await rosa.post("/supplies", { name: "Tomate" });
		const path = `/supplies/${tomato.id}`;

		expect(
			(await rosa.put(`${path}/phrases`, { phrase: "Medio balde", amount: 6 }))
				.status,
		).toBe(204);
		expect(
			(await rosa.put(`${path}/phrases`, { phrase: "medio balde", amount: 7 }))
				.status,
		).toBe(204);
		expect((await rosa.patch(path, { critical: false })).status).toBe(204);

		const { body } = await rosa.get(path);
		expect(body.phrases).toEqual({ "medio balde": 7 });
		expect(body.critical).toBe(false);
	});
});

describe("the daily cycle", () => {
	const setup = async () => {
		const rosa = await register();
		const { body: chicken } = await rosa.post("/supplies", {
			name: "Pollo entero",
		});
		const id = chicken.id as string;
		const close = (remaining: number) =>
			rosa.post("/stock-close", { remaining: { [id]: remaining } });
		const buy = (quantity: number, cost = quantity * 10, expiresOn?: string) =>
			rosa.post("/purchases", {
				lines: [{ supplyId: id, quantity, cost, expiresOn }],
			});
		const detail = async () => (await rosa.get(`/supplies/${id}`)).body;
		return { rosa, id, close, buy, detail };
	};

	test("the first count is day 0, and each close after it yields consumption", async () => {
		const { close, buy, detail } = await setup();
		expect((await close(15)).status).toBe(204);

		clock.set(day(1));
		expect((await buy(10)).body).toEqual({ lots: 1 });
		await close(20);

		clock.set(day(2));
		const supply = await detail();
		expect(supply.stock).toBe(20);
		expect(supply.realDays).toBe(1);
		expect(supply.recent[0]).toEqual({ day: day(1), amount: 5, kind: "real" });
		expect(supply.recent[1]).toMatchObject({ day: MON, kind: "missing" });
		expect(supply.week).toHaveLength(7);
		expect(supply.lots).toEqual([
			{
				id: expect.any(String),
				purchasedOn: day(1),
				expiresOn: day(4),
				remaining: 10,
				daysLeft: 2,
			},
		]);
	});

	test("dictating again the same night corrects the count", async () => {
		const { close, detail } = await setup();
		await close(15);
		await close(12);
		expect((await detail()).stock).toBe(12);
	});

	test("a forgotten stretch is estimated and a planned closure is not", async () => {
		const { rosa, close, detail } = await setup();
		await close(15);
		clock.set(day(1));
		expect((await rosa.post("/stock-close/none")).status).toBe(204);
		clock.set(day(4));
		await close(9);

		clock.set(day(5));
		const kinds = (await detail()).recent
			.slice(0, 4)
			.map((r: { kind: string; amount: number }) => [r.kind, r.amount]);
		expect(kinds).toEqual([
			["estimated", 2],
			["estimated", 2],
			["estimated", 2],
			["closed", 0],
		]);
	});

	test("a close dictated after midnight still counts for the day ending", async () => {
		const { close, detail } = await setup();
		// 01:00 on Tuesday in Lima.
		clock.now = new Date(`${day(1)}T06:00:00Z`);
		await close(15);
		clock.set(day(1));
		const supply = await detail();
		expect(supply.stock).toBe(15);
		expect(supply.recent[0]).toMatchObject({ day: MON, kind: "missing" });
	});

	test("rejects impossible quantities", async () => {
		const { close, buy, rosa } = await setup();
		expect((await close(-1)).status).toBe(422);
		expect((await buy(0)).status).toBe(422);
		expect((await rosa.post("/stock-close", { remaining: {} })).status).toBe(
			422,
		);
	});

	test("Today lists what to buy, then marks it bought and covered", async () => {
		const { rosa, id, close, buy } = await setup();
		const [protein] = (await rosa.get("/categories")).body.filter(
			(c: { name: string }) => c.name === "Proteínas",
		);
		await rosa.patch(`/categories/${protein.id}`, { monthlySpend: 2850 });
		await close(2);

		clock.set(day(1));
		const before = (await rosa.get("/today")).body;
		expect(before.day).toBe(day(1));
		expect(before.covered).toEqual([]);
		expect(before.toBuy).toHaveLength(1);
		const [line] = before.toBuy;
		expect(line.supply.id).toBe(id);
		expect(line.bought).toBe(false);
		// S/2850 a month on one supply at S/9.50 is 10 kg a day, for 3 days.
		expect(line.recommendation.demand).toBeCloseTo(30);
		expect(line.recommendation.horizonDays).toBe(3);
		expect(line.recommendation.toBuy).toBeGreaterThan(28);

		await buy(line.recommendation.toBuy);
		const after = (await rosa.get("/today")).body;
		expect(after.toBuy).toEqual([]);
		expect(after.covered.map((s: { id: string }) => s.id)).toEqual([id]);
	});

	test("Today warns about the lot that expires, most urgent first", async () => {
		const { rosa, buy } = await setup();
		await buy(10, 100, day(1));
		await buy(4, 40, day(5));

		clock.set(day(1));
		const { alerts } = (await rosa.get("/today")).body;
		expect(alerts).toHaveLength(1);
		expect(alerts[0]).toMatchObject({
			daysLeft: 0,
			remaining: 10,
			lots: [{ purchasedOn: MON, remaining: 10, daysLeft: 0 }],
		});
		expect(alerts[0].supply.expiresInDays).toBe(0);
	});

	test("flags come with the numbers the review screen needs", async () => {
		const { close, buy, detail } = await setup();
		await close(40);
		for (let i = 1; i <= 14; i++) {
			clock.set(day(i));
			await buy(4, 40, day(i + 30));
			await close(40);
		}
		clock.set(day(15));
		const supply = await detail();
		// Usual 4 kg a day: review a close that implies more than 12 kg.
		expect(supply.closeCheck).toEqual({
			base: 40,
			gapDays: 1,
			usual: 4,
			reviewBelow: 28,
		});
		expect(supply.priceCheck.usual).toBe(10);
		expect(supply.expectedRemaining % 0.5).toBe(0);
	});

	test("savings compare this month's expired stock with last month's", async () => {
		const { rosa, buy } = await setup();
		clock.set("2026-10-20");
		await buy(5, 60, "2026-10-22");
		clock.set("2026-11-03");
		await buy(4, 40, "2026-11-05");

		clock.set("2026-11-10");
		const { body } = await rosa.get("/savings");
		expect(body.months).toEqual([
			{ month: "2026-08", soles: 0 },
			{ month: "2026-09", soles: 0 },
			{ month: "2026-10", soles: 60 },
			{ month: "2026-11", soles: 40 },
		]);
		expect(body.current).toBe(40);
		expect(body.previous).toBe(60);
		expect(body.topWasted).toHaveLength(1);
		expect(body.topWasted[0].soles).toBe(40);
	});
});
