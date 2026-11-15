import type { CategoryKey } from "./category-template";
import { normalizeTerm } from "./text";

export type CatalogEntry = {
	name: string;
	unit: string;
	category: CategoryKey;
	shelfLifeDays: number;
	referencePrice: number;
	icon?: string;
	family?: string;
};

const entry = (
	name: string,
	unit: string,
	category: CategoryKey,
	shelfLifeDays: number,
	referencePrice: number,
	icon?: string,
	family?: string,
): CatalogEntry => ({
	name,
	unit,
	category,
	shelfLifeDays,
	referencePrice,
	icon,
	family,
});

export const MASTER_CATALOG: CatalogEntry[] = [
	entry("Pollo entero", "kg", "protein", 3, 9.5, "chicken"),
	entry("Pechuga de pollo", "kg", "protein", 3, 14, "chicken"),
	entry("Carne de res", "kg", "protein", 4, 24, "beef"),
	entry("Lomo fino", "kg", "protein", 4, 48, "beef"),
	entry("Carne de cerdo", "kg", "protein", 4, 16, "beef"),
	entry("Pescado bonito", "kg", "protein", 2, 12, "fish"),
	entry("Pescado jurel", "kg", "protein", 2, 8, "fish"),
	entry("Langostinos", "kg", "protein", 2, 38, "shrimp"),
	entry("Limón sutil", "kg", "produce", 10, 5, "lime", "limon"),
	entry("Limón tahití", "kg", "produce", 14, 4, "lime", "limon"),
	entry("Lima persa", "kg", "produce", 14, 4.5, "lime", "limon"),
	entry("Papa canchán", "kg", "produce", 14, 2, "potato"),
	entry("Papa amarilla", "kg", "produce", 10, 3.5, "potato"),
	entry("Camote", "kg", "produce", 14, 2.2, "potato"),
	entry("Cebolla roja", "kg", "produce", 20, 2.6, "onion"),
	entry("Tomate", "kg", "produce", 6, 3.5, "tomato"),
	entry("Zanahoria", "kg", "produce", 14, 2, "carrot"),
	entry("Ají amarillo", "kg", "produce", 10, 8, "chili"),
	entry("Ají limo", "kg", "produce", 7, 12, "chili"),
	entry("Rocoto", "kg", "produce", 10, 7, "chili"),
	entry("Ajo", "kg", "produce", 30, 12, "garlic"),
	entry("Culantro", "atados", "produce", 3, 2, "cilantro"),
	entry("Perejil", "atados", "produce", 3, 1.5, "cilantro"),
	entry("Choclo", "unidades", "produce", 4, 1.5, "corn"),
	entry("Palta", "kg", "produce", 5, 9, "avocado"),
	entry("Leche evaporada", "unidades", "dairy", 180, 4.2, "milk"),
	entry("Leche fresca", "litros", "dairy", 5, 5, "milk"),
	entry("Queso fresco", "kg", "dairy", 7, 22, "cheese"),
	entry("Mantequilla", "kg", "dairy", 30, 28, "cheese"),
	entry("Huevos", "unidades", "dairy", 21, 0.6, "egg"),
	entry("Pan francés", "unidades", "bakery", 1, 0.3, "bread"),
	entry("Pan de molde", "unidades", "bakery", 6, 8, "bread"),
	entry("Arroz", "kg", "grocery", 180, 4, "rice"),
	entry("Azúcar", "kg", "grocery", 365, 4.2),
	entry("Fideos", "kg", "grocery", 365, 5),
	entry("Lentejas", "kg", "grocery", 365, 8),
	entry("Frejol canario", "kg", "grocery", 365, 9),
	entry("Harina", "kg", "grocery", 180, 3.8),
	entry("Aceite vegetal", "litros", "grocery", 365, 8.5, "oil"),
	entry("Sal", "kg", "seasoning", 730, 1.5, "salt"),
	entry("Pimienta", "kg", "seasoning", 365, 45, "salt"),
	entry("Comino", "kg", "seasoning", 365, 30, "salt"),
	entry("Sillao", "litros", "seasoning", 365, 9),
	entry("Vinagre", "litros", "seasoning", 365, 4),
	entry("Agua de mesa", "unidades", "beverage", 365, 1.2),
	entry("Gaseosa", "unidades", "beverage", 180, 2.5),
];

export const findCatalogEntry = (name: string) =>
	MASTER_CATALOG.find((e) => normalizeTerm(e.name) === normalizeTerm(name));
