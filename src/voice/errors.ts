export class VoiceGatewayError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "VoiceGatewayError";
	}
}
