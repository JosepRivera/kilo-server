import { expect, test } from "bun:test";
import { VoiceGatewayError } from "../../src/voice/errors";
import { groqTranscriber } from "../../src/voice/transcriber";

const audio = new File(["sound"], "cierre.m4a", { type: "audio/mp4" });

const respondWith = (response: Response) => {
	const requests: Request[] = [];
	const request = (async (...args: ConstructorParameters<typeof Request>) => {
		requests.push(new Request(...args));
		return response;
	}) as typeof fetch;
	return { request, requests };
};

test("sends the audio to Groq in Spanish with the supply names as a hint", async () => {
	const { request, requests } = respondWith(
		Response.json({ text: " quedan tres kilos de pollo " }),
	);
	const transcript = await groqTranscriber("secret", request)(audio, [
		"Pollo entero",
		"Tomate",
	]);

	expect(transcript).toBe("quedan tres kilos de pollo");
	const [sent] = requests;
	expect(sent?.url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
	expect(sent?.headers.get("authorization")).toBe("Bearer secret");
	const form = await sent?.formData();
	expect(form?.get("model")).toBe("whisper-large-v3-turbo");
	expect(form?.get("language")).toBe("es");
	expect(form?.get("prompt")).toBe("Pollo entero, Tomate");
	expect(form?.get("file")).toHaveProperty("name", "cierre.m4a");
});

test("fails with a gateway error when Groq rejects the request", async () => {
	const { request } = respondWith(new Response("nope", { status: 429 }));
	expect(groqTranscriber("secret", request)(audio, [])).rejects.toBeInstanceOf(
		VoiceGatewayError,
	);
});
