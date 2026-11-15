import type { Db } from "./db/client";
import type { VoiceGateway } from "./voice/gateway";

export type Dependencies = {
	db: Db;
	now: () => Date;
	inviteCode?: string;
	voice?: VoiceGateway;
};
