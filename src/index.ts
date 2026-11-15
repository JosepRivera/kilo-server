import { createApp } from "./app";
import { db } from "./db/client";
import { createVoiceGateway } from "./voice/gateway";

const PORT = 3000;
const inviteCode = Bun.env.INVITE_CODE || undefined;
const voice = createVoiceGateway({
	groqApiKey: Bun.env.GROQ_API_KEY,
	anthropicApiKey: Bun.env.ANTHROPIC_API_KEY,
});

if (!inviteCode) {
	console.warn("INVITE_CODE is not set: anyone can register a restaurant");
}
if (!voice) {
	console.warn("GROQ_API_KEY or ANTHROPIC_API_KEY is not set: voice is off");
}

createApp({ db, now: () => new Date(), inviteCode, voice }).listen(PORT);

console.log(`Kilo API on http://localhost:${Bun.env.API_HOST_PORT ?? PORT}`);
