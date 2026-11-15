import { SQL } from "bun";

const {
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_DB,
	DB_HOST_PORT = "5433",
} = Bun.env;
const server = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_HOST_PORT}`;
const TEST_DB = "kilo_test";

const admin = new SQL(`${server}/${POSTGRES_DB}`);
await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
await admin.close();

Bun.env.DATABASE_URL = `${server}/${TEST_DB}`;

const { migrate } = await import("drizzle-orm/bun-sql/migrator");
const { db } = await import("../src/db/client");
await migrate(db, { migrationsFolder: "./drizzle" });
