import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	numeric,
	primaryKey,
	smallint,
	snakeCase,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

const { table } = snakeCase;

const id = () => uuid().primaryKey().defaultRandom();
const quantity = () => numeric({ precision: 12, scale: 3, mode: "number" });
const soles = () => numeric({ precision: 12, scale: 2, mode: "number" });
const day = () => date({ mode: "string" });

export const restaurants = table("restaurants", {
	id: id(),
	name: text().notNull(),
	tokenHash: text().notNull().unique(),
	closedWeekdays: smallint().array().notNull().default([]),
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const categories = table(
	"categories",
	{
		id: id(),
		restaurantId: uuid()
			.notNull()
			.references(() => restaurants.id, { onDelete: "cascade" }),
		key: text(),
		name: text().notNull(),
		purchaseIntervalDays: integer().notNull(),
		monthlySpend: soles().notNull().default(0),
		critical: boolean().notNull(),
	},
	(t) => [
		unique().on(t.restaurantId, t.name),
		check("categories_interval_positive", sql`${t.purchaseIntervalDays} > 0`),
	],
);

export const supplies = table(
	"supplies",
	{
		id: id(),
		restaurantId: uuid()
			.notNull()
			.references(() => restaurants.id, { onDelete: "cascade" }),
		categoryId: uuid()
			.notNull()
			.references(() => categories.id),
		name: text().notNull(),
		unit: text().notNull(),
		shelfLifeDays: integer().notNull(),
		referencePrice: soles().notNull(),
		icon: text(),
		critical: boolean().notNull(),
	},
	(t) => [unique().on(t.restaurantId, t.name)],
);

export const supplyPhrases = table(
	"supply_phrases",
	{
		supplyId: uuid()
			.notNull()
			.references(() => supplies.id, { onDelete: "cascade" }),
		phrase: text().notNull(),
		amount: quantity().notNull(),
	},
	(t) => [primaryKey({ columns: [t.supplyId, t.phrase] })],
);

export const stockRecords = table(
	"stock_records",
	{
		supplyId: uuid()
			.notNull()
			.references(() => supplies.id, { onDelete: "cascade" }),
		day: day().notNull(),
		remaining: quantity(),
	},
	(t) => [primaryKey({ columns: [t.supplyId, t.day] })],
);

export const lots = table(
	"lots",
	{
		id: id(),
		supplyId: uuid()
			.notNull()
			.references(() => supplies.id, { onDelete: "cascade" }),
		purchasedOn: day().notNull(),
		quantity: quantity().notNull(),
		cost: soles().notNull(),
		expiresOn: day().notNull(),
	},
	(t) => [
		index().on(t.supplyId, t.purchasedOn),
		check("lots_quantity_positive", sql`${t.quantity} > 0`),
	],
);
