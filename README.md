# +Humanos · prototipo

Sitio mobile first para candidatos y para consultoras/empresas. Es un **prototipo navegable**: funciona completo en el navegador y guarda todo en el dispositivo (sin servidor ni base de datos todavía).

## Cómo abrirlo

Serví la carpeta con cualquier servidor estático (abrir `index.html` con doble clic también funciona, pero algunos navegadores bloquean el guardado de PDFs en `file://`):

```bash
npx serve .
# o
python3 -m http.server 8080
```

Para probar en el celular, abrí la IP de tu computadora en la misma red Wi‑Fi (ej. `http://192.168.0.10:8080`).

## Qué incluye

**Portada**
- Slider (Swiper) a pantalla completa debajo del menú: 4 destacados con autoplay, barras de progreso, pausa y flechas. Fotos de Unsplash (licencia libre); si no cargan, cada slide muestra un color de la marca.
- Debajo, la pregunta de Fedfu fija: escribir o tocar un área empieza la charla.
- "Confían en +Humanos": carrusel de logos en loop continuo (se pausa al pasar el mouse) con las empresas que tienen vacantes activas.
- "Del primer mensaje a la entrevista": 3 tarjetas con Swiper (las 3 visibles en escritorio, carrusel deslizable en celular y tablet).

**Candidatos**
- Chat guiado con Fedfu en 5 pasos: puesto, provincia, modalidad, experiencia y **skills** (opcional: las que más piden las vacantes del área, o escritas; con "No sé / saltar", porque Fedfu también las lee del CV al postularse). Acepta texto libre ("soy enfermera", "Rosario", "3 años") o respuestas rápidas en botones. Las competencias no se preguntan: la consultora las evalúa en la entrevista.
- **Afinidad del candidato con cada vacante**: área 30 · provincia 20 · modalidad 8 · experiencia 12 · skills clave 20 · competencias 6 · palabras del puesto 4. Si le falta una skill excluyente, queda en 69% como máximo y se le avisa cuál le falta.
- **Alertas de vacantes nuevas**: al terminar el chat, Fedfu ofrece "Avisame cuando haya algo así" (también con el botón de campana en Vacantes). Si no ingresó, primero ingresa con WhatsApp. La alerta guarda área, provincia y modalidad; cuando se publica una vacante que encaja, Fedfu avisa (en producción, por WhatsApp).
- **Notificaciones**: pestaña nueva del candidato con los avisos de Fedfu: vacantes nuevas para sus alertas (con afinidad y "Postularme"), novedades de sus postulaciones (CV leído, entrevista, finalista, resultado) y la lista de alertas para pausar o borrar. El número rojo del menú cuenta lo no leído. "Borrar todas" limpia la lista (las alertas siguen activas y los avisos nuevos siguen llegando).
- Vacantes ordenadas por **% de afinidad**, carrusel de mejores coincidencias, buscador, **filtros de provincia y área** (con la cantidad de vacantes de cada una), atajos (Remoto, Últimos 7 días, Con salario) y "Limpiar filtros". Se muestran de a 12 con **"Ver más"**.
- Cards de vacantes con resumen del puesto (2 líneas), provincia, cantidad de postulantes ("Sé de los primeros" si hay menos de 3) y botón **Postularme** que abre la postulación directo.
- **Para postularse hay que ingresar**: si no ingresó, al tocar "Postularme" se abre el ingreso con WhatsApp en el mismo panel (la primera vez pide también nombre y apellido) y, al validar el código, sigue directo a subir el CV de esa vacante.
- Postulación en segundos: subís el PDF, **se leen nombre, email y celular del CV** y se completan solos. Con "Guardar mis datos" la próxima postulación es de un toque.
- Guardadas.
- **Mis postulaciones con informe de avance**: el candidato ingresa con su celular y un código por WhatsApp (simulado en el prototipo: el código se muestra en pantalla) y ve cada postulación con una línea de tiempo **Enviada → CV leído → En proceso → Finalista → Resultado**, con la fecha de cada paso y un mensaje claro ("Leyeron tu CV", "¡Te quieren entrevistar!", "Sos finalista"). "CV leído" se marca solo cuando la empresa abre el detalle o el CV. Las novedades se marcan con un aviso en el menú y en cada postulación (en producción, además, se manda un WhatsApp). Si no queda seleccionado, ve el mensaje de la consultora y vacantes parecidas. "Ver un ejemplo" carga 5 postulaciones de prueba.

**Consultoras y empresas** (`Soy empresa` → "Probar cuenta demo" entra como Talento Norte)
- **Menú**: Inicio · Búsquedas · Entrevistas · Base de datos · Perfil.
- **Inicio "Para hacer hoy"**: lista de acciones pendientes ordenadas por prioridad (respuesta del cliente a una terna, CVs sin revisar, terna lista para enviar, avisar a no seleccionados, personas del banco que encajan, búsquedas sin movimiento para destacar, límite del plan), números que se pueden tocar y el plan. Las búsquedas se ven en su propia pestaña.
- **Búsquedas**: lista compacta (una fila por búsqueda con cliente, postulantes, nuevos, estado de la terna) y selector de cliente con buscador.
- **Página de cada búsqueda** (`#/empresa/b?id=…`): encabezado con cliente, estado y acciones (Destacar, Pausar, Ver aviso, Eliminar) y pestañas **Postulantes** (lista compacta por afinidad con filtros por etapa; el detalle se abre en un panel al costado con anterior/siguiente y **notas internas**: texto libre o atajos como "Buena entrevista" o "Pide más plata"; la última nota se ve en la lista y en el tablero, y todas quedan también en el banco de talento con la búsqueda donde se escribieron), **Tablero**, **Terna** (borrador, enviada o respondida, con el voto del cliente por candidato) y **Del banco** (sumar o invitar con un toque). Los links viejos a Postulantes redirigen acá.
- **Guía de la primera vez** en Inicio: "Empezá en 3 pasos" (publicar la primera búsqueda → revisar CVs → armar y compartir la terna). Cada paso se tilda solo según lo que hizo la cuenta; se puede ocultar.
- **Publicar en dos pasos**: 1) cliente, puesto y provincia (ciudad opcional); 2) Fedfu completa área, experiencia, descripción, requisitos y skills tomando la búsqueda más parecida (o una plantilla por área) y se revisa antes de publicar. Competencias y beneficios quedan en "opcional". Aparecen al instante para los candidatos.
- **Skills clave** (con sugerencias por área; cada una se puede marcar como *excluyente*) y **competencias** en cada vacante.
- Postulantes por vacante: ver CV en PDF, contactar por WhatsApp o email, cambiar estado.
- **Skills y competencias en cada postulante**: cada skill clave aparece verde si figura en el CV, "dice" si solo la declaró en el chat, o roja si falta (las excluyentes faltantes limitan la afinidad a 65%). Las competencias declaradas se muestran para confirmarlas en la entrevista.
- **Análisis de CV de Fedfu** en cada postulante: % de afinidad con la vacante, resumen de 3 líneas y cada requisito marcado como cumple (✓), no cumple (✗) o sin datos en el CV (?). Ordenado por afinidad, con opción "Más recientes". Corre en el navegador leyendo el texto del PDF (sin IA): para pasar a IA, reemplazar `analyzeCv()` en `app.js` por una llamada al backend que devuelva el mismo formato. Lo ve solo la empresa.
- **Buscar talento** con dos pestañas:
  - **Mis candidatos**: todas las personas que se postularon a tus búsquedas (en cualquier etapa) y las que guardaste desde la plataforma. Etiquetas, notas internas con fecha, favoritos e historial (a qué búsquedas se postularon, hasta qué etapa llegaron y qué respondió el cliente). Buscador por nombre, puesto, etiqueta o nota y "Comparar con una búsqueda" para ordenarlas por afinidad y sumarlas con un toque.
  - **Buscar en +Humanos**: perfiles de personas que aceptaron ser contactadas, con "Guardar en Mis candidatos". Buscador y provincia.
  - **Filtro por profesión** en las dos pestañas: botones rápidos con cantidad (Contables, Abogados, Marketing, Médicos, Ingenieros, Sistemas/IT, Administrativos, Ventas…). Solo aparecen las profesiones que tienen personas; se detectan por área y por palabras clave del título y las skills.
- **Sugerencias del banco**: al publicar una vacante, Fedfu revisa el banco y propone a quienes encajan (afinidad ≥ 60% o misma área; excluye la etiqueta "No recontratar"). Se suman a la búsqueda como postulantes ("Del banco") o se las invita por WhatsApp con el link de la vacante. También desde Postulantes y el tablero de cada búsqueda.
- **Tablero por etapas** (pestaña Tablero de cada búsqueda; en computadora entra completo, sin scroll lateral: 6 columnas en pantallas grandes y 3 × 2 en notebooks chicas o tablets): una búsqueda por vez en columnas Nuevos, En revisión, Entrevista, Terna (en consultoras, "Terna enviada al cliente"), Contratado y Descartados. Se arrastra con SortableJS (mouse o dedo); tocar una tarjeta abre el detalle con "Mover a otra etapa". Pasar a Terna suma a la terna; al compartirla, sus candidatos pasan solos a esa etapa.
- **Avisar a los no seleccionados**: con un toque avisa dentro de +Humanos (el candidato ve el mensaje en Mis postulaciones) y abre un único email con todos en copia oculta. Opción "Cerrar la búsqueda" para avisar también a quienes siguen en proceso. WhatsApp, uno por uno con el mensaje ya escrito (no permite envíos masivos sin su API paga). El texto se edita en Mi perfil.
- **Terna para el cliente**: en el detalle de cada postulante, "Sumar a terna"; en la pestaña Terna, "Revisar y compartir" genera un link privado. El cliente, sin cuenta, ve nombre, afinidad, comentario de la consultora, resumen de Fedfu, requisitos y CV (sin teléfono ni email), marca 👍/👎 y comenta. Su respuesta vuelve por WhatsApp o email con un link que, al abrirlo, la carga en cada postulante. El link es autocontenido (los datos van comprimidos dentro del link, sin servidor); para que lo abra un cliente real, el sitio tiene que estar publicado. Con Supabase se puede pasar a un link corto con respuestas en tiempo real.
- **Perfil** en pestañas: **Empresa** (logo, datos, ubicación, redes y contacto), **Clientes** (solo consultoras), **Mensajes** (WhatsApp, email y aviso a no seleccionados) y **Plan y pagos** (uso del plan, vacantes destacadas e historial de pagos). Los cambios sin guardar se mantienen al cambiar de pestaña. Detalle: logo, descripción, rubro, tamaño, ubicación y provincias donde opera, web y redes, contacto para candidatos y mensajes predeterminados de WhatsApp/email (con variables como `{nombre}` o `{puesto}`).
- Consultoras: fichas de **empresas cliente** (logo, rubro, contacto interno y si su nombre es público o confidencial). Cada búsqueda se asocia a un cliente.
- **Página pública** de cada empresa (`#/e?n=Nombre`) con su información y vacantes abiertas; se abre tocando el nombre de la empresa en una vacante.

**Planes y vacantes destacadas** (monetización)
- **Planes por búsquedas activas** (`#/empresa/planes`, también desde el panel, Mi perfil y "Soy empresa"): Gratis 1 búsqueda activa · Pro 5 ($59.900/mes, 1 destacada incluida) · Empresa 20 ($149.900/mes, 3 destacadas incluidas). Todas las herramientas en todos los planes; solo cambia cuántas búsquedas pueden estar abiertas a la vez. Las pausadas no cuentan.
- **Límite**: al publicar o reactivar por encima del plan, se ofrece pausar una o pasar al plan siguiente. No se borra nada. Para bajar de plan hay que pausar las búsquedas que sobran.
- **Vacantes destacadas**: aparecen **primeras en la lista de vacantes** (hasta 3 a la vez, las más afines a cada persona; el resto sigue ordenado por afinidad) y en la **banda "Vacantes destacadas" de la portada** (grilla de 3 × 2 en escritorio, deslizable en celular), con la etiqueta "Destacada". Se destacan desde cada búsqueda del panel: con un lugar incluido en el plan (se libera al quitarla o pausar la búsqueda) o comprando una suelta ($14.900 por 15 días, extensible).
- **Pago simulado**: checkout con Mercado Pago, tarjeta o transferencia que activa el plan o la destacada y queda en el historial de Pagos. No se cobra nada. En producción se reemplaza `openCheckout()` por el checkout de Mercado Pago (Checkout Pro + webhook que confirme el pago en el backend).
- Al cargar los ejemplos en una cuenta Gratis se activan 14 días de prueba del plan Empresa; al vencer vuelve a Gratis.
- Precios, límites y duración se editan en `PLANS`, `FEATURE_PRICE` y `FEATURE_DAYS` de `data.js`.

Datos de ejemplo: la cuenta demo trae 19 postulantes con CV. Con cualquier otra cuenta, el botón "Cargar postulantes de ejemplo" (en Postulantes o en el panel vacío) agrega 6 vacantes y 19 postulantes de prueba.

Confirmaciones (borrar, salir, cambiar de plan): panel propio con el botón de la acción en rojo cuando borra algo, foco en "Cancelar" y Esc para cerrar; ya no se usa el cartel del navegador.

Términos: *vacante* del lado del candidato y *búsqueda* del lado de la empresa; *postulantes* son las personas dentro de una búsqueda y *talento* el banco de personas. Los avisos (toasts) se muestran de a uno: el nuevo reemplaza al anterior.

Para volver al estado inicial: botón "Restablecer datos de demostración" al pie de la portada.

## Librerías

| Uso | Librería |
|---|---|
| Estilos | Tailwind CSS 3 |
| Carruseles | Swiper 11 |
| Arrastrar y soltar (tablero) | SortableJS 1.15 |
| Íconos | Phosphor Icons |
| Lectura de CVs en PDF | pdf.js 3.11 |
| Guardado de PDFs en el navegador | localForage (IndexedDB) |
| Tipografía | Bricolage Grotesque + Figtree (Google Fonts) |

Identidad: azul `#3B5BFD`, índigo `#14123A`, lila `#E7E3FF`, sol `#FFC93C`, menta `#D8F3E6`. Textos secundarios `#64627C` y ámbar `#8F5B0F` (contraste AA 4,5:1 sobre todos los fondos del sitio). Títulos en Bricolage Grotesque, texto en Figtree a 17 px (18 px en desktop).

## Estructura

```
index.html              Shell, CDNs y configuración de Tailwind
assets/css/styles.css   Animaciones, bottom sheet, toasts, ajustes de Swiper
assets/js/data.js       Provincias, áreas, vacantes y candidatos de ejemplo
assets/js/store.js      Capa de datos (localStorage + IndexedDB). Acá se conecta el backend
assets/img/fedfu.png    Avatar de Fedfu (cabeza del robot; también va embebido en data.js)
assets/js/app.js        Router, vistas, chat, matching, postulación y panel empresa
tailwind.config.js      Config para el build de producción
src/input.css           Componentes (.btn, .chip, .card, .input…)
```

## Para producción

Ver también **SEGURIDAD.md**: qué está protegido hoy y qué falta antes de lanzar con datos reales.


1. **Tailwind compilado**: `index.html` ya carga `assets/css/tailwind.css`. Cada vez que se cambian clases, se regenera con:
   ```bash
   npm install
   npm run build:css
   ```
2. **Backend**: todas las lecturas y escrituras pasan por `assets/js/store.js`. Reemplazando esas funciones por llamadas a una API (por ejemplo Supabase: tablas `jobs`, `applications`, `companies` y un bucket para los PDFs) el resto del sitio no cambia.
3. **Cuentas**: empresas y consultoras ingresan con email y contraseña (o crean su cuenta); candidatos, con su celular y un código por WhatsApp. En el prototipo las cuentas se guardan en el navegador y el código se muestra en pantalla: en producción van al servidor (Supabase Auth) y el código se envía por la API de WhatsApp. Cuenta demo de empresa: talento@demo.com.ar · demo1234.
4. **IA real**: el chat interpreta texto con palabras clave (`detectArea`, `detectProvince` en `app.js`). Se puede reemplazar por una llamada a un modelo de lenguaje sin tocar el flujo.
5. **Privacidad**: agregar consentimiento explícito del candidato para aparecer en "Buscar candidatos" y una política de datos personales (Ley 25.326).

## Pie y páginas institucionales
- Pie en columnas (portada y páginas institucionales): marca, frase y redes (Instagram, Facebook, WhatsApp: links de ejemplo en `SOCIAL`, en app.js); columna *+Humanos* (Nosotros, Preguntas frecuentes) y *Legal* (Términos y condiciones, Política de privacidad).
- **Nosotros** (`#/nosotros`): franja celeste con título y migas (Inicio / Nosotros), collage de 6 fotos (4 columnas; 3 fotos en celular; fotos de ejemplo de Unsplash en `ABOUT_PHOTOS`), cifras calculadas del sitio (vacantes activas, provincias con vacantes, empresas que buscan) y el texto "Sobre +Humanos" con tarjetas y botones.
- Páginas `#/faqs` (preguntas desplegables para candidatos y empresas, con precios tomados de los planes), `#/terminos` y `#/privacidad`. Son textos base: revisar los legales con un abogado antes de publicar.
- "Restablecer demo" pasó del pie a Perfil de empresa (abajo, junto a Cerrar sesión).

## Empresas adheridas
- Botón **Empresas adheridas** en el menú superior (en compu; en celular, link en Vacantes y en el pie). Página `#/empresas` con franja y migas, filtros al costado (buscador por nombre o rubro, provincia, tipo: empresas o consultoras) y lista con logo redondo, rubro, ubicación y cantidad de búsquedas abiertas. Orden por más búsquedas o A a Z; 9 por página con "Ver más".
- Al tocar una empresa abre su página (`#/e?n=…`) con todas sus búsquedas abiertas.

## Entrevistas (empresas)
- Pestaña **Entrevistas** en el menú de empresas (`#/empresa/entrevistas`): calendario mensual con puntos en los días con entrevistas, botón Hoy y flechas de mes; al tocar un día se ven sus entrevistas (hora, duración, candidato, búsqueda, modalidad y lugar) con Ficha, Avisar por WhatsApp, Mover y Cancelar. Debajo, las próximas.
- **Agendar entrevista**: se elige un postulante (buscador), día, hora (cada 30 min de 8 a 20), duración (30/45/60), modalidad (presencial con dirección, videollamada con link o teléfono) y notas internas. Avisa si el horario se cruza con otra entrevista. También desde la ficha de cada postulante ("Agendar entrevista" / "Cambiar").
- Al agendar: la postulación pasa a la etapa Entrevista (si estaba antes), el candidato ve día, hora y lugar en Mis postulaciones y en Notificaciones, y se ofrece avisarle por WhatsApp con el mensaje armado. Las entrevistas del día aparecen en "Para hacer hoy".
- Se guarda en cada postulación (`interview`). La cuenta demo arranca con algunas entrevistas en los próximos días.

## Portada (en rediseño)
- Por ahora la portada tiene el hero (carrusel), el buscador, "Empresas que confían en +Humanos", "Anuncios destacados", el bloque para consultoras y el pie. Las secciones de abajo (Confían en +Humanos, pasos, bloque para consultoras, vacantes destacadas y demás) se quitaron para rearmarla paso a paso.

## Enviar CV
- Botón **Enviar CV** en la barra superior (portada y lado candidato; no en el panel de empresas). Abre una hoja para subir el CV **solo en PDF o Word (.doc, .docx)**, hasta 5 MB: se valida la extensión y el tipo de archivo, y cualquier otro formato se rechaza con un aviso.
- Datos: nombre, celular (obligatorios), email, provincia y área (opcionales), y consentimiento para que las empresas vean el CV. Con PDF, Fedfu completa nombre, email, celular y área desde el CV; con Word no hay lectura automática.
- El CV queda en "Buscar en +Humanos" (Talento de empresas) como "Envió su CV", con su área para el filtro por profesión. El PDF se abre en otra pestaña; el Word se descarga.

## Buscador de la portada
- Barra clásica sobre el borde del hero: puesto o palabra clave, Provincia (solo las que tienen vacantes), Modalidad (Presencial, Híbrido, Remoto), Rubro y botón Buscar. Lleva a Vacantes con esos filtros aplicados. En pantallas chicas los campos se apilan.
- Vacantes suma el filtro de Modalidad (reemplaza el botón "Remoto").
- La portada ya no menciona a Fedfu: el primer slide del hero es "Tu próximo trabajo está acá" con "Ver todas las vacantes".
- **Desplegables propios** (buscador de la portada, filtros de Vacantes y de Empresas adheridas): la lista se abre siempre hacia abajo, con el estilo del sitio (tarjeta blanca redondeada, sombra, opción elegida en azul con tilde). Funcionan con teclado (flechas, Enter, Escape y tipeo de la primera letra) y se cierran al tocar afuera. Por debajo sigue el `<select>` nativo, así que los filtros no cambiaron. Para usarlo en otro select, agregarle `data-dd`.

## Empresas que confían en +Humanos
- Bloque debajo del buscador: título centrado y una pasarela de logos que corre sola y sin cortes (CSS, sin librerías), se frena al pasar el mouse y respeta "reducir movimiento". Los logos van en gris y toman color al pasar el mouse; cada uno lleva a la página de la empresa.
- Los logos se cargan en `TRUSTED` (data.js). Sin `src` se muestra el nombre con su ícono; para usar imágenes, agregá `src: 'assets/img/logos/archivo.svg'` (o PNG) a cada uno.

## Anuncios destacados y página del aviso
- Bloque **Anuncios destacados** en la portada: 3 por fila en compu (2 en tablet, 1 en celular), 9 en total, con más aire entre filas. Primero las búsquedas destacadas y después las más nuevas. Tarjetas compactas y más horizontales, con fondo gris muy claro (blancas al pasar el mouse) y bordes casi rectos. Cada tarjeta muestra logo, puesto, la consultora o empresa que publica, ubicación, antigüedad y la jornada con color (Full time azul, Part time violeta, Por proyecto rojo). "Ver todas las vacantes" lleva al listado completo.
- Al tocar un aviso se abre su **página propia** (`#/vacante?id=…`): migas (Inicio / Vacantes / Puesto), toda la info (empresa, cliente si es visible, ubicación, modalidad, jornada, experiencia, salario, descripción, requisitos, skills, competencias y beneficios), tarjeta lateral con Postularme, Guardar, Compartir y cantidad de postulantes, acceso a la empresa y "Otros avisos que te pueden interesar". En celular el botón Postularme queda fijo abajo. Postularse usa el mismo ingreso por WhatsApp y la carga del CV.

## Bloque para consultoras (portada)
- Debajo de los anuncios: a la izquierda dos fotos (de ejemplo, Unsplash) con una tarjeta flotante "12 CVs nuevos · Ordenados por afinidad"; a la derecha "Para consultoras", el título "Menos carga operativa, mejores selecciones para tus clientes", un párrafo, tres beneficios con tilde (publicás en 2 pasos, tu propio banco de talento, entrevistas en un calendario) y el botón **Probá gratis**, que abre el alta de cuenta de empresa.

## Barra superior (sitio público)
- Fija arriba al hacer scroll, igual en todas las páginas públicas y del candidato. Izquierda: **Inicio · Nosotros · Empresas** (empresas adheridas). Derecha: **Enviar CV**, **Empresa** (ingreso o panel de la empresa/consultora) y **Candidato**, un menú con Ingresar, Vacantes y Guardadas; con sesión muestra el nombre y suma Mis postulaciones, Notificaciones (con aviso de novedades) y Salir.
- En pantallas menores a 1024 px quedan el logo, Enviar CV y un botón de menú con todas las opciones. En celular sigue la barra inferior del candidato.
- El panel de empresas mantiene su propia barra (Inicio · Búsquedas · Entrevistas · Talento · Perfil).

## Base de datos (antes "Talento")
- Pestaña **Base de datos** del panel de empresas (`#/empresa/candidatos`), con franja de título y migas. Dos pestañas arriba de la lista: **Mis candidatos** (quienes pasaron por tus búsquedas o guardaste) y **Buscar en +Humanos** (perfiles que aceptaron ser contactados y CVs enviados).
- Filtros en una columna a la izquierda: palabra clave (nombre, puesto, skill, etiqueta o nota), Provincia, Profesión (con cantidad por profesión), Experiencia y, en Mis candidatos, Comparar con una búsqueda (ordena por afinidad y permite Sumar). En celular los filtros se abren con el botón "Filtros".
- Lista en filas: avatar, nombre (estrella si es favorito), profesión, ubicación, experiencia, hasta 4 skills en pastillas grises y las búsquedas a las que se postuló. Arriba: "Mostrando 1 – 9 de N resultados", orden (más recientes, A a Z, afinidad) y 9/18/36 por página con "Ver más".
- **Ver perfil** abre la página del candidato (`#/empresa/candidato?k=…`):
  - Encabezado con avatar grande, nombre, profesión, ubicación, experiencia y skills; botones **Ver CV**, **Sumar a búsqueda** (elegís una búsqueda activa y queda como postulante) y **Guardar** en tu banco.
  - Cuerpo: "Sobre el candidato" (el perfil del CV y un resumen automático), Etiquetas y Notas del equipo (se agregan y borran desde la página).
  - Columna gris: Profesión, Experiencia, Ubicación, Celular (con WhatsApp), Email, Origen (cómo llegó y a qué búsquedas se postuló, con su etapa), Pretensión salarial, Edad y Estudios. Los tres últimos se leen del CV cuando aparecen; si no, dicen "Sin dato".

## Búsquedas por cliente
- La pestaña **Búsquedas** muestra una tarjeta por cliente (en consultoras; las búsquedas sin cliente van en "Búsquedas propias"): logo, nombre, "Destacada" si alguna lo está, ubicación, rubro, postulantes recibidos, nuevos sin revisar, estado **Activo/Inactivo** (activo si tiene al menos una búsqueda activa) y cantidad de búsquedas. Arriba: buscador por cliente o puesto, filtro Todos/Activos/Inactivos y Publicar búsqueda.
- Al tocar una tarjeta se abre la **página del cliente** (`#/empresa/cliente?n=…`): encabezado con logo, rubro, ubicación, teléfono, email y búsquedas activas/nuevos; botones **Publicar búsqueda** (con el cliente ya elegido) y **WhatsApp** al contacto. Cuerpo: "Sobre el cliente" (notas internas) y todas sus búsquedas con postulantes, nuevos, estado y terna; cada una abre su espacio de trabajo. Columna gris: datos del cliente (rubro, ubicación, contacto, teléfono, email, sitio web, nombre visible) y actividad (búsquedas activas, postulantes, sin revisar, ternas enviadas, cliente desde), con "Editar datos del cliente".
- La ficha del cliente suma provincia, ciudad, sitio web y notas. Los clientes demo traen datos de contacto de ejemplo (`SEED_CLIENT_INFO` en data.js).

## Página de cada búsqueda (simplificada)
- Una sola página, sin pestañas. Arriba: volver al cliente, logo, puesto, estado (Activa/Pausada, Destacada) y lugar. A la derecha, el botón principal (**Compartir terna** si ya hay personas en la terna; si no, **Ver aviso**) y un menú **⋯ Más** con Destacar, Pausar/Reactivar, Ver aviso, Ver como tablero, Avisar a no seleccionados y Eliminar.
- Lista de postulantes con 4 grupos: **Por revisar** (nuevos), **En proceso** (revisión + entrevista), **Finalistas** (terna + contratado) y **Descartados**; orden por afinidad o más recientes. Cada fila: afinidad, nombre (punto azul si es nuevo, ícono si está en la terna), etapa y fecha. Al tocarla se abre el **visor del CV**: el PDF grande (dibujado con pdf.js, funciona en compu y celular; con botones para abrir en otra pestaña y descargar) y al costado las acciones para decidir: cambiar etapa (En revisión, Entrevista, Terna, Contratado), sumar/quitar de la terna, agendar entrevista y descartar (con aviso por WhatsApp y deshacer). Si estaba como Nuevo pasa solo a En revisión.
- Columna derecha: **Terna** (estado, personas, quitar y compartir) y **De tu banco** (personas que encajan, con Sumar). El tablero sigue disponible desde ⋯ Más → Ver como tablero.

## Calificación manual (reemplaza la afinidad automática)
- En las búsquedas ya no se calcula afinidad automática. La consultora lee el CV en el visor y marca una calificación del 10% al 100%, con una nota opcional.
- La lista de postulantes muestra la calificación y la nota (o "Sin calificar") y se puede ordenar por "Mayor calificación".
- La terna y el link que se comparte con el cliente muestran la calificación como "Calificación de {consultora}".
- Del lado del candidato tampoco hay coincidencia: el aviso y las cards de vacantes no muestran porcentaje. "Para vos" filtra por rubro y provincia, y las vacantes se ordenan por fecha.

## Panel de administración (#/admin)
- Acceso con un link chico "Admin" en el pie. La clave no figura en el código: solo su huella (PBKDF2 con sal), y se bloquea 5 minutos después de 5 intentos fallidos. En producción va con usuario y contraseña validados en el servidor.
- Recibe los CVs que llegan por "Enviar CV": estados Por revisar / Aprobados / Descartados, buscador, filtros por provincia y área, Ver CV, WhatsApp y Eliminar.
- Solo los CVs aprobados pasan a la Base de datos (pestaña de la plataforma) de empresas y consultoras.
- Trae 6 CVs de ejemplo la primera vez (se borran con "Restablecer demo").
- Pie: "Desarrollado por Clutch! Estudio".

## Planes (en dólares)
- Prueba gratis de 14 días del plan Pro para toda cuenta nueva (`TRIAL_DAYS`). Al vencer, la cuenta queda "Sin plan": ve todo, pero no puede publicar ni reactivar búsquedas.
- **Básico US$20/mes**: hasta 5 búsquedas activas, postulantes sin límite y todas las herramientas de gestión.
- **Pro US$30/mes**: búsquedas ilimitadas, 5 anuncios destacados a la vez y acceso a la base de datos de +Humanos (pestaña "Buscar en +Humanos", con CV y contacto). Con Básico esa pestaña muestra la invitación a pasar a Pro.
- **Sitio web**: +US$150 pago único, con cualquier plan; dominio y hosting a cargo de la consultora. El botón abre WhatsApp de ventas (`SALES_WA`).
- Se quitaron el plan Gratis, el pago anual, la destacada suelta, el pack de contactos, el plan Corporativo y la tabla comparativa. Todo editable en `data.js` (`PLANS`, `WEBSITE_PRICE`, `TRIAL_DAYS`).

## Vacantes
- La página de Vacantes usa el mismo buscador que la portada (`searchBar(prefijo)`): puesto, provincia, modalidad, rubro y Buscar. Se quitaron la tarjeta "Tu búsqueda", el carrusel personalizado y los chips (Para vos, Todas, Últimos 7 días, Con salario).

## Nosotros y textos sin Fedfu
- Los números de Nosotros arrancan en 0 y suben (1,5 s) cuando el bloque entra en pantalla; respetan "reducir movimiento".
- "Sobre +Humanos" presenta el sitio como portal de gestión para consultoras (tarjetas: Todos los CVs en un lugar · Terna con link · Tu banco de candidatos).
- Se quitaron las menciones a Fedfu y al chat con IA de todos los textos. El ícono del asistente se reemplazó por la marca de +Humanos. La pantalla `#/chat` queda solo como "Armá tu alerta" (desde Notificaciones).

## Avisar a todos los descartados
- En cada búsqueda, arriba de la lista aparece un aviso "N descartados sin avisar" con el botón "Avisar a los N". Abre el envío masivo: se avisa a todos dentro de +Humanos (lo ven en "Mis postulaciones"), se abre un único email con todos en copia oculta y queda un botón de WhatsApp por persona (WhatsApp no permite envíos masivos sin su API paga).
- Si ya hay un contratado y quedan personas en proceso, el aviso propone cerrar la búsqueda y avisarles a todos.
- Cada descartado muestra "Sin avisar" o "Avisado" en la lista.

## Reportes (`#/empresa/reportes`)
- Pestaña nueva del panel (en el celular reemplaza a Perfil en la barra de abajo; Perfil queda en el avatar). Filtros por cliente y período.
- Indicadores: postulantes recibidos, búsquedas cubiertas, días promedio para cubrir (de la publicación al primer contratado) y personas entrevistadas.
- Embudo: postulantes → CV revisado → entrevistados → en terna → contratados (usa el historial de etapas de cada postulante).
- Canales: cada postulante guarda `source`. Se registra con el link por canal (`#/vacante?id=…&src=linkedin`, desde la búsqueda: Más → Compartir por canal) o, si entra sin link, con la pregunta opcional "¿Dónde viste este aviso?" al postularse. Canales en `CHANNELS` (data.js).
- Informe por cliente en PDF (botón PDF): encabezado con la consultora, indicadores, embudo, canales y el detalle de cada búsqueda con la terna, la calificación y la persona elegida. Se arma en el navegador, sin librerías. El logo va como iniciales en el color de la consultora (un logo subido no se incluye todavía).
- En las cuentas de ejemplo, la primera visita a Reportes agrega 3 búsquedas ya cubiertas (pausadas) con su historial, para que haya datos.

## Datos personales (Ley 25.326)
- **Consentimiento registrado:** al postularse hay que aceptar "Acepto que {consultora} use mis datos y mi CV para este proceso…"; se guarda en la postulación (`consent: {at, text}`). Lo mismo al usar "Enviar CV". La consultora lo ve en la ficha del candidato (Consentimiento, con fecha y hora) y el admin en cada CV recibido.
- **El candidato borra sus datos:** con cuenta, desde Mis postulaciones → Borrar mis datos (se borran al instante sus postulaciones, CVs, alertas y contacto, también para las consultoras). Sin cuenta, desde Política de privacidad → "Pedir que borren mis datos" (formulario).
- **Panel de admin → Pedidos de datos:** pedidos pendientes con el plazo de 5 días hábiles, qué datos se encontraron (postulaciones por consultora y CVs enviados), botón Borrar sus datos y registro de cada borrado como constancia.
- **La consultora borra a una persona:** en la ficha del candidato (Mis candidatos) → "Borrar sus datos de mi base": postulaciones a sus búsquedas, CV, notas, etiquetas y lugar en ternas. Queda en el registro.
- `Store.erasePerson(match, jobIds)` hace el borrado; las personas borradas de toda la plataforma dejan de aparecer en "Buscar en +Humanos".

## Logo en el informe PDF
- Si la consultora subió su logo (Mi perfil), el informe PDF lo incluye (se convierte a JPEG sobre fondo blanco). Si no, van las iniciales en su color.

## Cuenta del candidato por persona
- "Mis postulaciones" y "Notificaciones" muestran solo lo de la persona que ingresó (cada postulación guarda `owner` = celular con el que ingresó).
- Si en el mismo dispositivo ingresa otra persona, se borran los datos personales del anterior: perfil, alertas, avisos, vacantes guardadas, contacto y CV guardado. El ingreso siempre pide nombre y apellido.

## Slider para candidatos (portada)
- Debajo del bloque para consultoras: "Postularte ya no es tirar CVs al vacío", slider de 6 fotos con el mismo comportamiento que el hero (fundido, barras de progreso, pausa, flechas). Arranca solo cuando entra en pantalla.
- Temas: Seguimiento · Devolución · Chau ghosting · Un solo clic · Alertas · Avisos reales. Cada uno con su botón (Mis postulaciones, Vacantes, Crear una alerta).
- Fotos propias en `assets/img/pain-1.webp` … `pain-6.webp` (en el index.html único van incluidas). La última lleva una capa más oscura para que se lea el texto.

## Simplificación del panel (orden y claridad)
- **Acciones a la vista:** en cada búsqueda, "Compartir" (link por canal) y "Destacar" son botones visibles; el menú "⋯ Más" queda para pausar, ver como tablero, avisar y eliminar.
- **Celular:** la barra de abajo muestra Inicio, Búsquedas, Entrevistas, Base y "Más", que abre Reportes, Perfil y Planes y pagos.
- **Un solo concepto:** "banco" se reemplazó por **Mis candidatos** en todos los textos (la columna de cada búsqueda ahora dice "De Mis candidatos"). Los postulantes sumados desde ahí aparecen en Reportes como canal "Sumado desde Mis candidatos".
- **Alertas con formulario:** la pantalla tipo chat se reemplazó por un formulario (rubro, provincia, modalidad y palabra clave). Los links viejos a `#/chat` abren el formulario en Notificaciones.
- **Borrar una postulación cerrada:** en Mis postulaciones, las postulaciones con resultado (elegido o no seleccionado) o cuya búsqueda ya se cerró muestran "Borrar". Borra esa postulación, su CV y su lugar en la terna, y queda en el registro de borrados. Las que siguen en curso no se pueden borrar desde ahí.

## El Hub de Tucumán
- Texto institucional ("Somos el Hub de Consultoras de RRHH y Empresas de Tucumán…") en un bloque propio debajo del buscador de la portada (con 4 pilares: avisos, networking, tendencias y recomendaciones) y como introducción de la página Empresas adheridas. Se edita en `HUB_TITLE`, `HUB_TEXT` y `HUB_CLOSE`.
- Botón "Sumate al Hub": crear la cuenta de la consultora o empresa, o escribir por WhatsApp para entrar a la comunidad.
- Nosotros: "+Humanos nació en Tucumán… y está abierto a búsquedas de todo el país".

## Charla de café (blog)
- Link "Charla de café" en el pie → `#/cafe`: encabezado, filtro por categoría (Mitos y verdades · Tendencias · Preguntas frecuentes · Entrevistas a consultoras), la última nota destacada grande y el resto en grilla de 3.
- Cada nota (`#/cafe/nota?id=…`): categoría, título, bajada, consultora y persona entrevistada, fecha y minutos de lectura, foto, formato pregunta-respuesta con una frase destacada al medio, botones para compartir (WhatsApp, LinkedIn, Facebook, copiar link), invitación a sumarse al Hub y "Seguí leyendo" (carrusel Swiper en el celular).
- Se cargan desde el panel de admin → "Charla de café": nueva nota, editar, publicar o dejar como borrador, eliminar. Foto de la biblioteca del sitio o subida (se achica a 1400 px). Arranca con 6 notas de ejemplo (`SEED_POSTS` en data.js) con las consultoras de la demo.

## Sitio web y LinkedIn de cada empresa
- En la página pública de la empresa o consultora (`#/e?n=…`), la tarjeta Contacto suma "Sitio web" y "LinkedIn" (los que cargan en Mi perfil), con la dirección visible y apertura en otra pestaña.

## Recomendación de la IA en cada búsqueda
- Al pie de la lista de postulantes: "Luego de leer y analizar los CVs recibidos, y de acuerdo a lo que pide tu búsqueda de …, te recomiendo estos 3 candidatos", cada uno con su porqué (requisitos que cumple, skills, años de experiencia, ubicación, la calificación de la consultora si existe) y un punto a revisar en la entrevista. Botones Ver CV y "Sumar a la terna".
- Excluye descartados y contratados; con menos de 2 CVs en proceso muestra un aviso.
- Prototipo: el análisis corre en el navegador con reglas (`aiRecommend()` usa `analyzeCv()`). En producción se reemplaza por una llamada a un modelo de IA con el mismo formato.

## Cobros apagados (por ahora)
- `BILLING = false` en data.js: no se muestran planes, precios, pruebas ni pagos. Todas las cuentas usan todo gratis: búsquedas ilimitadas y la base de datos de +Humanos. Los avisos destacados (función premium) quedan apagados: la portada muestra "Últimos avisos" y la FAQ aclara que por ahora no hay destacados.
- Se quitaron el botón "Probá gratis 14 días", la página de planes (`#/empresa/planes` lleva al inicio), "Plan y pagos" en el perfil, el medidor del plan en el inicio (ahora "Accesos rápidos") y los textos de precios en FAQ y Términos (sección 5 "Costos").
- Para volver a cobrar, poner `BILLING = true`: todo lo de planes sigue en el código.

## Importar candidatos
En **Base de datos → Importar candidatos** la consultora sube lo que ya tiene:
- **CVs en PDF o Word (.docx), varios a la vez.** Se detecta nombre, teléfono, email y provincia; todo se puede corregir antes de guardar. El formato .doc viejo no se puede leer.
- **Planilla Excel (.xlsx) o CSV.** Se asocian las columnas (nombre, apellido, teléfono, email, provincia, puesto, notas) con vista previa. Hay una plantilla para descargar.
Los importados van a **Mis candidatos** con la etiqueta "Importado". Opcionalmente se suman a una búsqueda (canal "Importado por la consultora"). Los duplicados se saltean.

## Preguntas filtro
Hasta 3 preguntas por búsqueda (Sí/No u opciones), al publicar o desde **⋯ Más → Preguntas filtro**. Cada una puede ser **excluyente** con una respuesta esperada. El candidato las responde al postularse. Quien no cumple una excluyente queda marcado "No cumple: …", se ordena al final y la recomendación de la IA no lo sugiere. Las respuestas se ven en el visor del CV.

## Hub: recomendaciones entre selectores
Nueva sección **Hub** en el panel (en el celular, dentro de "Más"):
- **Busco perfil:** pedidos abiertos de otros selectores. Cada pedido va atado a una búsqueda activa. "Recomendar a alguien" abre Mis candidatos (primero los que más encajan), con una nota de por qué lo recomendás.
- **Permiso del candidato, caso por caso:** se le manda un link por WhatsApp (`#/recomendacion?id=…`). Ve quién lo recomienda, a quién y para qué puesto, y acepta o no. También le aparece en Notificaciones. Sin permiso no se pasa ningún dato: quien pidió solo ve "esperando permiso".
- **Cuando acepta:** llega a la búsqueda como postulante (canal "Recomendado por el Hub"), con la etiqueta "Recomendado", la nota de quien lo recomendó y la fecha del permiso. Queda en Mis postulaciones del candidato.
- **Mis pedidos:** pedir recomendaciones para una búsqueda (desde el Hub o "⋯ Más → Pedir recomendaciones al Hub"), ver cuántos llegaron, cuántos esperan permiso y cuántos no aceptaron, y cerrar o reabrir el pedido.
- **Mis recomendaciones:** estado de cada una, volver a pedir permiso, copiar el link o cancelar.
En el prototipo el pedido y la respuesta viven en el navegador. Con servidor, el link lleva un id corto y el aviso al candidato sale por WhatsApp/email.

## Admin: empresas y consultoras
Nueva pestaña **Admin → Empresas**:
- Lista de todas las adheridas, con su origen: se registró (con email y fecha), cargada por el admin o de ejemplo.
- Para cada una: tipo, rubro, ubicación y búsquedas abiertas sobre el total, más la fecha de su última publicación.
- Contadores arriba (total, consultoras, empresas, con búsquedas abiertas), un buscador y un filtro por tipo.
- **Agregar empresa:** tipo, nombre, logo, rubro, tamaño, provincia, ciudad, dirección, descripción, web, LinkedIn, Instagram, WhatsApp y email. Aparece en "Empresas adheridas" con su página propia, aunque no publique búsquedas.
- **Acciones:** editar el perfil de cualquiera, ocultarla o mostrarla en "Empresas adheridas", y borrar las cargadas a mano que no tengan búsquedas.
- "Empresas adheridas" ahora también muestra las cuentas registradas que todavía no publicaron.

## Formulario de búsqueda (paso 2)
- **Descripción del puesto** (obligatoria) a la vista, junto con área, experiencia, modalidad, jornada y salario.
- **Secciones desplegables**, cada una muestra cuánto tiene cargado ("3 cargadas", "2 de 4 elegidas" u "Opcional"):
  - **Responsabilidades:** una por línea.
  - **Calificaciones:** una por línea. Antes se llamaba "Requisitos" y se guarda en el mismo campo.
  - **Preguntas filtro.**
  - **Skills clave**, con estrella para marcar las excluyentes.
  - **Competencias:** lista vertical con casillas. Se eligen hasta 4 y las demás se desactivan al llegar a 4.
  - **Beneficios.**
- **Borrador automático:** con el puesto se completan la descripción, las responsabilidades típicas del área (`AREA_RESP`), las calificaciones y las skills.
- **El aviso** muestra "Responsabilidades" y "Calificaciones".

## Rubros de las empresas
- **Lista fija de rubros:** `INDUSTRIES` en data.js, 18 rubros en este orden: Salud, Construcción, Inmobiliarias, Automotriz, Retail, Logística/Transporte, Tech, Telefonía/Comunicación, Hotelería/Turismo, Call center, Consultoras RRHH, Agroindustria, Alimenticia, Educación, Energía/Minería, Finanzas/Seguros, Industria/Manufactura y Gastronomía. No hay rubro "Otro": un rubro escrito a mano o de la lista anterior se traduce con `INDUSTRY_KW`, y si no encaja queda sin rubro (no aparece en el filtro ni en el mapa). Los rubros nuevos se suman recién cuando se suma una empresa de ese tipo. Se elige de esa lista al cargar o editar una empresa, tanto desde el Admin como desde el perfil de la empresa.
- **Rubros escritos a mano antes de la lista:** se reconocen por palabras clave (`INDUSTRY_KW`). Por ejemplo, "Construccion" pasa a "Construcción" y "Software" a "Tech".
- **Filtro en "Empresas adheridas":** desplegable "Rubro" con "Todos los rubros" y la cantidad de empresas de cada uno. Los rubros sin empresas no aparecen.

## Empresa verificada, seguir empresas y LinkedIn
- **Tilde azul de verificada:** se muestra en avisos, tarjetas, la página de la empresa, "Empresas adheridas" y el Admin. Lo da o lo quita el admin en **Admin → Empresas → Verificar**. Las empresas de ejemplo verificadas se marcan con `verified: true` en `COMPANIES`.
- **Seguir:** botón en la página de la empresa y en cada aviso. Pide ingresar si el candidato no tiene sesión.
  - Cada búsqueda nueva de una empresa seguida genera un aviso en Notificaciones: "X, que seguís, publicó una búsqueda nueva", también por WhatsApp en el sitio real.
  - En Notificaciones aparece la lista "Empresas que seguís", con opción de dejar de seguir.
  - La página de la empresa muestra cuántos seguidores tiene. En el demo, las empresas de ejemplo tienen una base de seguidores para que se vea el número.
- **Publicar en LinkedIn:** un toque desde "Compartir" o desde "⋯ Más" en cada búsqueda. Copia un texto sugerido, porque LinkedIn no permite precargarlo, y abre LinkedIn con el link del aviso, que lleva `&src=linkedin` para Reportes.

## Mapa (ciudad en 3D)
Pestaña **Mapa** (`#/mapa`) en la barra pública.
- **La ciudad:** cada empresa o consultora es un edificio y cada calle es un rubro. El número de calle es fijo según `INDUSTRIES` (Calle 1 Salud, Calle 2 Construcción… Calle 11 Consultoras RRHH, Calle 18 Gastronomía). Solo aparecen las calles que tienen empresas.
- **Estilo:** maqueta isométrica sobre fondo blanco, con base gruesa de pasto y tierra, cuadras, avenidas, sendas peatonales, faroles, árboles, una fuente y autitos que circulan. Paleta cálida: techos terracota y fachadas crema o durazno.
- **Edificios según el rubro:** Salud, Educación, Finanzas y Hotelería usan el edificio alto; Retail, Gastronomía y Automotriz, el local con toldo; Industria, Logística, Agroindustria, Alimenticia y Energía, el galpón; Tech, Telefonía, Call center y Construcción, el edificio de oficinas; Consultoras e Inmobiliarias, el edificio de dos pisos. Los colores de cada empresa salen de su nombre. Los lotes libres se llenan con casas del barrio en tonos apagados (no se pueden tocar) y plazas, para que las empresas resalten. Cada empresa tiene su cartel con el nombre (y el tilde si está verificada), y cada calle, un cartel con número y rubro en el borde de la maqueta.
- **Color por rubro:** cada rubro tiene su color (`IND_COLOR`). Lo usan el número de la calle en el panel, los carteles de las dos puntas de la calle, el cordón de las veredas y los techos de sus empresas. Las casas del barrio solo aparecen en cuadras donde no hay empresas, para que no se mezclen.
- **Logos:** las empresas verificadas tienen un poste alto con su logo y un cartel con su nombre. Las demás llevan el logo en la fachada. Se usa el logo que la empresa sube en su perfil; si no tiene, van sus iniciales sobre su color. No se dibujan logos de marcas que no los hayan subido.
- **Montañas:** un cordón de cerros low-poly al oeste, sobre la misma base, con picos de roca nevados atrás.
- **Ir a una calle:** el botón de cada calle acerca la cámara a sus empresas.
- **Búsquedas abiertas:** las empresas con búsquedas activas tienen una antena en el techo con una luz roja que titila.
- **Zeppelin:** un dirigible de +Humanos da vueltas sobre la ciudad con un cartel que dice cuántas búsquedas abiertas hay en total.
- **Consultoras:** todas las cuentas de tipo Consultora van a la Calle 11, Consultoras RRHH, en coral. Las empresas van a la calle de su rubro; las que no tienen rubro no aparecen en el mapa.
- **Cuántas búsquedas:** sobre la antena hay un globito rojo con la cantidad de búsquedas abiertas.
- **Búsqueda nueva:** si la empresa publicó en las últimas 48 h, salen fuegos artificiales de su edificio cada pocos segundos.
- **Solo con búsquedas abiertas:** un interruptor en el panel apaga en gris los edificios sin búsquedas.
- **Iluminar por puesto o área:** al escribir un puesto, área o skill, quedan en color solo las empresas que lo buscan, con un anillo amarillo que late, y el panel dice cuántas son.
- **Día y noche:** sigue la hora de Tucumán (anochece de 19 a 20:30 y amanece de 6 a 7:30). El botón con medio círculo, debajo del zoom, cambia entre "según la hora", "siempre de día" y "siempre de noche", y se recuerda en el navegador. De noche se prenden las ventanas, los faroles y las luces de los autos.
- **Tránsito y gente:** autos por calles y avenidas, semáforos en cada esquina que se alternan cada 10 segundos (los autos frenan en rojo) y gente caminando por las veredas.
- **Carteles nítidos:** los nombres de las empresas, los carteles de las calles y los globitos con la cantidad de búsquedas van en HTML encima del 3D, así se leen bien en cualquier zoom y pantalla. Tocar el nombre abre la ficha. De lejos se achican y se ocultan los globitos para que no se encimen.
- **Modelos:** [City Builder Kit de Kenney](https://kenney.nl) (licencia CC0), en `assets/models/`. La paleta cálida está en `colormap.png` y se recolorea en el navegador por bloques para cada fachada.
- **Navegación:** se arrastra para moverse, se pellizca o se usa la rueda para acercar, y con dos dedos o el botón derecho se gira. Tiene botones de acercar, alejar y ver toda la ciudad.
- **Panel de calles:** cada calle es un botón que lleva hasta ella, y hay un buscador de empresas.
- **Al tocar un edificio:** la cámara se acerca, el edificio rebota con un anillo coral y se abre una ficha con el logo, el rubro, las búsquedas abiertas (enlazadas a cada aviso), "Ver su página" y "Seguir".
- **Desde otras páginas:** `#/mapa?e=Nombre` abre el mapa con esa empresa elegida. Se usa en "Ver en el mapa" de la página de la empresa y de "Empresas adheridas".
- **Carga y respaldo:** Three.js (r128), OrbitControls y GLTFLoader se cargan recién al entrar al mapa. Sin WebGL o sin conexión, se muestra la misma ciudad como lista.

## Pretensión salarial
- **Candidato con cuenta:** botón **Pretensión salarial** en su menú (con la etiqueta "Nuevo" hasta que la carga) y una tarjeta en Mis postulaciones. Carga área (lista de áreas de las vacantes), puesto o profesión (con sugerencias de esa área), experiencia (sin experiencia, junior, semi senior, senior), jornada (completa o part-time), pretensión neta mensual y provincia. Puede actualizarla cuando quiera; se guarda una por persona.
- **Anónima:** no la ven las empresas ni las consultoras y no va en las postulaciones. Si la persona borra sus datos, la respuesta queda solo como dato anónimo, sin vínculo con ella.
- **Admin → Salarios:** filtro por provincia (Tucumán por defecto o todo el país), experiencia y jornada. Muestra respuestas, mediana, rango medio (P25–P75) y últimos 30 días. Abajo, una fila por área con la cantidad de respuestas, una barra con el rango y la mediana, y al abrirla, el detalle por puesto. Con menos de 5 respuestas se marca "Pocas respuestas". Botón para descargar CSV anónimo.
- **Demo:** trae respuestas de ejemplo (`demo: true`) con montos ficticios para que el tablero no arranque vacío.

## Acceso de empresas cargadas por el admin
- **Dar acceso:** en Admin → Empresas, cada empresa muestra su estado: "Sin acceso", "Invitada", "Invitación vencida" o "Activa". Con "Dar acceso" se pone el email de la persona (y, si se quiere, nombre y celular) y se genera un link personal que vence en 7 días y sirve una sola vez.
- **Envío:** botones para mandarlo por WhatsApp o por email con el mensaje listo ("Te damos acceso a la cuenta de… en +Humanos"), o para copiar el link.
- **Entrada:** la persona abre el link (`#/acceso?i=…`), ve el logo y el nombre de la empresa, crea su contraseña (mínimo 8 caracteres, con letras y números) y entra directo a Mi perfil, con los datos que había cargado el admin.
- **Reenviar, cancelar o quitar:** si está invitada, se puede reenviar (genera un link nuevo) o cancelar la invitación. Si está activa, "Quitar acceso" borra sus usuarios: no pueden ingresar más, pero el perfil y las búsquedas quedan como están.
- **"¿Es tu empresa? Pedí acceso":** en la página pública de cada empresa sin cuenta. La persona deja nombre, cargo, email, celular y confirma que trabaja ahí. El pedido aparece arriba en Admin → Empresas (con un número en la pestaña). "Dar acceso" abre la invitación con sus datos ya cargados, y "Rechazar" lo cierra.
- **Prototipo:** el link lleva adentro los datos del perfil para funcionar en otro dispositivo, y los pedidos de acceso se ven solo en el navegador donde se hicieron. En producción, el link lleva solo un código al azar que valida el servidor (ver SEGURIDAD.md).

## Encuesta Laboral
- **Dónde:** botón "Encuesta Laboral" en el pie (`#/encuesta`). Inspirada en la encuesta anual de UX Argentina.
- **Quién responde:** cualquier persona que trabaje o busque trabajo, sin cuenta y de forma anónima. Tarda unos 5 minutos.
- **Preguntas, en 4 pasos** (quien está sin trabajo salta del 1 al 4):
  1. Trabajo: situación, área, rubro, tamaño de empresa, provincia, experiencia, modalidad y jornada.
  2. Sueldo y beneficios: sueldo neto mensual, aumentos en los últimos 12 meses y beneficios.
  3. Satisfacción: conformidad del 1 al 5, si piensa cambiar de trabajo y por qué.
  4. Búsqueda: cómo consiguió su trabajo, cuánto tardó y qué le pesa más al elegir (hasta 3).
- **Resultados en vivo en la misma página**, con filtro por provincia (Tucumán por defecto), área y experiencia:
  - indicadores: respuestas, sueldo mediano, conformidad promedio y % que busca cambiar;
  - gráficos de sueldo por área (mediana y rango medio), modalidad, aumentos, beneficios, conformidad, motivos para cambiar, canales, tiempo de búsqueda y prioridades;
  - comparación "lo que se pide vs. lo que se cobra", con los datos de Pretensión salarial;
  - descarga en CSV.
- **Regla de privacidad:** con menos de 5 respuestas no se muestran sueldos.
- **Demo:** trae 640 respuestas de ejemplo (`demo: true`) con montos ficticios. En producción, las respuestas van a la base de datos y se limita a una por persona.

## Beneficios
- **Dónde:** botón "Beneficios" en el pie (`#/beneficios`), pensado para consultoras y empresas.
- **Arriba:** contadores animados (adheridas, búsquedas abiertas y cantidad de beneficios) y dos botones: "Crear mi cuenta gratis" y "Hablemos por WhatsApp".
- **Carrusel Swiper:** 5 beneficios clave, con avance automático (se pausa con el mouse y no se mueve si el sistema pide menos animaciones) y flechas.
- **Grilla de 19 beneficios en 4 grupos:** gestión, visibilidad, red y datos, y comunidad. Una barra fija permite saltar a cada grupo. Las tarjetas aparecen al hacer scroll, se elevan al pasar el mouse y llevan a la sección que corresponde.
- **Alianza con TuCuponApp:** bloque destacado con los pasos y el botón "Ver TuCuponApp", que abre https://tucuponapp.com/ (`TUCUPON_URL` en app.js).
- **Foto del hero:** `assets/img/hero-beneficios.webp`, con un degradé oscuro para que el texto se lea.

## Logos y portada de las empresas
- **Logos cuadrados** con bordes suaves en todo el sitio: listado de empresas, página de cada empresa, avisos, panel y mapa. El logo va sobre fondo blanco, con un margen interno, para que entre completo aunque sea apaisado.
- **Portada (banner) opcional** en Mi perfil → Identidad, y también desde el editor de empresas del Admin. Se recorta a 4:1 (1584 × 396, como LinkedIn) y se muestra arriba de la página pública de la empresa, con el logo encima. Sin portada, se usa un degradé con el color de la empresa.
