# Seguridad de +Humanos

## Cómo funciona hoy (prototipo)

El sitio es estático: no tiene servidor ni base de datos. Todo lo que carga una persona (CV, postulaciones, cuentas, pretensión salarial) queda guardado **solo en su propio navegador**. Por eso hoy nadie puede robar datos de otros usuarios: no hay un lugar central donde estén.

Por la misma razón, los ingresos son de demostración. El panel de admin y las cuentas de empresa se validan dentro del navegador, y alguien con conocimientos técnicos puede saltearlos desde la consola. Lo único que vería es lo que hay en su propio navegador, no datos de otras personas.

## Qué se reforzó (29/10/2026)

| Riesgo | Qué se hizo |
|---|---|
| Inyección de código (XSS) con nombres, avisos o textos cargados por usuarios | Se probaron todos los campos y parámetros de las URLs con código malicioso en 67 pantallas y ventanas. No se ejecutó nada: todo el texto se muestra escapado. |
| Librería externa modificada (CDN comprometido) | Todas las librerías tienen versión fija y huella SRI. Si el archivo cambia, el navegador no lo ejecuta. Se dejó de usar el Tailwind "Play CDN" (código que se compilaba en el navegador) y unpkg/cdnjs: todo viene de jsDelivr. |
| Código ajeno ejecutándose en el sitio | Política de seguridad de contenido (CSP): solo se ejecuta código del propio sitio y de jsDelivr. No se permiten plugins, iframes externos ni formularios hacia otros sitios. Se quitaron los `onerror` en línea. |
| PDF malicioso (CVE-2024-4367 de pdf.js) | pdf.js se usa con `isEvalSupported: false`, y su worker se baja verificado con SRI. |
| Archivo disfrazado de CV (por ejemplo, un HTML renombrado a .pdf) | Se revisan los primeros bytes: solo pasan PDF y Word reales. Al abrir un CV, el tipo se fuerza: un PDF se muestra como PDF y cualquier otra cosa solo se descarga. |
| Contraseñas de empresas | Antes: un hash simple que se podía revertir. Ahora: PBKDF2-SHA256 con sal aleatoria y 600.000 vueltas (recomendación OWASP). Las cuentas viejas se actualizan solas al ingresar. |
| Clave del admin | La huella SHA-256 sin sal se podía buscar en tablas públicas. Ahora usa PBKDF2 con sal. |
| Prueba de contraseñas a repetición | Después de 5 intentos fallidos, el ingreso de empresas y el de admin se bloquean 5 minutos. |
| El sitio metido dentro de otro (clickjacking), robo de pestaña y fugas por referer | Cabeceras para Cloudflare Pages en `_headers`: `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`. |

## Pendiente: la clave del admin

La clave actual es corta y fácil de adivinar, así que el bloqueo de intentos no alcanza. Conviene cambiarla por una de al menos 14 caracteres.

## Antes de lanzar con datos reales (obligatorio)

Para guardar CVs y datos de personas de verdad hace falta un servidor. Sin servidor, ninguna medida en el navegador protege los datos. Los puntos mínimos:

1. **Base de datos y servidor** (por ejemplo Supabase o un backend propio) con **permisos por fila**: cada empresa ve solo sus búsquedas y postulantes, y cada candidato solo lo suyo.
2. **Ingreso real**: las contraseñas se validan en el servidor (Argon2 o bcrypt) y la sesión va en una cookie `HttpOnly` y `Secure`. El código por WhatsApp tiene que vencer y tener límite de intentos.
3. **Admin con cuentas personales y verificación en dos pasos**, no una clave compartida.
3b. **Invitaciones de acceso validadas en el servidor**: hoy el link de invitación lleva los datos adentro y, sin servidor, alguien con conocimientos técnicos podría armar uno falso. En producción, el link lleva solo un código al azar de un solo uso, que el servidor busca, verifica que no esté vencido ni usado, y recién ahí crea el usuario de esa empresa.
4. **CVs en almacenamiento privado**, con links firmados que vencen. Nunca links públicos.
5. **Anti-spam y anti-bots** en formularios (por ejemplo Cloudflare Turnstile) y límite de pedidos por IP.
6. **Ley 25.326**: inscribir la base en la Agencia de Acceso a la Información Pública, definir cuánto tiempo se guardan los CVs, y llevar registro de accesos y copias de respaldo.
7. **Revisión de dependencias**: actualizar las librerías y renovar las huellas SRI cuando se actualicen.
