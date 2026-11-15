import { Elysia, t } from "elysia";
import type { Dependencies } from "../../dependencies";
import { VoiceGatewayError } from "../../voice/errors";
import { session } from "../session";
import { dictationBody, draftView } from "./model";
import { voiceService } from "./service";

export const voiceRoutes = (dependencies: Dependencies) => {
	const { db, voice } = dependencies;
	return new Elysia().use(session(dependencies)).post(
		"/voice",
		async ({ restaurant, today, body, status }) => {
			if (!voice) return status(503, "El dictado por voz no está configurado");
			if (!body.audio && !body.text) {
				return status(422, "Envía un audio o un texto");
			}
			try {
				return await voiceService(db, voice).draft(restaurant, today, body);
			} catch (error) {
				if (error instanceof VoiceGatewayError) {
					return status(
						502,
						"No se pudo procesar el dictado, inténtalo otra vez",
					);
				}
				throw error;
			}
		},
		{
			body: dictationBody,
			response: {
				200: draftView,
				422: t.String(),
				502: t.String(),
				503: t.String(),
			},
			detail: { summary: "Turn a dictation into a draft to review" },
		},
	);
};
