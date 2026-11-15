const DEFAULT_HOST_PORT = "5433";

export function localDatabaseUrl(database = Bun.env.POSTGRES_DB): string {
	const { POSTGRES_USER, POSTGRES_PASSWORD, DB_HOST_PORT } = Bun.env;
	return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_HOST_PORT ?? DEFAULT_HOST_PORT}/${database}`;
}
