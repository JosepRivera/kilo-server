import { beforeEach, expect, test } from "bun:test";
import { VoiceGatewayError } from "../../src/voice/errors";
import type { ExtractionRequest } from "../../src/voice/extraction";
import type { VoiceGateway } from "../../src/voice/gateway";
import { buildApp, clock, register } from "./support";

const MON = "2026-11-09";

beforeEach(() => clock.set(MON));

const fakeVoice = (over: Partial<VoiceGateway> = {}) => {
	const seen: { vocabulary?: string[]; extraction?: ExtractionRequest } = {};
	const gateway: VoiceGateway = {
		transcribe: async (_audio, vocabulary) => {
			seen.vocabulary = vocabulary;
			return "quedan trece kilos de pollo y medio balde de tomate";
		},
		extract: async (request) => {
			seen.extraction = request;
			return [
				{
					name: "Pollo entero",
					quantity: 13,
					phrase: null,
					cost: null,
					suggestedQuantity: 3,
				},
				{
					name: "Tomate",
					quantity: null,
					phrase: "medio balde",
					cost: null,
					suggestedQuantity: null,
				},
			];
		},
		...over,
	};
	return { gateway, seen };
};

const dictation = (fields: Record<string, string | File>) => {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.set(key, value);
	return form;
};

const audio = () => new File(["sound"], "cierre.m4a", { type: "audio/mp4" });

const kitchenWithVoice = async (voice?: VoiceGateway) => {
	const rosa = await register(buildApp({ voice }));
	const { body: chicken } = await rosa.post("/supplies", {
		name: "Pollo entero",
	});
	const { body: tomato } = await rosa.post("/supplies", { name: "Tomate" });
	return { rosa, chicken, tomato };
};

test("an audio becomes a draft: transcript, resolved supplies and suggestions", async () => {
	const { gateway, seen } = fakeVoice();
	const { rosa, chicken, tomato } = await kitchenWithVoice(gateway);
	await rosa.put(`/supplies/${tomato.id}/phrases`, {
		phrase: "medio balde",
		amount: 6,
	});

	const { status, body } = await rosa.postForm(
		"/voice",
		dictation({ kind: "close", audio: audio() }),
	);

	expect(status).toBe(200);
	expect(body.transcript).toBe(
		"quedan trece kilos de pollo y medio balde de tomate",
	);
	expect(body.items).toEqual([
		{
			spoken: "Pollo entero",
			resolution: {
				kind: "exact",
				candidate: {
					supplyId: chicken.id,
					name: "Pollo entero",
					unit: "kg",
					category: null,
				},
			},
			quantity: 13,
			phrase: null,
			cost: null,
			suggestedQuantity: 3,
		},
		{
			spoken: "Tomate",
			resolution: expect.objectContaining({ kind: "exact" }),
			quantity: 6,
			phrase: null,
			cost: null,
			suggestedQuantity: null,
		},
	]);
	expect(seen.vocabulary).toEqual(["Pollo entero", "Tomate"]);
	expect(seen.extraction).toMatchObject({
		kind: "close",
		supplies: [
			{ name: "Pollo entero", unit: "kg", phrases: [] },
			{ name: "Tomate", unit: "kg", phrases: ["medio balde"] },
		],
	});
});

test("a typed dictation skips the transcription", async () => {
	const { gateway, seen } = fakeVoice({
		transcribe: async () => {
			throw new Error("must not transcribe text");
		},
	});
	const { rosa } = await kitchenWithVoice(gateway);
	const { status, body } = await rosa.postForm(
		"/voice",
		dictation({ kind: "purchase", text: "compré diez kilos de pollo" }),
	);
	expect(status).toBe(200);
	expect(body.transcript).toBe("compré diez kilos de pollo");
	expect(seen.extraction?.kind).toBe("purchase");
});

test("nothing is saved by a dictation", async () => {
	const { gateway } = fakeVoice();
	const { rosa, chicken } = await kitchenWithVoice(gateway);
	await rosa.postForm("/voice", dictation({ kind: "close", audio: audio() }));
	expect((await rosa.get(`/supplies/${chicken.id}`)).body.stock).toBe(0);
});

test("silence yields an empty draft without calling the extractor", async () => {
	const { gateway, seen } = fakeVoice({ transcribe: async () => "" });
	const { rosa } = await kitchenWithVoice(gateway);
	const { body } = await rosa.postForm(
		"/voice",
		dictation({ kind: "close", audio: audio() }),
	);
	expect(body).toEqual({ transcript: "", items: [] });
	expect(seen.extraction).toBeUndefined();
});

test("answers 503 when voice is not configured", async () => {
	const { rosa } = await kitchenWithVoice();
	const { status } = await rosa.postForm(
		"/voice",
		dictation({ kind: "close", text: "quedan tres kilos de pollo" }),
	);
	expect(status).toBe(503);
});

test("needs an audio or a text, and a valid kind", async () => {
	const { gateway } = fakeVoice();
	const { rosa } = await kitchenWithVoice(gateway);
	expect(
		(await rosa.postForm("/voice", dictation({ kind: "close" }))).status,
	).toBe(422);
	expect(
		(await rosa.postForm("/voice", dictation({ kind: "sale", text: "x" })))
			.status,
	).toBe(422);
});

test("a provider failure is a 502 the app can retry", async () => {
	const { gateway } = fakeVoice({
		extract: async () => {
			throw new VoiceGatewayError("overloaded");
		},
	});
	const { rosa } = await kitchenWithVoice(gateway);
	const { status } = await rosa.postForm(
		"/voice",
		dictation({ kind: "close", text: "quedan tres kilos de pollo" }),
	);
	expect(status).toBe(502);
});

test("requires the device token", async () => {
	const { gateway } = fakeVoice();
	const app = buildApp({ voice: gateway });
	const response = await app.handle(
		new Request("http://kilo.test/voice", {
			method: "POST",
			body: dictation({ kind: "close", text: "hola" }),
		}),
	);
	expect(response.status).toBe(401);
});
