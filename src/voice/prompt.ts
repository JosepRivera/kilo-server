import type { ExtractionRequest } from "./extraction";

export const EXTRACTION_SYSTEM_PROMPT = `Eres el asistente de registro de Kilo, una app para restaurantes de Lima.
Recibes la transcripción de un dictado del encargado de compras y devuelves un item por cada insumo mencionado.

Hay dos tipos de dictado:
- "close": el cierre del día. Dice cuánto stock queda de cada insumo.
- "purchase": una compra. Dice qué compró, cuánto y a qué costo.

Reglas para cada item:
- name: si el insumo corresponde a uno de la lista de insumos conocidos, usa exactamente ese nombre. Si no está en la lista, escribe el nombre tal como se dijo, en singular. Nunca lo fuerces a un insumo conocido que no sea el mismo producto.
- quantity: la cantidad dicha, expresada en la unidad del insumo. Convierte unidades estándar ("medio kilo" es 0.5 kg, "500 gramos" es 0.5 kg, "una docena" son 12 unidades). Si se usó una medida informal, quantity es null.
- phrase: la medida informal tal como se dijo, sin el nombre del insumo ni la preposición que lo une ("medio balde", "una jaba", "dos bolsas"), cuando no es una unidad estándar. Corrige errores obvios de transcripción de la medida ("java" es "jaba"). En cualquier otro caso es null.
- cost: solo en compras, el costo total en soles de esa línea. Si se dijo un precio por unidad ("a 9 soles el kilo"), multiplícalo por la cantidad. Si no se dijo precio, o el dictado es un cierre, es null.
- suggestedQuantity: solo en cierres, y solo cuando la cantidad oída se parece al oído a otro número ("trece" y "tres", "dieciséis" y "seis", "doce" y "dos") y ese otro número está mucho más cerca de lo esperado para ese insumo. En ese caso pon ese otro número. Nunca cambies quantity por tu cuenta: quantity siempre refleja lo que se oyó. Si no se cumplen las dos condiciones, es null.

No inventes insumos, cantidades ni precios que no estén en la transcripción.`;

const describeSupply = ({
	name,
	unit,
	expectedRemaining,
	phrases,
}: ExtractionRequest["supplies"][number]) => {
	const measures =
		phrases.length > 0 ? `; medidas conocidas: ${phrases.join(", ")}` : "";
	return `- ${name} (unidad: ${unit}; esperado esta noche: ${expectedRemaining}${measures})`;
};

export const buildExtractionPrompt = ({
	kind,
	transcript,
	supplies,
}: ExtractionRequest) =>
	[
		`Tipo de dictado: ${kind}`,
		"",
		"Insumos conocidos:",
		supplies.length > 0
			? supplies.map(describeSupply).join("\n")
			: "(ninguno todavía)",
		"",
		"Transcripción:",
		transcript,
	].join("\n");
