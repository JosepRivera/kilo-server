# Preguntas frecuentes — bloque de negocio

Este archivo guarda las preguntas frecuentes que salieron de la documentación de producto
(`docs/src/content/docs/producto/preguntas-frecuentes.mdx`) cuando Starlight se dejó solo con
producto. Son material base para el documento aparte de modelo de negocio, pricing y costos.

---

## Pagos

### ¿Por qué el precio no es una banda fija por tier?

Porque el precio es un porcentaje del ahorro real medido, que varía mes a mes y restaurante a restaurante; una banda fija no reflejaría lo que Kilo realmente le ahorró a cada dueño ese mes específico.

Hubo además una razón concreta para eliminar los tiers: **la tabla de tiers no cuadraba con su propia fórmula**. Decía cobrar 10-20% del ahorro, pero los precios listados por tier no salían de aplicar ese porcentaje a los ahorros listados. Hoy el mecanismo es una sola fórmula: **15% del ahorro medido ese mes, con piso de S/35 + IGV y techo de S/89 + IGV** (ver [Pagos y pricing](/producto/pagos-y-pricing/) y [Decisiones descartadas](/producto/descartado/)).

### ¿Por qué aparece el IGV si somos una startup chica?

Porque para cobrarle a un restaurante que quiere factura, Kilo tiene que estar formalmente registrado — y **toda venta formal en Perú lleva 18% de IGV**. No es una decisión de Kilo ni depende del tamaño de la empresa.

Lo que sí es una decisión es **cómo se anuncia el precio**. Si se publicara con IGV adentro, S/35 serían en realidad **S/29.66 de ingreso** y **S/5.34 se irían a SUNAT**: el 15.25% de los ingresos saldría del propio margen de Kilo (ver el desglose en [Costos](/producto/costos/)). Diciendo "+ IGV" de forma explícita, un cliente **con RUC** lo recupera como **crédito fiscal** y no le cuesta nada real.

La tensión hay que decirla completa: un restaurante **sin RUC no puede recuperarlo**, así que ese 18% es un sobrecosto real justo para el cliente más informal, que es el que menos margen tiene para absorberlo. Es un problema comercial del modelo, no técnico: no se arregla con ingeniería.

### ¿Por qué el programa de referidos solo paga cuando la cuenta referida convierte a pago real?

Para cerrar el loophole obvio de crear cuentas desechables para "farmear" meses gratis: una cuenta que nunca convierte a pago real nunca dispara ninguna recompensa (ver [Pagos y pricing](/producto/pagos-y-pricing/)).

### ¿Por qué no acortar la ventana de 3-4 meses antes del primer pago real (2-3 de piloto + 1 de referido)?

Porque coincide, convenientemente, con la misma ventana de comparación mes-1-vs-mes-4 que la narrativa de valor del producto ya necesita (S/380 → S/200, ver [Ahorro visible](/producto/flujo/fase-4-recomendador/)) para demostrar valor real antes del primer cobro (ver [Pagos y pricing](/producto/pagos-y-pricing/)).

### ¿Por qué elegir Culqi si tiene quejas de la comunidad sobre anti-fraude y soporte?

Porque esas quejas importan menos en este caso: es facturación B2B recurrente de un cliente ya conocido y verificado (el dueño del piloto), no un checkout anónimo de consumidor donde el riesgo de fraude es mucho mayor. La menor barrera de entrada de Culqi (solo DNI, sin RUC) pesa más en esta etapa (ver [Pagos y pricing](/producto/pagos-y-pricing/)).

---

## Notificaciones y login (movido desde la sección del mismo nombre)

### ¿Por qué no hay recordatorio automático de expiración de suscripción del sistema operativo?

Porque la facturación pasa por Culqi directamente, no por el cobro in-app nativo de Google Play/App Store — el 100% de la lógica de recordatorio la construye Kilo mismo, vía push + inbox in-app (ver [Notificaciones y autenticación](/producto/notificaciones-y-autenticacion/)).
