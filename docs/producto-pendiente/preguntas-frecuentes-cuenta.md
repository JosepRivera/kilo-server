Fragmentos movidos desde `producto/preguntas-frecuentes.mdx` — las secciones "Cuenta y dispositivos" y "Notificaciones y login" completas (4 preguntas), al sacar `cuenta-y-dispositivos.mdx` y `notificaciones.mdx` del sitio.

## Cuenta y dispositivos

### ¿Por qué diseñar el esquema de datos multi-sucursal desde el día uno, si el MVP solo muestra una sucursal en la UI?

Adaptar un esquema de una sola sucursal a multi-sucursal más adelante es una migración costosa. Diseñarlo multi-sucursal-ready desde el principio cuesta casi nada extra en esta etapa, mientras la UI del MVP se mantiene simple.

### ¿Por qué el costo de OTP no es un problema para el dispositivo compartido?

Porque esta autenticación ocurre una sola vez por dispositivo (no en cada uso) y el SMS de verificación de Firebase Auth cuesta US$0.10 (S/0.34) por mensaje a Perú, con los primeros 10 de cada día sin cobro. Un puñado de envíos de OTP (código de un solo uso) por restaurante es un costo de alta, no un costo mensual.

## Notificaciones y login

### ¿Qué pasa si el dueño pierde el chip o cambia de número?

Para eso el login no es solo por teléfono. Google Sign-In se ofrece como segunda puerta a la misma cuenta, gratis en Firebase Auth. Si se pierde el chip, se entra con Google; si se pierde el acceso a Google, se entra con el teléfono. Ninguna de las dos pérdidas deja al dueño afuera de su propio historial.

### ¿Por qué el teléfono es el método primario y no Google?

Porque calca el patrón que el dueño ya usa todos los días con Yape, y funciona en un dispositivo de trabajo compartido entre personal, donde una cuenta de Gmail personal encaja peor. Google queda como segundo método, no como reemplazo.
