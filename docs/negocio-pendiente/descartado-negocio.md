# Decisiones descartadas — bloque de negocio

Este archivo guarda las decisiones descartadas que salieron de la documentación de producto
(`docs/src/content/docs/producto/descartado.mdx`) cuando Starlight se dejó solo con producto.
Son material base para el documento aparte de modelo de negocio, pricing y costos.

---

## Pagos y pricing

- **Banda fija de precio por tier** — descartada por completo, junto con el mecanismo de asignar tier según el gasto en insumos. La razón concreta: **los números de la tabla de tiers no se derivaban de su propia fórmula**. La tabla decía cobrar "10-20% del ahorro", pero 10-20% de un ahorro de S/75-720 da S/7.50-144 (no los S/25-35 que listaba), y 10-20% de S/300-3360 da S/30-672 (no los S/69-89 que listaba). El modelo de negocio se contradecía a sí mismo dentro de una sola tabla. En su lugar hay **una sola fórmula**: *15% del ahorro medido ese mes, con piso de S/35 + IGV y techo de S/89 + IGV* — [ver contexto](/producto/pagos-y-pricing/).
- **Rango de porcentaje variable (10-20%) sobre el ahorro** — descartado a favor de un **15% único y fijo**; un rango sin regla que dijera cuándo aplicar 10 y cuándo 20 no era un mecanismo, solo una ambigüedad. El piso y el techo, no el porcentaje, son ahora lo que acota la factura — [ver contexto](/producto/pagos-y-pricing/).
- **Cobrar el piso cuando faltan datos reales suficientes** — descartado: caer al precio más bajo por no registrar invertiría el incentivo y volvería "no usar la app" la opción barata. La regla anti-gaming cobra el **techo (S/89 + IGV)** en ese caso — [ver contexto](/producto/pagos-y-pricing/).
- **Tarjeta como medio de cobro por defecto** — descartada a favor de **Yape por defecto**: Culqi cobra 3.44% plano por Yape frente a 3.44% + US$0.20 fijo por tarjeta, lo que sobre un cargo de S/50 hace a Yape ~28% más barato. La tarjeta queda como alternativa para quien la prefiera — [ver contexto](/producto/pagos-y-pricing/).
- **Yape personal con activación manual** — descartado por tres razones a la vez: no hay API (alguien tendría que marcar a mano cada cuenta como pagada), una cuenta personal tiene un tope legal de recepción de 5 UIT al mes (**S/27,500 con la UIT 2026**, unos 309 restaurantes a S/89), y esa plata entra como ingreso de una persona y no de la empresa, lo que impide facturar — [ver contexto](/producto/pagos-y-pricing/).
- **Yape Empresa como riel de cobro** — más barato (**2.95%** frente al 3.44% de Culqi), pero es un producto de cobranza por QR con reporte de ventas del día, sin confirmación automática por cargo; el ahorro de **S/0.25 al mes por restaurante** no paga la conciliación manual que exigiría — [ver contexto](/producto/pagos-y-pricing/).
- **Stripe** como pasarela de pago — no soporta Perú como mercado, queda excluido.
- **"Yape On File"** (cobro recurrente verdadero vía PagoEfectivo/agregadores enterprise como ProntoPaga o dLocal) — sin onboarding maduro de autoservicio para comercios pequeños todavía; no se usa en el MVP, pero vale la pena monitorearlo como ruta de actualización futura — [ver contexto](/producto/pagos-y-pricing/).
- **WhatsApp para el recordatorio de pago** — descartado de la estrategia de notificaciones del MVP; construir una integración completa de Meta Business API para un solo tipo de mensaje recordatorio no se justifica sin evidencia real de piloto — [ver contexto](/producto/pagos-y-pricing/).

---

## Posicionamiento comercial (movido desde "Mecanismos de negocio evaluados y descartados")

- **Posicionar a Kilo como "más barato que la competencia"**: descartado porque es falso frente al competidor más probable en Lima. Fudo cuesta **US$35/mes** (Plan Avanzado) y ya incluye control de inventario, mermas, vencimientos y proveedores. El argumento competitivo se reconstruyó alrededor de **no necesitar un POS ni registrar ventas** — que es el trabajo que este segmento realmente no hace — y de la ausencia de estacionalidad semanal en la sugerencia de compra de Fudo — [ver contexto](/producto/vision-general/).

---

## Fragmentos de comparación competitiva relacionados a pago

Movido desde `docs/src/content/docs/producto/vision-general.mdx`, de la sección "Por qué esto y no la competencia":

- **Fudo Perú solo acepta tarjetas de crédito y débito** como medio de pago (según su propia página de precios): no acepta Yape ni Plin. Kilo cobra por Yape por defecto (ver Pagos y pricing).

Movido del párrafo de cierre de la misma página:

> El diseño de Kilo (ver Pagos y pricing) asume explícitamente ese contexto: sin POS, sin RUC obligatorio para pagar, y con un precio que se calcula sobre el ahorro real medido en vez de una tarifa plana contratada de antemano.
