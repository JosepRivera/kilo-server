# Negocio pendiente

Esta carpeta guarda todo el material de **modelo de negocio, pricing y costos** que salió del sitio
Starlight (`docs/src/content/docs/`). No está borrado: está fuera del sitio a propósito.

La razón es simple: **Starlight quedó solo con producto** — qué es Kilo y qué hace. El modelo de
negocio, el esquema de cobro y la estructura de costos se van a armar en un **documento aparte**, y
estas páginas son su material base.

## Páginas completas que se movieron

| Archivo | Qué contiene |
|---|---|
| `modelo-de-negocio.mdx` | El problema en diez palabras, el perfil del cliente y las tres pruebas del modelo de negocio. |
| `pagos-y-pricing.mdx` | La fórmula de cobro completa, con piso y techo, medios de pago y programa de referidos. |
| `costos.mdx` | Estructura de costos, márgenes y economía unitaria. |

## Fragmentos que se movieron desde otras páginas

| Archivo | De dónde salió |
|---|---|
| `preguntas-frecuentes-negocio.md` | La sección `## Pagos` completa (5 preguntas) de `producto/preguntas-frecuentes.mdx`, más la pregunta sobre el recordatorio automático de expiración de suscripción del sistema operativo, que era de facturación. |
| `descartado-negocio.md` | La sección `## Pagos y pricing` completa (8 puntos) de `producto/descartado.mdx`, el punto de posicionamiento comercial "más barato que la competencia", y los fragmentos de comparación competitiva y de cierre de `producto/vision-general.mdx` que dependían del esquema de precio. |

## Pendiente de resolver antes de armar el documento

Además de reordenar este material, hay una crítica del docente que sigue abierta y que este
documento tiene que responder:

> El esquema de **precio variable atado al ahorro** —15% del ahorro medido, con piso de S/35 + IGV y
> techo de S/89 + IGV— es difícil de sostener.

Los problemas concretos que levanta:

- El cliente no sabe cuánto va a pagar el mes que viene. Para un restaurante pequeño que maneja caja
  ajustada, un precio que se mueve mes a mes es difícil de presupuestar.
- El ahorro lo mide el propio vendedor. Kilo calcula el número sobre el cual se cobra, y eso es un
  conflicto de interés evidente para el cliente, aunque el cálculo sea honesto.
- En la práctica, con el piso y el techo tan cerca uno del otro, el precio termina pegado a uno de
  los dos extremos la mayor parte del tiempo — es decir, se comporta casi como un precio fijo, pero
  con toda la complejidad de explicación de uno variable.

**Sugerencia para la revisión**: mover el esquema hacia un **precio fijo**, o hacia **tiers por
funcionalidad** (qué incluye cada plan), en vez de atarlo al ahorro medido. Cualquiera de las dos
opciones es más fácil de explicar, de presupuestar y de defender.
