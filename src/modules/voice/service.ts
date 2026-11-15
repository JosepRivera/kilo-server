import type { Db } from "../../db/client";
import type { Day } from "../../domain/day";
import type { Engine } from "../../domain/engine";
import { roundToStep } from "../../domain/units";
import type { DictationKind, KnownSupply } from "../../voice/extraction";
import type { VoiceGateway } from "../../voice/gateway";
import { loadEngine } from "../kitchen/repository";
import type { Restaurant } from "../session/service";
import { toDraftItems } from "./draft";

type Dictation = { kind: DictationKind; audio?: File; text?: string };

const knownSupplies = (engine: Engine): KnownSupply[] =>
	engine.supplies.map((supply) => ({
		name: supply.name,
		unit: supply.unit,
		expectedRemaining: roundToStep(
			engine.expectedRemainingTonight(supply.id),
			supply.unit,
		),
		phrases: Object.keys(supply.phrases),
	}));

export const voiceService = (db: Db, gateway: VoiceGateway) => ({
	async draft(restaurant: Restaurant, today: Day, dictation: Dictation) {
		const engine = await loadEngine(db, restaurant, today);
		const supplies = knownSupplies(engine);
		const transcript =
			dictation.text ??
			(dictation.audio
				? await gateway.transcribe(
						dictation.audio,
						supplies.map((supply) => supply.name),
					)
				: "");
		if (!transcript) return { transcript, items: [] };
		const items = await gateway.extract({
			kind: dictation.kind,
			transcript,
			supplies,
		});
		return { transcript, items: toDraftItems(items, engine.supplies) };
	},
});
