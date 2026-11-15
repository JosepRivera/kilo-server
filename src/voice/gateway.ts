import Anthropic from "@anthropic-ai/sdk";
import type { Extractor } from "./extraction";
import { claudeExtractor } from "./extractor";
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
	if (!groqApiKey || !anthropicApiKey) return undefined;
	return {
		transcribe: groqTranscriber(groqApiKey),
		extract: claudeExtractor(
			new Anthropic({ apiKey: anthropicApiKey }).messages,
		),
	};
}
