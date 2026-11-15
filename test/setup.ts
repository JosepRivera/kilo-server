import { SQL } from "bun";
import { localDatabaseUrl } from "../scripts/local-database";

const TEST_DATABASE = "kilo_test";

const admin = new SQL(localDatabaseUrl());
await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DATABASE} WITH (FORCE)`);
await admin.unsafe(`CREATE DATABASE ${TEST_DATABASE}`);
await admin.close();

Bun.env.DATABASE_URL = localDatabaseUrl(TEST_DATABASE);

const { migrate } = await import("drizzle-orm/bun-sql/migrator");
const { db } = await import("../src/db/client");
await migrate(db, { migrationsFolder: "./drizzle" });
