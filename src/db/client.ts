import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const url = Bun.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const relations = defineRelations(schema, () => ({}));
export const db = drizzle(url, { relations });
