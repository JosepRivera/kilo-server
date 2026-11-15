export const CATEGORY_TEMPLATE = [
	{
		key: "protein",
		name: "Proteínas",
		purchaseIntervalDays: 3,
		critical: true,
	},
	{
		key: "produce",
		name: "Verduras y frutas",
		purchaseIntervalDays: 3,
		critical: true,
	},
	{
		key: "dairy",
		name: "Lácteos y huevos",
		purchaseIntervalDays: 4,
		critical: true,
	},
	{ key: "bakery", name: "Panadería", purchaseIntervalDays: 1, critical: true },
	{
		key: "grocery",
		name: "Granos y abarrotes",
		purchaseIntervalDays: 10,
		critical: false,
	},
	{
		key: "seasoning",
		name: "Condimentos y especias",
		purchaseIntervalDays: 14,
		critical: false,
	},
	{
		key: "beverage",
		name: "Bebidas",
		purchaseIntervalDays: 7,
		critical: false,
	},
] as const;

export type CategoryKey = (typeof CATEGORY_TEMPLATE)[number]["key"];
