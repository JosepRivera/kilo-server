import { expect, test } from "bun:test";
import { createVoiceGateway } from "../../src/voice/gateway";

test("voice is off without a Groq key", () => {
	expect(createVoiceGateway({ anthropicApiKey: "a" })).toBeUndefined();
	expect(createVoiceGateway({})).toBeUndefined();
});

test("a Groq key alone is enough to turn voice on", () => {
	expect(createVoiceGateway({ groqApiKey: "g" })).toEqual({
		transcribe: expect.any(Function),
		extract: expect.any(Function),
	});
});
