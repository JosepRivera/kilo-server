import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { VoiceGatewayError } from "./errors";
import { type Extractor, extractionSchema } from "./extraction";
import { buildExtractionPrompt, EXTRACTION_SYSTEM_PROMPT } from "./prompt";

const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 8000;

type MessagesClient = Pick<Anthropic["messages"], "parse">;

export const claudeExtractor =
	(messages: MessagesClient): Extractor =>
	async (request) => {
		try {
			const response = await messages.parse({
				model: MODEL,
				max_tokens: MAX_TOKENS,
				system: EXTRACTION_SYSTEM_PROMPT,
				messages: [{ role: "user", content: buildExtractionPrompt(request) }],
				output_config: {
					effort: "low",
					format: zodOutputFormat(extractionSchema),
				},
			});
			if (response.stop_reason !== "end_turn" || !response.parsed_output) {
				throw new VoiceGatewayError(
					`Extraction stopped with ${response.stop_reason}`,
				);
			}
			return response.parsed_output.items;
		} catch (error) {
			if (error instanceof Anthropic.APIError) {
				throw new VoiceGatewayError(
					`Extraction failed with status ${error.status}`,
					{ cause: error },
				);
			}
			throw error;
		}
	};
