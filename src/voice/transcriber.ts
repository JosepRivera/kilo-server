import { VoiceGatewayError } from "./errors";

const GROQ_TRANSCRIPTIONS_URL =
	"https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3-turbo";
const LANGUAGE = "es";

export type Transcriber = (
	audio: File,
	vocabulary: string[],
) => Promise<string>;

export const groqTranscriber =
	(apiKey: string, request: typeof fetch = fetch): Transcriber =>
	async (audio, vocabulary) => {
		const form = new FormData();
		form.set("file", audio, audio.name);
		form.set("model", MODEL);
		form.set("language", LANGUAGE);
		form.set("response_format", "json");
		if (vocabulary.length > 0) form.set("prompt", vocabulary.join(", "));

		const response = await request(GROQ_TRANSCRIPTIONS_URL, {
			method: "POST",
			headers: { authorization: `Bearer ${apiKey}` },
			body: form,
		});
		if (!response.ok) {
			throw new VoiceGatewayError(
				`Transcription failed with status ${response.status}`,
			);
		}
		const { text } = (await response.json()) as { text?: string };
		return (text ?? "").trim();
	};
