# kilo-server

API de Kilo: predice la demanda diaria de insumos y recomienda qué comprar.
La documentación de producto vive en [`docs/`](docs) (Starlight).

## Desarrollo

```bash
cp .env.example .env      # y define POSTGRES_PASSWORD
bun install
bun run dev               # Postgres, API (:3001) y docs (:4321) con recarga
bun run test              # levanta Postgres y corre las pruebas
bun run check             # Biome + TypeScript
```

Con la API arriba, el contrato completo está en `http://localhost:3001/openapi`.

## Estructura

```
src/domain            Reglas puras, sin base de datos ni HTTP
  day, statistics, units      Días de negocio de Lima, mediana, pasos por unidad
  kitchen, ledger             Tipos del restaurante y acceso indexado a sus registros
  consumption                 Consumo diario, huecos estimados y cierres
  cold-start, holt-winters    Estimación inicial y pronóstico con estacionalidad semanal
  lots                        Lotes FIFO, vencimientos y merma
  recommendation, review      Cantidad a comprar y umbrales de «revisar»
  engine                      Fachada que compone lo anterior por insumo
  catalog/                    Plantilla de categorías, catálogo maestro y resolución de nombres
src/voice             Pasarelas externas: transcripción (Groq Whisper) y extracción (Claude Haiku)
src/db                Esquema Drizzle y cliente Postgres
src/modules/<área>    index (rutas) · service (datos y casos de uso) · model (esquemas) · presenter (vistas)
test                  Pruebas de dominio y de API contra Postgres real
```

Solo se guarda lo que el restaurante registra (conteos, lotes, datos declarados).
Consumo, pronóstico, recomendación y merma se calculan a partir de eso en cada
consulta.

## API

Todas las rutas, salvo `POST /restaurants` y `GET /health`, piden
`Authorization: Bearer <token>`. Los errores responden con un texto plano en
español y el código HTTP correspondiente (401, 403, 404, 409, 422, 503).
Las fechas son días de negocio de Lima (`YYYY-MM-DD`; el día cambia a las 6am).

| Ruta                                                                           | Qué hace                                                                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `POST /restaurants` `{name, inviteCode?}`                                      | Registra el restaurante. `201 {token, restaurant}`; el token solo se entrega aquí.                       |
| `GET /restaurant` · `PATCH /restaurant` `{name?, closedWeekdays?}`             | Datos y días de cierre fijo (1 = lunes … 7 = domingo).                                                   |
| `GET /categories` · `POST /categories` · `PATCH /categories/:id`               | `{name, purchaseIntervalDays, monthlySpend, critical}` por categoría.                                    |
| `GET /supplies`                                                                | Todos los insumos con su estado (`SupplyView`).                                                          |
| `GET /supplies/:id`                                                            | `SupplyView` + `recommendation`, `week`, `recent`, `lots`.                                               |
| `POST /supplies` `{name, unit?, categoryId?, shelfLifeDays?, referencePrice?}` | Crea el insumo; si el nombre está en el catálogo maestro basta `name`. Si ya existe lo devuelve (`200`). |
| `PATCH /supplies/:id` `{critical}`                                             | Crítico (conteo diario) o secundario (semanal). `204`.                                                   |
| `PUT /supplies/:id/phrases` `{phrase, amount}`                                 | Recuerda cuánto es «medio balde» de ese insumo. `204`.                                                   |
| `GET /catalog/resolve?term=`                                                   | `{kind: "exact", candidate}` · `{kind: "ambiguous", candidates}` · `{kind: "unknown"}`.                  |
| `POST /stock-close` `{remaining: {supplyId: cantidad}}`                        | Cierre de hoy. Repetirlo corrige el conteo. `204`.                                                       |
| `POST /stock-close/none`                                                       | Hoy no hubo consumo. `204`.                                                                              |
| `POST /purchases` `{lines: [{supplyId, quantity, cost, expiresOn?}]}`          | Un lote por línea. `201 {lots}`.                                                                         |
| `GET /today`                                                                   | `{day, alerts, toBuy, covered}`.                                                                         |
| `GET /savings`                                                                 | `{months, current, previous, topWasted}`.                                                                |
| `POST /voice` (multipart: `kind`, `audio` o `text`)                            | Dictado a borrador revisable.                                                                            |

### `SupplyView`

```jsonc
{
	"id": "uuid",
	"name": "Pollo entero",
	"unit": "kg",
	"categoryId": "uuid",
	"icon": "chicken", // o null
	"critical": true,
	"shelfLifeDays": 3,
	"referencePrice": 9.5,
	"phrases": { "medio balde": 6 },
	"stock": 12,
	"realDays": 9,
	"learning": true,
	"expiresInDays": 0, // lote más urgente si vence hoy (0) o mañana (1); si no, null
	"dueForClose": true, // el cierre de esta noche debe preguntarlo
	"expectedRemaining": 8, // valor sugerido para el cierre de hoy
	"closeCheck": { "base": 12, "gapDays": 1, "usual": 4, "reviewBelow": 0 },
	"priceCheck": { "usual": 10, "low": 6, "high": 14 }
}
```

- `closeCheck` (o `null` sin historial): marcar «revisar» si lo dictado es menor
  que `reviewBelow`. El consumo implícito es `(base − dictado) / gapDays`, y lo
  normal es `usual`.
- `priceCheck` (o `null` sin compras previas): marcar «revisar» si el precio
  unitario (`cost / quantity`) queda fuera de `low`–`high`.

### `GET /supplies/:id`

```jsonc
{
	// ...SupplyView
	"recommendation": {
		"toBuy": 27,
		"onHand": 12,
		"demand": 30,
		"buffer": 8.9,
		"horizonDays": 3,
		"typicalError": 4
	},
	"week": [{ "day": "2026-11-16", "amount": 9.8 }], // hoy + 6 días
	"recent": [{ "day": "2026-11-15", "amount": 10, "kind": "real" }], // 7 días, el más reciente primero; kind: real | estimated | closed | missing
	"lots": [
		{
			"id": "uuid",
			"purchasedOn": "2026-11-14",
			"expiresOn": "2026-11-17",
			"remaining": 6,
			"daysLeft": 1
		}
	]
}
```

### `GET /today`

```jsonc
{
  "day": "2026-11-16",
  "alerts":  [{ "supply": SupplyView, "daysLeft": 0, "remaining": 6,
                "lots": [{ "purchasedOn": "2026-11-13", "remaining": 6, "daysLeft": 0 }] }],
  "toBuy":   [{ "supply": SupplyView, "recommendation": { /* como arriba */ }, "bought": false }],
  "covered": [SupplyView]
}
```

### `GET /savings`

```jsonc
{
  "months": [{ "month": "2026-08", "soles": 0 }],   // 4 meses, el actual al final
  "current": 200, "previous": 250,
  "topWasted": [{ "supply": SupplyView, "soles": 80 }]
}
```

### `POST /voice`

`multipart/form-data` con `kind` (`close` o `purchase`) y `audio` (archivo) o
`text` (ya transcrito). Nunca guarda nada: devuelve un borrador para revisar.

```jsonc
{
	"transcript": "quedan tres kilos de pollo y medio balde de tomate",
	"items": [
		{
			"spoken": "pollo",
			"resolution": {
				"kind": "exact",
				"candidate": {
					"supplyId": "uuid",
					"name": "Pollo entero",
					"unit": "kg",
					"category": null
				}
			},
			"quantity": 3, // en la unidad del insumo; null si falta convertir `phrase`
			"phrase": null, // medida informal sin conversión guardada («medio balde»)
			"cost": null, // soles totales de la línea (solo compras)
			"suggestedQuantity": null // corrección sugerida («trece» → 3); nunca se aplica sola
		}
	]
}
```

`503` si el servidor no tiene `GROQ_API_KEY` / `ANTHROPIC_API_KEY`.
