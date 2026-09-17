# Producto pendiente

Esta carpeta guarda páginas que salieron del sitio Starlight (`docs/src/content/docs/`) por ser
**secundarias** frente al pitch principal de producto — no son modelo de negocio (eso vive en
`negocio-pendiente/`), pero tampoco son parte de la narrativa central (problema, solución, flujo
operativo). Van a volver a tener un lugar en el sitio más adelante, en un grupo aparte del sidebar
todavía por definir.

## Páginas completas que se movieron

| Archivo | Qué contiene |
|---|---|
| `cuenta-y-dispositivos.mdx` | Arquitectura multi-sucursal, dispositivo compartido por sucursal, autenticación por teléfono + Google, sesión y seguridad. |
| `notificaciones.mdx` | Estrategia de avisos por capas (push nativo, inbox in-app) y por qué SMS/WhatsApp quedaron fuera. |

## Fragmentos que se movieron desde otras páginas

| Archivo | De dónde salió |
|---|---|
| `preguntas-frecuentes-cuenta.md` | Las secciones "Cuenta y dispositivos" y "Notificaciones y login" completas (4 preguntas) de `producto/preguntas-frecuentes.mdx`. |
| `descartado-cuenta.md` | Las secciones "Notificaciones" y "Cuenta, dispositivos y roles" completas (9 puntos) de `producto/descartado.mdx`. |

## Nota técnica

Los `import` de componentes dentro de estos `.mdx` siguen siendo relativos a su **ubicación original**
(`src/content/docs/producto/`), no a esta carpeta. No hay que corregirlos: vuelven a ser válidos
apenas los archivos regresen a su sitio. Mientras estén aquí no se compilan, así que no rompen el build.

## Pendiente de resolver

Decidir en qué grupo del sidebar vuelven a aparecer estas dos páginas (y sus fragmentos de FAQ /
descartado) cuando se reintegren al sitio.
