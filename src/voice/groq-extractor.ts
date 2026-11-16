import { z } from "zod";
import { VoiceGatewayError } from "./errors";
import { type Extractor, extractionSchema } from "./extraction";
import { buildExtractionPrompt, EXTRACTION_SYSTEM_PROMPT } from "./prompt";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const MAX_COMPLETION_TOKENS = 8000;

const { $schema: _, ...responseSchema } = z.toJSONSchema(extractionSchema);

const completionSchema = z.object({
	choices: z
		.array(
			z.object({
				finish_reason: z.string(),
				message: z.object({ content: z.string().nullable() }),
			}),
		)
		.min(1),
});

export const groqExtractor =
	(apiKey: string, request: typeof fetch = fetch): Extractor =>
	async (extraction) => {
		const response = await request(GROQ_CHAT_URL, {
			method: "POST",
			headers: {
				authorization: `Bearer ${apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: MODEL,
				max_completion_tokens: MAX_COMPLETION_TOKENS,
				reasoning_effort: "low",
				messages: [
					{ role: "system", content: EXTRACTION_SYSTEM_PROMPT },
					{ role: "user", content: buildExtractionPrompt(extraction) },
				],
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "extraction",
						strict: true,
						schema: responseSchema,
					},
				},
			}),
		});
		if (!response.ok) {
			throw new VoiceGatewayError(
				`Extraction failed with status ${response.status}`,
			);
		}
		const completion = completionSchema.safeParse(await response.json());
		const choice = completion.success ? completion.data.choices[0] : undefined;
		if (choice?.finish_reason !== "stop" || !choice.message.content) {
			throw new VoiceGatewayError("Extraction returned no complete answer");
		}
		const parsed = extractionSchema.safeParse(
			JSON.parse(choice.message.content),
		);
		if (!parsed.success) {
			throw new VoiceGatewayError("Extraction did not match the schema");
		}
		return parsed.data.items;
	};
