import { defineConfig } from "drizzle-kit";

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_HOST_PORT } =
	process.env;
if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB || !DB_HOST_PORT)
	throw new Error("POSTGRES_* and DB_HOST_PORT must be set");

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		host: "localhost",
		port: Number(DB_HOST_PORT),
		user: POSTGRES_USER,
		password: POSTGRES_PASSWORD,
		database: POSTGRES_DB,
		ssl: false,
	},
});
