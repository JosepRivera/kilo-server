import { expect, test } from "bun:test";
import { VoiceGatewayError } from "../../src/voice/errors";
import type { ExtractionRequest } from "../../src/voice/extraction";
import { groqExtractor } from "../../src/voice/groq-extractor";
import { buildExtractionPrompt } from "../../src/voice/prompt";

const request: ExtractionRequest = {
	kind: "purchase",
	transcript: "compré diez kilos de pollo a nueve cincuenta",
	supplies: [
		{ name: "Pollo entero", unit: "kg", expectedRemaining: 3, phrases: [] },
	],
};

const item = {
	name: "Pollo entero",
	quantity: 10,
	phrase: null,
	cost: 95,
	suggestedQuantity: null,
};

const completion = (content: string | null, finish_reason = "stop") =>
	Response.json({ choices: [{ finish_reason, message: { content } }] });

const respondWith = (response: Response) => {
	const bodies: unknown[] = [];
	const request = (async (...args: ConstructorParameters<typeof Request>) => {
		const sent = new Request(...args);
		bodies.push({
			url: sent.url,
			authorization: sent.headers.get("authorization"),
			body: await sent.json(),
		});
		return response;
	}) as typeof fetch;
	return { request, bodies };
};

test("asks gpt-oss on Groq for strict JSON items and returns them", async () => {
	const { request: fetcher, bodies } = respondWith(
		completion(JSON.stringify({ items: [item] })),
	);
	expect(await groqExtractor("secret", fetcher)(request)).toEqual([item]);
	expect(bodies[0]).toMatchObject({
		url: "https://api.groq.com/openai/v1/chat/completions",
		authorization: "Bearer secret",
		body: {
			model: "openai/gpt-oss-120b",
			messages: [
				{ role: "system" },
				{ role: "user", content: buildExtractionPrompt(request) },
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					strict: true,
					schema: { type: "object", required: ["items"] },
				},
			},
		},
	});
});

test("a failed, truncated or malformed answer is a gateway error", async () => {
	const failures = [
		new Response("busy", { status: 503 }),
		completion(JSON.stringify({ items: [item] }), "length"),
		completion(null),
		completion(JSON.stringify({ items: [{ name: "Pollo entero" }] })),
		Response.json({ choices: [] }),
	];
	for (const failure of failures) {
		const { request: fetcher } = respondWith(failure);
		expect(groqExtractor("secret", fetcher)(request)).rejects.toBeInstanceOf(
			VoiceGatewayError,
		);
	}
});
