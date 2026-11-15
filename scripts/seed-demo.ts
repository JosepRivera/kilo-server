import { desc, eq } from "drizzle-orm";
import {
	categories,
	lots,
	restaurants,
	stockRecords,
	supplies,
} from "../src/db/schema";
import { findCatalogEntry } from "../src/domain/catalog/master-catalog";
import { businessDay } from "../src/domain/day";
import { seededRandom, simulateHistory } from "./demo-history";
import { localDatabaseUrl } from "./local-database";

Bun.env.DATABASE_URL ??= localDatabaseUrl();
const { db } = await import("../src/db/client");

const HISTORY_DAYS = 42;
const SEED = 2026;

const DAILY_USE: Record<string, number> = {
	"Pollo entero": 9,
	"Carne de res": 3.5,
	"Pescado bonito": 4,
	"Papa canchán": 12,
	"Cebolla roja": 5,
	Tomate: 4,
	"Limón sutil": 3,
	"Ají amarillo": 1.5,
	Culantro: 4,
	Huevos: 40,
	"Queso fresco": 1.5,
	Arroz: 8,
	"Aceite vegetal": 2,
	Sal: 0.5,
};

const MONTHLY_SPEND: Record<string, number> = {
	protein: 5200,
	produce: 2400,
	dairy: 900,
	grocery: 1500,
	seasoning: 120,
};

async function findRestaurant(name: string | undefined) {
	const query = db.select().from(restaurants);
	const [restaurant] = await (name
		? query.where(eq(restaurants.name, name))
		: query
	)
		.orderBy(desc(restaurants.createdAt))
		.limit(1);
	if (!restaurant) throw new Error("Register a restaurant in the app first");
	return restaurant;
}

async function declareSpend(restaurantId: string) {
	const own = await db
		.select()
		.from(categories)
		.where(eq(categories.restaurantId, restaurantId));
	for (const category of own) {
		const monthlySpend = category.key ? MONTHLY_SPEND[category.key] : undefined;
		if (monthlySpend === undefined) continue;
		await db
			.update(categories)
			.set({ monthlySpend })
			.where(eq(categories.id, category.id));
	}
	return own;
}

async function seedSupply(
	restaurantId: string,
	category: typeof categories.$inferSelect,
	name: string,
	dailyUse: number,
	today: string,
	random: () => number,
) {
	const entry = findCatalogEntry(name);
	if (!entry) throw new Error(`${name} is not in the master catalog`);
	const [supply] = await db
		.insert(supplies)
		.values({
			restaurantId,
			categoryId: category.id,
			name: entry.name,
			unit: entry.unit,
			shelfLifeDays: entry.shelfLifeDays,
			referencePrice: entry.referencePrice,
			icon: entry.icon ?? null,
			critical: category.critical,
		})
		.returning({ id: supplies.id });
	if (!supply) throw new Error(`${name} was not created`);

	const history = simulateHistory(
		{ ...entry, dailyUse, purchaseIntervalDays: category.purchaseIntervalDays },
		today,
		HISTORY_DAYS,
		random,
	);
	await db
		.insert(stockRecords)
		.values(history.counts.map((count) => ({ ...count, supplyId: supply.id })));
	await db
		.insert(lots)
		.values(history.lots.map((lot) => ({ ...lot, supplyId: supply.id })));
}

const restaurant = await findRestaurant(Bun.argv[2]);
await db.delete(supplies).where(eq(supplies.restaurantId, restaurant.id));
const ownCategories = await declareSpend(restaurant.id);
const today = businessDay(new Date());
const random = seededRandom(SEED);

for (const [name, dailyUse] of Object.entries(DAILY_USE)) {
	const key = findCatalogEntry(name)?.category;
	const category = ownCategories.find((c) => c.key === key);
	if (!category) throw new Error(`No category for ${name}`);
	await seedSupply(restaurant.id, category, name, dailyUse, today, random);
}

console.log(
	`Seeded ${Object.keys(DAILY_USE).length} supplies and ${HISTORY_DAYS} days of history for ${restaurant.name}`,
);
process.exit(0);
