import Anthropic from "@anthropic-ai/sdk";
import { claudeExtractor } from "./claude-extractor";
import type { Extractor } from "./extraction";
import { groqExtractor } from "./groq-extractor";
import { groqTranscriber, type Transcriber } from "./transcriber";

export type VoiceGateway = {
	transcribe: Transcriber;
	extract: Extractor;
};

type VoiceKeys = {
	groqApiKey?: string;
	anthropicApiKey?: string;
};

export function createVoiceGateway({
	groqApiKey,
	anthropicApiKey,
}: VoiceKeys): VoiceGateway | undefined {
	if (!groqApiKey) return undefined;
	return {
		transcribe: groqTranscriber(groqApiKey),
		extract: anthropicApiKey
			? claudeExtractor(new Anthropic({ apiKey: anthropicApiKey }).messages)
			: groqExtractor(groqApiKey),
	};
}
