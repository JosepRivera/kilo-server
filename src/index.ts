import { createApp } from "./app";
import { db } from "./db/client";

const PORT = 3000;
const inviteCode = Bun.env.INVITE_CODE || undefined;

if (!inviteCode) {
	console.warn("INVITE_CODE is not set: anyone can register a restaurant");
}

createApp({ db, now: () => new Date(), inviteCode }).listen(PORT);

console.log(`Kilo API on http://localhost:${Bun.env.API_HOST_PORT ?? PORT}`);
