Fragmentos movidos desde `producto/descartado.mdx` — las secciones "Notificaciones" y "Cuenta, dispositivos y roles" completas (9 puntos), al sacar `cuenta-y-dispositivos.mdx` y `notificaciones.mdx` del sitio.

## Notificaciones

- **SMS para notificaciones operativas generales** — se cobra por mensaje mientras el push cuesta S/0, así que el SMS queda reservado solo para la verificación de identidad, no para el uso diario.
- **Twilio como proveedor de SMS** — US$0.2476 por mensaje a Perú frente a US$0.10 (S/0.34) de Firebase Auth por el mismo envío, con los primeros 10 del día sin cobro; se reemplazó por Firebase.
- **OTP por WhatsApp** — exigía una cotización de un BSP (proveedor autorizado de la API de WhatsApp) que nunca se consiguió, y con el SMS de Firebase a S/0.34 el ahorro dejó de justificar la integración.
- **WhatsApp Business API para notificaciones en el MVP** — técnicamente barato, pero queda como mejora futura condicionada a evidencia real del piloto de que las fallas de entrega de push están causando problemas.
- **Guardar el token de sesión en `localStorage` en la versión web** — descartado: `localStorage` es accesible desde JavaScript, así que cualquier script inyectado en la página puede leerlo. El refresh token va en una cookie `httpOnly`, que JavaScript no puede tocar.
- **Google/Apple como método de login primario y único** — lo descartado es que reemplace al teléfono, no el login social en sí: el teléfono sigue siendo el método primario porque calca el patrón de Yape que el dueño ya conoce y funciona en un dispositivo compartido entre personal. Google Sign-In sí se ofrece al lado, como segunda puerta a la misma cuenta: es gratis en Firebase Auth y resuelve la recuperación cuando el dueño pierde el chip.

## Cuenta, dispositivos y roles

- **UI multi-sucursal completa en el MVP** — el esquema de datos ya está preparado para múltiples sucursales, pero el MVP solo expone en la interfaz la gestión de una sucursal por cuenta inicialmente.
- **Teléfono personal por empleado** — descartado por la zona gris legal de tipo BYOD/laboral en Perú (no existe un estatuto claro que obligue o prohíba que el empleador entregue un dispositivo de trabajo); en su lugar se usa un dispositivo de trabajo compartido por sucursal.
- **Modelo de roles Dueño/Encargado** — se evaluó un segundo tipo de usuario (rol "Encargado", operativo, sin acceso a financials) para cubrir sucursales donde el dueño no puede estar presente cada noche, pero se descartó a favor de un actor único (el Dueño): no había una segunda identidad real que modelar, y la necesidad operativa se resolvía por completo con un dispositivo compartido que se queda autenticado a la cuenta del dueño, sin pagar el costo de un segundo flujo de autenticación, un flujo de invitación, ni un sistema de permisos.
