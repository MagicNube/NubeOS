# Diseño — Anime

- Estado: Implementado; revisión visual pendiente
- Última actualización: 2026-08-22

## Modelo

```text
Anime franquicia 1 ─── N MediaContent 1 ─── N WatchSession
Película anime    1 ─────────────────────── N WatchSession
```

Una franquicia usa `MediaTitle(kind = anime, is_anime = true)`. Una película anime independiente usa `MediaTitle(kind = movie, is_anime = true)`. Una película vinculada continúa siendo `MediaContent(kind = movie)`.

`MediaTitle` incorpora `catalog_number` y `genres`. El número es una identidad visual secuencial distinta del UUID técnico. `MediaContent` incorpora `started_on` y `notes`; `notes` conserva información objetiva y `opinion` la valoración personal.

`WatchSession` representa una unidad vista, no un delta visual. Para un contenido guarda el número de episodio; para una película directa representa su única unidad. El progreso anterior a esta versión puede existir sin sesiones y se conserva como línea base sin inventar fechas.

## Responsabilidades

- Rust valida clasificación, contenidos, canonicidad, progreso y estadísticas.
- El repositorio audiovisual persiste títulos, contenidos y sesiones en las tablas `media_*`.
- Los comandos filtran mediante `MediaArea::Anime` antes de devolver tarjetas.
- React presenta la jerarquía completa y no mezcla otras áreas.
- Rust asigna los números de catálogo mediante una secuencia persistida y valida puntuaciones en décimas.
- Rust genera una sesión por episodio añadido, mantiene sincronizado el contador persistido y solo permite retirar la última sesión de cada objetivo.
- Rust calcula una sugerencia de estado global sin aplicarla y deriva las fechas de actividad exclusivamente del historial persistido.

## Interfaz

- `AnimeWorkspace` presenta Biblioteca, En curso, Historial y Estadísticas, en ese orden. Archivo y Añadir anime permanecen accesibles desde cualquier vista.
- El formulario ofrece Formato: Serie o franquicia / Película independiente.
- El formulario principal agrupa sus campos en Identificación, Seguimiento, Opinión y Portada, conservando formato, géneros y soporte de GIF propios de Anime.
- El detalle de franquicia permite crear, editar, borrar y reordenar contenidos.
- La posición persistida se muestra como `#1`, `#2` y siguientes y expresa el orden recomendado.
- El detalle de película independiente utiliza seguimiento directo.
- Las tarjetas y el detalle muestran `#n`; el formulario permite editar géneros sin modificar ese número.
- La puntuación efectiva es la manual del título o, si falta, la media de contenidos. La entrada es numérica entre 0 y 10, admite una décima y usa una escala cromática exclusiva sin morado.
- La ordenación es estado efímero de presentación. React ordena una copia de los títulos ya filtrados utilizando `catalogNumber` o la puntuación efectiva recibida.
- La acción Omitir reutiliza la actualización validada de `MediaContent` y cambia `canon_status` a `omitted`; no introduce otro estado persistente.
- El editor manual conserva un botón de confirmación. Al aumentar de `N` a `M`, Rust crea los episodios `N + 1 ... M` con la fecha elegida; al reducir retira las sesiones registradas por encima del nuevo valor, sin añadir deltas negativos. `+1` mantiene el flujo inmediato.
- El historial es una vista principal junto a En curso, Biblioteca y Estadísticas. Filtra y ordena sesiones sin cargar todos los detalles de cada anime en React.
- Editar una fecha y retirar la última sesión son comandos pequeños y transaccionales. Retirar una sesión actualiza también el progreso del contenido o película.
- Estado y puntuación se actualizan mediante comandos específicos desde la cabecera del detalle; el formulario completo queda para metadatos de baja frecuencia.
- Los formularios comparan su borrador normalizado con el valor inicial y confirman el cierre si existen cambios.
- Anime no presenta ni solicita estudios de animación. Las columnas heredadas permanecen únicamente por compatibilidad con la persistencia audiovisual compartida.
- Solo el estreno permanece editable como metadato del contenido. La primera y última actividad se calculan para presentación desde el historial persistido.
- La Biblioteca mantiene dos minivistas efímeras en React: `Anime` muestra únicamente franquicias y `Películas Anime` únicamente películas independientes. No se crea otra entidad ni otro módulo.
- El número de catálogo se asigna solo si `kind = anime`. Los números existentes de las franquicias son inmutables; una película nunca participa en el orden ni en el Top de anime.
- `Mis top anime` se calcula sobre franquicias puntuadas y React limita la presentación a 5, 10 o 25 elementos según una preferencia visual local.
- Favorito se modifica con una estrella en la cabecera mediante el mismo caso de uso de actualización; el formulario deja de presentar una casilla secundaria.
- La puntuación rápida se persiste al confirmar el propio campo por desenfoque o Enter, sin un botón con tick. Su geometría, color y tipografía la distinguen como dato principal.
- La tarjeta de contenido separa el título de una zona de lectura: puntuación prominente, estado, tipo y canonicidad; las fechas quedan en una línea secundaria.
- El formulario de contenido ordena las fechas en una cuadrícula explícita: inicio y final comparten fila; estreno ocupa la fila siguiente.
- `MediaProgress.total` conserva la suma de totales conocidos aunque `totalIncomplete` sea verdadero. Presentación añade `+ ?`; no inventa episodios para contenidos desconocidos.
- El cambio de minivista activa un estado transitorio antes de cambiar el criterio de orden, evitando renderizar los elementos anteriores con la ordenación siguiente.
- La puntuación rápida usa un guardado diferido corto y también confirma en Enter o desenfoque. Rust continúa validando rango y precisión.
- La tarjeta de contenido usa tres filas de información: identidad, estado y progreso. Las acciones secundarias se posicionan sobre la superficie sin participar en la cuadrícula, aparecen en `hover` o foco y no reservan espacio cuando están ocultas.
- Los nombres redundantes se acortan solo al presentar patrones importados (`Temporada 1 — Anime`, `Película — Anime: Título`); el valor persistido no se modifica.
- `Guardar` permanece en las correcciones de progreso porque reducir episodios modifica historial. `+1` se presenta como acción principal del bloque.
- El formulario conserva puntuación coloreada pero con la altura de un campo normal, añade separadores semánticos y muestra inicio, final y estreno en una fila de tres columnas. Las áreas de texto parten de dos líneas y crecen con el contenido.
- La acción rápida de canonicidad alterna entre Omitido y Canon. Esta elección reversible evita abrir el formulario para recuperar un contenido; Recomendado y Opcional continúan siendo metadatos de edición deliberada.
- El estado del contenido se edita mediante un selector oscuro integrado en la tarjeta. No se presenta una etiqueta redundante `Estado` ni otra superficie visual dentro de la tarjeta.
- La puntuación ocupa una celda propia con una estrella y el valor. El progreso comparte el fondo de la tarjeta; `Guardar cambios` permanece visible como excepción deliberada y se desactiva cuando no existe un borrador distinto del valor persistido.
- La columna de acciones conserva una anchura estable tanto en contenidos incluidos como omitidos para evitar saltos de alineación.
- El estado frecuente de un contenido usa un control segmentado y controlado por React con seis iconos Lucide, `aria-pressed`, etiqueta accesible y ayuda contextual. Reutiliza la dependencia y el CSS existentes; no incorpora Tailwind ni mantiene un estado local distinto del DTO persistido.
- `can_increment_content` decide por canonicidad, estados sin contenido reproducible y límite de episodios. `Completed` no bloquea un progreso incompleto, permitiendo reparar datos importados sin editar antes el estado.
- La estrella de Biblioteca es una acción superpuesta y hermana del botón que abre la tarjeta, evitando botones anidados. Persiste mediante el caso de uso existente y recarga la colección actual.
- `StatusIconSelector` es un componente controlado reutilizado por la cabecera del anime y por cada contenido. Sus seis colores activos se definen con selectores de igual especificidad y cada icono expone tooltip visual, `title`, `aria-label` y `aria-pressed`.
- La tarjeta distribuye identidad, clasificación, estado, progreso y acciones en columnas distintas. Tipo, canonicidad, último visionado y estreno usan una pequeña rejilla etiquetada.
- `ProgressEditor` mantiene progreso, fecha y `+1` en la primera fila. En las tarjetas, `Guardar cambios` se alinea bajo el contador y `Ver historial` bajo la fecha; el guardado comunica su disponibilidad mediante el estado desactivado.
- La cabecera usa botones de icono con nombre accesible y tooltip para Historial, Favorito, Editar, Archivar y Cerrar. Solo muestra Tu puntuación y Media con el mismo tamaño; el estado textual ocupa la tercera celda del resumen inferior, junto a Progreso y Contenidos.
- La identidad de cada contenido ocupa todo el ancho disponible junto a una puntuación alineada arriba. Debajo, Tipo, Canonicidad, Último visionado y Estreno forman una rejilla fluida de metadatos. La fecha de actividad se recibe calculada desde Rust y nunca se inventa. El acceso a Historial pertenece al bloque de seguimiento inferior.
- `AnimeWorkspace` es dueño de la navegación efímera hacia Historial. Una operación `openHistory(titleId, contentId?)` cierra el detalle, activa la vista principal Historial, selecciona el anime y aplica opcionalmente el contenido.
- `MediaDetail` no consulta ni representa una sección Historial. La cabecera invoca `openHistory(titleId)` y cada tarjeta de contenido invoca `openHistory(titleId, contentId)`.
- En Historial, las opciones de contenido se derivan exclusivamente de todos los contenidos del anime seleccionado, aunque todavía no tengan sesiones. Sin anime no existe selección de contenido; al cambiarlo se descarta el contenido anterior antes de consultar.
- Anime y contenido seleccionados son estado visual temporal de React. Se reutiliza la consulta existente del Historial y no se añaden tablas, migraciones ni reglas duplicadas de fechas.
- La vista principal conserva el resumen de primera actividad del anime o contenido seleccionado. Se calcula únicamente desde sesiones persistidas y distingue el progreso importado que carece de fecha.
- La lista de contenidos pasa a una cuadrícula CSS de dos columnas. Cada `ContentRow` se convierte visualmente en tarjeta y conserva la jerarquía ya aprobada de identidad, puntuación, estado, clasificación, progreso y acciones.
- El array `detail.contents` continúa siendo la fuente del orden recomendado. La cuadrícula lo distribuye por filas y el drag and drop sigue identificando origen y destino por ID, por lo que mover tarjetas persiste el mismo orden lineal.
- Una media query reduce la cuadrícula a una columna cuando dos tarjetas no permiten leer ni operar sus controles con comodidad. La imagen de referencia orienta solo la distribución en dos columnas; no define información, colores ni componentes.

## Persistencia y migración

La migración 0013 añade `is_anime` y marca automáticamente todos los títulos históricos `kind = anime`. Las películas anime nuevas se distinguen de las convencionales mediante el mismo campo. No se mueve ni elimina contenido existente.

La migración 0014 añade el número de catálogo, géneros serializados como JSON, fecha de inicio y notas de contenido, además de una secuencia por área. La restricción única se aplica únicamente a títulos Anime numerados.

La siguiente migración amplía las puntuaciones a 0–10, admite `image/gif` y añade el número de episodio a las sesiones nuevas. Las sesiones históricas con delta se conservan como legado legible; no se crean fechas ficticias para el progreso importado.

La carga desde Notion se ejecuta con una herramienta puntual fuera de las migraciones. Trabaja en una transacción, requiere una biblioteca Anime vacía, fija la secuencia en el mayor número importado y se elimina al terminar. El CSV y los datos personales no forman parte del repositorio.

## Decisiones aplazadas

- Comprobar con uso real si una película vinculada necesita portada propia.
- Modelar revisualizaciones o rutas alternativas solo cuando exista un caso real.
- El cambio entre Anime y Películas Anime conserva el contenido anterior durante la carga, lo atenúa y lo sustituye de una vez cuando llega la nueva colección; nunca aplica la ordenación nueva sobre datos antiguos.
- Cada tarjeta de contenido tiene dos vistas locales. `Información` contiene puntuación, tipo, canonicidad, último visionado, estreno, opinión, estado y acciones secundarias. `Historial` contiene progreso, fecha, `+1`, guardado manual y acceso al historial global ya filtrado.
- `Información` presenta puntuación, estado textual y metadatos mediante una rejilla-resumen común. Las acciones secundarias ocupan la esquina superior derecha y no comparten espacio con el resumen.
- `Historial` distribuye el seguimiento en tres niveles: resumen de progreso, controles etiquetados para corrección/fecha/avance y acciones finales de guardado e historial global. No usa `space-between` para desplazar el bloque al fondo.
- Las pestañas `Información` e `Historial` permanecen centradas en una barra superior propia. Las acciones ocupan su extremo derecho y el título comienza en una segunda línea independiente.
- `Información` comienza con el mismo resumen de progreso que `Historial` y coloca debajo la rejilla de datos. El estado deja de ser una acción rápida de tarjeta y se modifica deliberadamente desde Editar.
- `cover_position_x` y `cover_position_y` guardan porcentajes entre 0 y 100 en `media_titles`. React permite arrastrar la portada dentro de un marco de la misma proporción que la vista actual y Rust valida y persiste la posición.
- El estado del contenido se muestra como texto dentro del resumen de Información. Su modificación continúa en el formulario para no convertir de nuevo la tarjeta en un panel de controles rápidos.
- El estado textual ocupa el extremo superior izquierdo de la barra de navegación. El resumen inferior reserva una zona destacada a la puntuación y distribuye Tipo, Canonicidad, Último visionado y Estreno en dos filas, evitando una única tira de datos.

- Historial presenta `Ver historial completo` a la izquierda y la confirmación manual a la derecha; el avance inmediato se denomina `Registrar +1` sin duplicar el signo mediante un icono.
- El editor de portada captura el puntero durante todo el gesto y ofrece además ejes porcentuales como alternativa precisa y accesible.
- En los formularios, Opinión precede a Anotaciones siempre que ambos campos conviven.
- Las fechas manuales de inicio y fin se conservan temporalmente para progreso importado sin sesiones. El historial es la fuente temporal preferida para actividad nueva; retirar u ocultar los campos requiere una tarea de modelo y migración independiente.
- El formulario de contenido no expone inicio ni fin: conserva silenciosamente valores importados existentes y usa las sesiones como fuente para cualquier estadística temporal nueva. Estreno permanece como metadato de publicación, no de visionado.
- La portada de Biblioteca continúa abriendo el título. El detalle muestra una acción `Ajustar` sobre la propia portada; esta abre el editor donde sí se arrastra la imagen, separando navegación y encuadre.
- `cover_zoom` completa el encuadre persistente con un factor entre `1` y `2`. El editor muestra un marco fijo igual a la vista final; ampliar crea excedente real y X/Y eligen qué zona permanece visible. Biblioteca y detalle aplican las tres propiedades.
- El editor vive en la capa UI compartida para Anime, Series, Películas, Lectura y Videojuegos. `Ajustar` solo aparece al hover o foco de la portada; en dispositivos sin hover permanece visible.

## Portadas horizontales

- Biblioteca, En curso, detalle y editor utilizan marcos 16:9 para franquicias y películas Anime.
- La cuadrícula de Biblioteca presenta tres columnas normales para dar a cada portada suficiente anchura.
- El encuadre y zoom persistidos siguen compartiendo el editor audiovisual existente; no se crea almacenamiento adicional.
