import type { Db } from "./db/client";

export type Dependencies = {
	db: Db;
	now: () => Date;
	inviteCode?: string;
};
