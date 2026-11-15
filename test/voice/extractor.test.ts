import { expect, test } from "bun:test";
import Anthropic from "@anthropic-ai/sdk";
import { VoiceGatewayError } from "../../src/voice/errors";
import type { ExtractionRequest } from "../../src/voice/extraction";
import { claudeExtractor } from "../../src/voice/extractor";
import { buildExtractionPrompt } from "../../src/voice/prompt";

const request: ExtractionRequest = {
	kind: "close",
	transcript: "quedan trece kilos de pollo",
	supplies: [
		{
			name: "Pollo entero",
			unit: "kg",
			expectedRemaining: 3,
			phrases: ["una jaba"],
		},
	],
};

const item = {
	name: "Pollo entero",
	quantity: 13,
	phrase: null,
	cost: null,
	suggestedQuantity: 3,
};

type Parse = Parameters<typeof claudeExtractor>[0]["parse"];

const messagesReturning = (response: unknown) => {
	const calls: unknown[] = [];
	const parse = (async (params: unknown) => {
		calls.push(params);
		if (response instanceof Error) throw response;
		return response;
	}) as unknown as Parse;
	return { messages: { parse }, calls };
};

test("the prompt carries the kind, the known supplies and the transcript", () => {
	const prompt = buildExtractionPrompt(request);
	expect(prompt).toContain("Tipo de dictado: close");
	expect(prompt).toContain(
		"- Pollo entero (unidad: kg; esperado esta noche: 3; medidas conocidas: una jaba)",
	);
	expect(prompt).toEndWith("quedan trece kilos de pollo");
});

test("asks Claude Haiku for structured items and returns them", async () => {
	const { messages, calls } = messagesReturning({
		stop_reason: "end_turn",
		parsed_output: { items: [item] },
	});
	expect(await claudeExtractor(messages)(request)).toEqual([item]);
	expect(calls[0]).toMatchObject({
		model: "claude-haiku-5-5",
		messages: [{ role: "user", content: buildExtractionPrompt(request) }],
		output_config: { effort: "low" },
	});
});

test("an incomplete or refused answer is a gateway error", async () => {
	for (const stop_reason of ["max_tokens", "refusal"]) {
		const { messages } = messagesReturning({
			stop_reason,
			parsed_output: null,
		});
		expect(claudeExtractor(messages)(request)).rejects.toBeInstanceOf(
			VoiceGatewayError,
		);
	}
});

test("an API failure is a gateway error", async () => {
	const { messages } = messagesReturning(
		new Anthropic.APIError(529, undefined, "overloaded", new Headers()),
	);
	expect(claudeExtractor(messages)(request)).rejects.toBeInstanceOf(
		VoiceGatewayError,
	);
});
