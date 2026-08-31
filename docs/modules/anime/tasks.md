# Tareas — Anime

- Estado: T-A01 a T-A41 implementadas; comprobación manual pendiente
- Última actualización: 2026-08-30

## T-A01 — Separar la Biblioteca Anime

- Estado: Implementada
- Alcance: renombrar el workspace anterior y limitar todas sus consultas a Anime.
- Verificación: build y prueba manual de navegación.

## T-A02 — Admitir películas anime independientes

- Estado: Implementada
- Alcance: clasificar películas anime directas sin confundirlas con películas convencionales.
- Verificación: pruebas de dominio y persistencia.

## T-A03 — Conservar la jerarquía completa

- Estado: Implementada
- Alcance: mantener contenidos, orden, progreso, historial, puntuaciones y Archivo.
- Verificación: pruebas Rust existentes y recorrido manual pendiente.

## T-A04 — Revisar el refactor

- Estado: Revisión técnica completada; comprobación manual pendiente
- Alcance: Clippy, formato, pruebas, build y comprobación visual.

**Resultado:** 91 pruebas Rust, Clippy estricto, formato, build TypeScript/Vite y `git diff --check` correctos. La comprobación visual queda pendiente por la restricción del navegador local de esta sesión.

## T-A05 — Ampliar el modelo para la biblioteca importada

- Estado: Implementada
- Alcance: número de catálogo estable, géneros, fecha de inicio y notas de contenido, puntuaciones en décimas y puntuación efectiva.
- Verificación: migración, pruebas de dominio, repositorio, comandos y build frontend.

## T-A06 — Preparar e importar los datos de Notion

- Estado: Implementada
- Alcance: auditar los CSV, corregir inconsistencias inequívocas, añadir continuaciones principales confirmadas e importar sin portadas ni URLs.
- Restricción: copia de seguridad previa, transacción única y ninguna fila personal dentro del repositorio.
- Verificación: 62 números de catálogo únicos, relaciones válidas, posiciones consecutivas y ausencia de enlaces Notion.

## T-A07 — Revisar la biblioteca importada

- Estado: Revisión técnica completada; comprobación visual pendiente
- Alcance: ejecutar tests, Clippy, build y consultas de integridad sobre SQLite.
- Verificación: entregar recuentos finales, copia de seguridad y lista explícita de decisiones aplicadas.

**Resultado:** 62 animes, 282 contenidos, 28 continuaciones principales añadidas, catálogo `#1–#62`, cero enlaces de Notion, cero portadas, cero errores de clave foránea y posiciones consecutivas. `PRAGMA integrity_check`, 93 pruebas Rust, Clippy estricto, formato y build TypeScript/Vite correctos.

## T-A08 — Refinar biblioteca y seguimiento de contenidos

- Estado: Implementada; comprobación visual pendiente
- Alcance: ordenación por catálogo, valoración y título; acción rápida para omitir contenidos; conservar confirmación explícita de correcciones manuales.
- Verificación: prueba de la ordenación, progreso sin contenidos omitidos, build y revisión visual.

**Resultado:** selector de ordenación por catálogo ascendente/descendente, valoración ascendente/descendente y título; acción rápida Omitir; build TypeScript/Vite correcto. La regla que excluye contenidos omitidos continúa cubierta por la prueba de dominio existente.

## T-A09 — Rediseñar el historial como unidades vistas

- Estado: Implementada; comprobación visual pendiente
- Alcance: migrar sesiones, crear una entrada por episodio o película, editar fechas y retirar únicamente la última entrada de cada objetivo manteniendo el progreso sincronizado.
- Verificación: pruebas de dominio, repositorio, migración y comandos con progreso importado sin historial.

**Resultado:** cada incremento genera una sesión por episodio; las películas generan una única visualización. La fecha se puede corregir y solo la última entrada de cada contenido se puede retirar, actualizando el progreso en la misma transacción. El progreso importado queda como línea base sin fechas inventadas.

## T-A10 — Refinar estado, puntuación y estudios

- Estado: Implementada; comprobación visual pendiente
- Alcance: estado global manual con sugerencias, edición rápida de estado/puntuación, valores 0–10 con una décima, autocompletado y filtro por estudio derivado.
- Verificación: pruebas Rust de validación, sugerencias y filtros; build frontend.

**Resultado:** estado global manual con sugerencia informativa, controles rápidos de estado y puntuación, validación 0–10 con una décima, escala cromática y estudios derivados con autocompletado y filtro.

## T-A11 — Reorganizar detalle, tarjetas y formularios

- Estado: Implementada; comprobación visual pendiente
- Alcance: tarjetas de contenido más legibles con orden visible, puntuaciones cromáticas, fechas agrupadas, GIF y aviso de cambios sin guardar.
- Verificación: build y revisión visual manual.

**Resultado:** contenidos más altos y jerarquizados, orden `#n`, puntuaciones visibles, fechas coherentes, portadas GIF y confirmación al cerrar formularios con cambios sin guardar.

## T-A12 — Incorporar la vista Historial

- Estado: Implementada; comprobación visual pendiente
- Alcance: navegación principal, filtros por año/mes/anime/contenido, orden temporal, edición de fecha y retirada segura.
- Verificación: pruebas de consulta y recorrido manual.

**Resultado:** Historial es una vista principal con filtros de año, mes, anime y contenido, orden temporal, edición de fecha y retirada segura de la última entrada.

## T-A13 — Unificar búsqueda y filtros compartidos

- Estado: Implementada; comprobación visual pendiente
- Alcance: aplicar tipografía y geometría compartidas a Anime, Comidas, Documentos y Hábitos según `principles.md`.
- Verificación: build y comparación visual de los cuatro módulos.

**Resultado:** controles de búsqueda y filtro comparten una tipografía base de 14 px documentada y aplicada en Anime, Comidas, Documentos y Hábitos.

## Revisión del refinamiento

**Resultado técnico:** 95 pruebas Rust, formato, Clippy estricto, build TypeScript/Vite y `git diff --check` correctos. Queda pendiente la comprobación visual y de interacción en Tauri.

## T-A14 — Pulir jerarquía visual y separar películas anime

- Estado: Implementada; comprobación visual pendiente
- Alcance: reorganizar fechas y puntuación en formularios, sustituir Favorito por estrella, separar franquicias y películas independientes, hacer configurable el Top, mover el número sobre la portada, ordenar acciones de cabecera y rediseñar las tarjetas de contenido.
- Restricciones: no renumerar franquicias, no crear un cuarto módulo audiovisual y no introducir una escala de puntuación morada.
- Verificación: pruebas de asignación y estadísticas, build TypeScript/Vite, Clippy, formato y comprobación visual manual.

**Resultado:** formularios y detalle reorganizados, puntuación principal sin botón auxiliar, estrella rápida para Favorito, Top 5/10/25 limitado a franquicias, dos minivistas de Biblioteca y números superpuestos únicamente en franquicias. La migración 0016 retira números antiguos de películas y recalcula la secuencia sin renumerar animes. 96 pruebas Rust, Clippy estricto, formato, build TypeScript/Vite y `git diff --check` correctos.

## T-A15 — Refinar progreso parcial, transición y densidad visual

- Estado: Implementada; comprobación visual pendiente
- Alcance: conservar totales conocidos ante contenidos futuros, evitar reordenación intermedia al cambiar minivista, autoguardar puntuación, reorganizar tarjetas y compactar el formulario de contenido.
- Restricciones: no modificar nombres persistidos al abreviarlos, no autoguardar correcciones destructivas de progreso y no introducir dependencias de interfaz.
- Verificación: pruebas Rust del progreso parcial, build TypeScript/Vite, Clippy, formato y comprobación visual manual.

**Resultado:** progreso parcial `130 de 150 + ?`, transición limpia entre minivistas, puntuación con autoguardado, nombres abreviados solo en presentación, puntuación separada, estado junto al progreso, acciones en `hover` y formulario dividido en cinco grupos compactos. Se conserva la confirmación explícita para correcciones que alteran historial. 97 pruebas Rust, Clippy estricto, formato, build TypeScript/Vite y `git diff --check` correctos.

## T-A16 — Hacer reversible Omitir y simplificar el seguimiento

- Estado: Implementada; comprobación visual pendiente
- Alcance: permitir volver a incluir un contenido como Canon, editar su estado desde la tarjeta, alinear puntuaciones y eliminar la apariencia de tarjeta anidada del bloque de progreso.
- Restricciones: conservar confirmación explícita para correcciones que modifican historial y no añadir otro estado persistente.
- Verificación: build TypeScript/Vite, pruebas Rust, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** Omitir es reversible y recupera el contenido como Canon; el estado se edita directamente con opciones oscuras; puntuación, progreso y acciones conservan una geometría estable; `Guardar cambios` solo aparece ante una corrección pendiente. Build TypeScript/Vite, 97 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos.

## T-A17 — Agilizar estado, progreso y favoritos

- Estado: Implementada; comprobación visual pendiente
- Alcance: reemplazar el selector de estado de contenidos por un control segmentado accesible, permitir `+1` en contenidos terminados pero incompletos y alternar Favorito desde Biblioteca.
- Restricciones: reutilizar Lucide y estilos propios, mantener Rust como dueño de la regla de incremento y no anidar botones interactivos.
- Verificación: pruebas Rust de incremento, build TypeScript/Vite, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** control segmentado de seis estados accesibles y persistidos, `+1` habilitado por progreso real también desde `nextContent`, y estrella reversible sobre las tarjetas activas de Biblioteca. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto y formato correctos; comprobación visual manual pendiente.

## T-A18 — Reorganizar contenidos y hacer navegable su historial

- Estado: Implementada; comprobación visual pendiente
- Alcance: reutilizar el selector segmentado en el anime, corregir estados activos y tooltips, alinear `+1` con la fecha, separar los metadatos de tarjeta y navegar al historial completo o filtrado.
- Restricciones: no inventar fechas para progreso importado, no añadir persistencia ni dependencias y mantener los accesos de historial disponibles en contenido archivado.
- Verificación: build TypeScript/Vite, pruebas Rust existentes, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** selector segmentado reutilizado en anime y contenidos, seis estados activos con tooltip propio, progreso alineado con `+1` junto a la fecha, metadatos jerarquizados y accesos al historial completo o filtrado con primera actividad real. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos.

## T-A19 — Navegar al historial y convertir contenidos en tarjetas

- Estado: Implementada; comprobación visual pendiente
- Alcance: retirar el historial incrustado del detalle, navegar a la vista principal Historial con anime y contenido preseleccionados, hacer dependiente el filtro de contenido, conservar allí el resumen de primera actividad y presentar los contenidos en una cuadrícula de dos tarjetas por fila.
- Restricciones: reutilizar la consulta de Historial existente, conservar los filtros como estado efímero de React, no añadir persistencia ni dependencias y tomar la imagen de referencia únicamente como guía de distribución.
- Verificación: abrir Historial desde anime y contenido con los filtros correctos; comprobar que cambiar de anime limpia el contenido incompatible y que aparecen también contenidos sin sesiones; verificar la primera actividad sin inventar fechas; probar dos columnas y la alternativa responsive de una; reordenar tarjetas mediante arrastre; ejecutar build TypeScript/Vite, pruebas Rust existentes, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** el detalle navega a la vista principal Historial con anime y contenido preseleccionados; el selector dependiente se alimenta de todos los contenidos del título; la primera actividad permanece visible sin inferir fechas; y los contenidos usan una cuadrícula responsive de dos tarjetas que conserva el orden lineal y el arrastre por ID. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos. La comprobación visual e interactiva con datos reales queda pendiente.

## T-A20 — Compactar tarjetas y alinear la cabecera del detalle

- Estado: Implementada; comprobación visual pendiente
- Alcance: convertir Editar en acción de icono, eliminar la caja anidada del estado general, mantener visible `Guardar cambios` y retirar el espacio que las acciones ocultas reservan en las tarjetas de contenido.
- Restricciones: conservar nombres accesibles y tooltips, mantener el guardado manual de correcciones, no modificar persistencia ni comportamiento de progreso y no hacer visibles permanentemente las acciones secundarias.
- Verificación: comparar la altura de puntuaciones y Estado; comprobar los estados habilitado y deshabilitado de `Guardar cambios`; revisar tarjetas con y sin metadatos; probar acciones mediante ratón y teclado; ejecutar build TypeScript/Vite, pruebas Rust existentes, Clippy, formato y `git diff --check`.

**Resultado:** Editar usa un botón de icono con tooltip y nombre accesible; el selector general pierde su borde y fondo interiores; `Guardar cambios` permanece visible y desactivado sin borrador; y las acciones secundarias se posicionan fuera de la cuadrícula para no crear una fila vacía. Las tarjetas reducen su altura mínima y distribuyen identidad, estado y progreso mediante `space-between`. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos. Comprobación visual en Tauri pendiente.

## T-A21 — Distribuir los metadatos de contenido

- Estado: Implementada; comprobación visual pendiente
- Alcance: sustituir la columna compacta de clasificación, estreno e historial por una rejilla fluida que utilice el ancho superior de la tarjeta.
- Restricciones: conservar la jerarquía del título y la puntuación, no añadir información, mantener Historial como botón accesible y permitir que Estudio o Estreno sean opcionales sin huecos fijos.
- Verificación: revisar contenidos con y sin Estudio, Estreno y puntuación; comprobar títulos largos y las vistas de dos y una columna; ejecutar build TypeScript/Vite y `git diff --check`.

**Resultado:** Tipo, Canonicidad, Estudio, Estreno e Historial forman una rejilla `auto-fit` que usa el ancho libre, omite celdas opcionales sin reservar huecos y conserva la jerarquía de título y puntuación. Build TypeScript/Vite y `git diff --check` correctos. Comprobación visual en Tauri pendiente.

## T-A22 — Alinear puntuación y acciones de seguimiento

- Estado: Implementada; comprobación visual pendiente
- Alcance: alinear la puntuación con la parte superior de la tarjeta, retirar Historial de los metadatos y situar `Guardar cambios` bajo el contador y `Ver historial` bajo la fecha con sus mismas anchuras.
- Restricciones: conservar el acceso filtrado al historial, el guardado manual del progreso y la distribución responsive; no modificar dominio ni persistencia.
- Verificación: revisar tarjetas puntuadas y sin puntuar, comprobar la alineación de las dos filas de seguimiento, ejecutar build TypeScript/Vite y `git diff --check`.

**Resultado:** la puntuación queda alineada con la parte superior de la identidad; Historial deja de ocupar una celda de metadatos y se alinea bajo la fecha, mientras `Guardar cambios` conserva el ancho del contador. Build TypeScript/Vite y `git diff --check` correctos. Comprobación visual en Tauri pendiente.

## T-A23 — Aclarar estudio y pegar portadas

- Estado: Implementada; comprobación visual pendiente
- Alcance: retirar el rótulo redundante Anime de las tarjetas, presentar el estudio como metadato diferenciado y admitir portadas pegadas convertidas a JPEG.
- Restricciones: el estudio continúa perteneciendo al contenido y se edita desde su formulario; GIF sigue admitido al elegir un archivo.
- Verificación: build, formulario de contenido y pegado manual de PNG/WebP.

## T-A24 — Separar información e historial por contenido

- Estado: Implementada; comprobación visual pendiente
- Alcance: añadir dos vistas locales a cada tarjeta sin duplicar sesiones ni crear otra fuente de verdad.
- Verificación: cambiar de vista en varias tarjetas, registrar progreso y abrir Historial con anime y contenido preseleccionados.

**Resultado:** cada tarjeta alterna localmente entre `Información` e `Historial`; los metadatos y el selector de estado no compiten con los controles de progreso, y el acceso al historial global conserva el contenido preseleccionado. Build TypeScript/Vite correcto.

## T-A25 — Suavizar la biblioteca y recolocar portadas

- Estado: Implementada; comprobación visual pendiente
- Alcance: impedir que el cambio Anime/Películas Anime reordene resultados antiguos y persistir la posición porcentual de cada portada Media.
- Verificación: alternar secciones con filtros activos, arrastrar portadas verticales y horizontales, reiniciar y comprobar su posición.

**Resultado:** la subsección nueva se consulta antes de sustituir atómicamente la colección visible; durante la espera la cuadrícula se atenúa sin vaciarse ni cambiar de orden. La migración 0024 persiste coordenadas porcentuales validadas por Rust y el editor permite arrastrar y centrar la portada. 112 pruebas Rust, Clippy estricto y build TypeScript/Vite correctos.

## T-A26 — Redistribuir las vistas de contenido

- Estado: Implementada; comprobación visual pendiente
- Alcance: sustituir la geometría heredada de la tarjeta por una rejilla-resumen en Información y un editor de seguimiento jerarquizado en Historial.
- Restricciones: no cambiar datos, comandos ni reglas de progreso; mantener acciones secundarias en `hover` o foco y conservar visible `Guardar cambios`.
- Verificación: revisar tarjetas con metadatos opcionales, comprobar que Estado nunca se solapa con acciones y probar historial con progreso conocido, desconocido, completo y pendiente.

**Resultado:** Información usa una rejilla-resumen para puntuación, tipo, canonicidad, estudio y estreno; Estado ocupa una franja independiente y las acciones secundarias un lateral reservado. Historial presenta resumen y barra de progreso, controles etiquetados y una fila final simétrica para guardar o abrir el historial completo. La alternativa estrecha apila los controles y sitúa las acciones en una fila propia. Build TypeScript/Vite correcto; comprobación visual en Tauri pendiente.

## T-A27 — Simplificar la cabecera de Información

- Estado: Implementada; comprobación visual pendiente
- Alcance: centrar el selector de vista, trasladar las acciones al extremo superior derecho y sustituir el estado rápido por un resumen de progreso seguido de la tabla informativa.
- Restricciones: Estado continúa editable en el formulario; Historial no cambia y el resumen de progreso se reutiliza sin duplicar cálculos.
- Verificación: revisar títulos largos, contenidos archivados y tarjetas con diferentes cantidades de metadatos; comprobar que cabecera, progreso y tabla conservan su alineación.

**Resultado:** la cabecera usa tres zonas equilibradas: título a la izquierda, vistas centradas y acciones permanentes a la derecha. Información reutiliza el resumen y la barra de progreso de Historial, elimina el selector rápido de estado y presenta después la tabla de metadatos. Estado continúa disponible en Editar. Build TypeScript/Vite correcto; comprobación visual en Tauri pendiente.

## T-A28 — Desacoplar navegación, identidad y seguimiento

- Estado: Implementada; comprobación visual pendiente
- Alcance: bajar el título a una línea independiente, mostrar Estado como dato textual, ordenar las acciones finales de Historial, simplificar `Registrar +1`, robustecer el arrastre de portada y ordenar Opinión antes de Anotaciones.
- Restricciones: no cambiar dominio ni persistencia, conservar Estado editable únicamente en el formulario y mantener el guardado explícito de correcciones.
- Verificación: probar títulos largos, todos los estados, una corrección con y sin cambios, acceso filtrado al historial y encuadre mediante arrastre y controles de eje.

**Resultado:** las pestañas ocupan una barra propia y el título baja a una segunda línea; Estado aparece como texto cromático en el resumen; Historial alinea acceso y guardado en el orden acordado; `Registrar +1` pierde el icono redundante; el formulario coloca Opinión antes de Anotaciones; y el editor sigue el puntero a nivel de ventana y añade ajuste explícito por ejes. Build TypeScript/Vite y `git diff --check` correctos; comprobación visual en Tauri pendiente.

## T-A29 — Simplificar Información y corregir el gesto de encuadre

- Estado: Implementada; comprobación visual pendiente
- Alcance: trasladar el estado textual a la esquina superior izquierda, separar la puntuación de los metadatos y sustituir la captura de puntero del editor de portada por seguimiento global del ratón.
- Restricciones: Estado continúa editable desde el formulario; no eliminar fechas históricas ni cambiar dominio o persistencia en esta tarea.
- Verificación: probar todos los estados, tarjetas con metadatos opcionales y arrastre horizontal/vertical desde distintos puntos de una portada recortada.

**Resultado:** Estado ocupa el hueco superior izquierdo como texto cromático; la puntuación abarca dos filas y los metadatos se reparten en una rejilla 2 × 2. El editor instala listeners de ratón globales desde su montaje, muestra las coordenadas actuales y conserva los deslizadores como alternativa. Build TypeScript/Vite y `git diff --check` correctos; falta comprobar el gesto con una portada realmente recortada dentro de Tauri.

## T-A30 — Aclarar metadatos temporales y acceso al encuadre

- Estado: Implementada; comprobación visual pendiente
- Alcance: retirar inicio/fin del formulario de contenido, conservar Estreno, rellenar siempre la rejilla informativa, dar cuerpo al estado, centrar la puntuación y hacer visible el acceso al editor sobre la portada.
- Restricciones: conservar valores históricos ya importados, no inventar sesiones y mantener Biblioteca como acción de navegación.
- Verificación: editar contenido con y sin estudio/estreno, comprobar que los valores históricos no se borran, abrir `Ajustar` desde la portada y guardar un encuadre.

**Resultado:** el formulario conserva internamente inicio/fin importados pero solo muestra Estreno; la tabla siempre reserva Estudio y Estreno, Estado tiene cuerpo visual y Puntuación queda centrada. El acceso `Ajustar` aparece sobre la portada de los detalles Anime, Series y Películas y sustituye al icono ambiguo de cabecera. Las estadísticas Anime ya contabilizaban sesiones desde `media_watch_sessions`; ningún agregado dependía de las fechas manuales del contenido. Build TypeScript/Vite y `git diff --check` correctos; comprobación visual en Tauri pendiente.

## T-A31 — Añadir zoom al encuadre de portadas

- Estado: Implementada; comprobación visual pendiente
- Alcance: persistir un zoom entre 1× y 2×, previsualizar el recorte dentro de un marco fijo y aplicar X, Y y zoom en todas las portadas Media.
- Restricciones: la migración asigna 1× a portadas existentes; Rust valida los tres valores y React solo mantiene el borrador previo a guardar.
- Verificación: comprobar 1× sin recorte, ampliar una portada, moverla en ambos ejes, guardar, reiniciar y verificar Biblioteca y detalle.

**Resultado:** la migración 0025 añade zoom 1×–2×; modelo, repositorio y comando validan y persisten X/Y/zoom. El marco morado representa la vista final, el control Zoom crea excedente visible y todas las portadas Media aplican el encuadre guardado. El editor se comparte con Lectura y Videojuegos y el acceso `Ajustar` se revela por hover o foco. Comprobación visual en Tauri pendiente.

## T-A32 — Simplificar Anime y normalizar portadas horizontales

- Estado: Implementada; comprobación visual pendiente.
- Alcance: retirar estudios de formularios, tarjetas, filtros y estadísticas; mostrar el último visionado real en cada contenido; utilizar marcos horizontales en todas las vistas de Anime.
- Restricciones: conservar las columnas audiovisuales heredadas por compatibilidad, mantener puntuaciones y opiniones, y obtener la actividad únicamente del historial real.
- Verificación: revisar Biblioteca, En curso, detalle, formularios, estadísticas y editor de encuadre; ejecutar build TypeScript/Vite y pruebas Rust.

## T-A33 — Reiniciar y auditar el catálogo importado

- Estado: Implementada; revisión de discrepancias pendiente.
- Alcance: reiniciar exclusivamente los estados, episodios e historial de Anime y contrastar orden recomendado, contenidos ausentes y estrenos verificables en España.
- Restricciones: preservar los otros módulos, títulos, opiniones, puntuaciones y números de catálogo; no inventar fechas españolas ni agregar contenidos no aprobados.
- Verificación: contar franquicias y contenidos antes/después, comprobar progreso cero e historial Anime vacío, e informar sobre discrepancias y títulos sin distribución española verificable.

## T-A34 — Completar y simplificar franquicias aprobadas

- Estado: Implementada; revisión manual pendiente.
- Alcance: incorporar los contenidos de Steins;Gate y Fairy Tail en orden recomendado, conservar las rutas alternativas existentes de otras franquicias, reclasificar el promocional de Dungeon Meshi y dejar únicamente la primera temporada de Danganronpa.
- Restricciones: proteger la base con una copia previa, no crear historiales ficticios y no inventar fechas de estreno españolas.
- Verificación: comprobar títulos, posiciones, cantidades de episodios y progreso inicial; conservar inalterados los demás módulos.

## T-A35 — Unificar formulario, colección y portadas animadas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: ofrecer favorito en el formulario, utilizar ejemplos específicos de Anime, renombrar la sección Películas, mostrar el estado fuera de la portada, conservar la ordenación y permitir GIF pegados que solo se animan al pasar el cursor por la tarjeta.
- Verificación: pegar GIF y formatos estáticos, revisar tarjetas y favoritos, reiniciar la aplicación y comprobar la ordenación elegida.

## T-A36 — Simplificar la cabecera y el resumen de Anime

- Estado: Implementada; comprobación visual pendiente.
- Alcance: retirar el selector iconográfico superior, igualar y centrar las dos puntuaciones, abrir el detalle sin enfocar automáticamente la nota y mostrar el estado textual en el resumen junto a Progreso y Contenidos.
- Verificación: revisar franquicias y películas independientes, comprobar ambos valores y modificar el estado desde el formulario de edición.

## T-A37 — Unificar navegación de contenidos, portadas y estadísticas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: utilizar un único selector `Información / Historial` para todos los contenidos, identificar portadas GIF detenidas, ampliar el editor con imagen completa y recorte final, convertir géneros en una selección visual y permitir estadísticas combinadas o separadas entre Anime y Películas.
- Restricciones: conservar el estado global manual; las sugerencias se muestran a la izquierda inmediatamente encima del resumen y nunca se aplican automáticamente.
- Verificación: alternar la vista global con contenidos de distinto tipo, ajustar una portada recortada, reproducir un GIF y combinar los tres ámbitos estadísticos.

**Resultado:** la jerarquía de los contenidos deja de repetirse tarjeta por tarjeta, el encuadre revela la zona que quedará visible, los GIF se reconocen antes de reproducirse y las estadísticas distinguen Anime, Películas o toda la colección.

## T-A38 — Compactar metadatos y centrar la navegación del contenido

- Estado: Implementada; comprobación visual pendiente.
- Alcance: impedir que los géneros se repartan por toda la tarjeta, centrar geométricamente el selector global `Información / Historial` e igualar la caja de puntuación con Lectura.
- Restricciones: la ausencia de nota se representa mediante `—` en todos los trackers y estadísticas que reutilizan el formateador común.
- Verificación: revisar tarjetas con uno, dos y tres géneros, contenidos en ambas vistas y títulos con o sin puntuación.

**Resultado:** los géneros forman un grupo compacto y legible con la escala compartida de etiquetas a 11 px; las pestañas ya no dependen del ancho de los filtros y la puntuación comparte 58 × 48 px con Lectura. Anime, Películas y Series reutilizan además el título global de tarjeta a 18 px.

## T-A39 — Centralizar contenidos e historial de la franquicia

- Estado: Implementada; comprobación visual pendiente.
- Alcance: sustituir las vistas repetidas de cada tarjeta por una selección global `Contenidos / Historial`, convertir las tarjetas en resúmenes audiovisuales, agrupar sesiones por contenido y fecha y registrar varios episodios desde un único formulario.
- Restricciones: conservar una sesión persistida por episodio, permitir retirar únicamente el último bloque de cada contenido y mantener disponible la vista Historial completa para correcciones detalladas.
- Verificación: registrar uno y varios episodios, editar la fecha agrupada, retirar el último bloque, reordenar tarjetas y comprobar puntuaciones nulas y de todos los tramos SeriesGraph.

**Resultado:** Contenidos queda libre de formularios repetidos; el estado aparece bajo el título, el progreso ocupa el pie izquierdo y la puntuación una celda coloreada con texto blanco. Historial adopta el patrón de Lectura y registra contenido, fecha y cantidad sin perder el detalle episodio a episodio. La sugerencia global se desplaza a la parte superior del detalle.

## T-A40 — Consolidar puntuaciones y acciones de Historial

- Estado: Implementada; comprobación visual pendiente.
- Alcance: reutilizar la celda SeriesGraph en los cinco trackers, integrar la sugerencia en la identidad del anime, reunir el acceso completo y las dos formas de registro en la cabecera de Historial y separar estreno y último visionado en las tarjetas.
- Restricciones: `+1 episodio` prioriza el contenido marcado como Viendo y, si no existe, utiliza el siguiente contenido que el dominio declara avanzable; registrar varios episodios conserva una sesión persistida por episodio; `Añadir contenido` permanece disponible solo en Contenidos.
- Verificación: revisar notas puntuadas y vacías en colecciones, detalles y estadísticas; avanzar un episodio desde Historial; registrar varios; abrir el historial completo; comprobar el formulario y tarjetas en ancho normal y estrecho.

**Resultado:** puntuaciones, medias y rankings comparten una única celda cromática; la sugerencia deja de competir con la portada; Historial ofrece `Ver historial completo`, `+1 episodio` y `Registrar visionado` en una sola zona; y los metadatos temporales dejan de colisionar en una línea.

## T-A41 — Simplificar puntuaciones y estados de unidades

- Estado: Implementada; comprobación visual pendiente.
- Alcance: retirar `/ 10` y los contenedores exteriores de las notas del detalle, expresar los contenidos unitarios como `Visto / No visto` y confirmar cualquier estado derivado al registrar películas independientes.
- Restricciones: el progreso episódico no modifica estados; cambiar manualmente el estado de una película de anime no inventa una sesión con fecha actual.
- Verificación: revisar anime con y sin notas, OVA y películas a cero y uno, y aceptar o mantener una sugerencia de estado tras registrar un visionado.

**Resultado:** las notas conservan únicamente su celda SeriesGraph y el seguimiento de unidades deja de mostrar la redundancia `0 de 1`.

## T-A42 — Reequilibrar la cabecera horizontal del detalle

- Estado: Implementada; comprobación visual pendiente.
- Alcance: separar portada, identidad, puntuaciones y acciones en cuatro zonas de cabecera y mantener el resumen general como una fila completa inferior.
- Restricciones: conservar la portada 16:9, las dos puntuaciones editables y todas las acciones accesibles; no alterar contenidos ni historial.
- Verificación: revisar títulos cortos y largos, con una o dos puntuaciones, activos y archivados, en escritorio, anchura intermedia y móvil.

**Resultado:** la cabecera deja de crecer únicamente bajo el título y aprovecha el ancho disponible sin convertir la portada horizontal en una composición vertical.

## T-A43 — Unificar la navegación del detalle

- Estado: Implementada; comprobación visual pendiente.
- Alcance: presentar `Contenidos / Historial` como una barra de ancho completo con iconos, reutilizando el patrón de los trackers simples.
- Restricciones: conservar filtros y creación dentro de Contenidos, y las acciones de registro dentro de Historial.
- Verificación: alternar ambas vistas en una franquicia con varios contenidos y comprobar teclado, foco y anchura estrecha.

**Resultado:** la navegación de la franquicia comparte geometría, tamaño y accesibilidad con `Resumen / Historial` de Lectura, Videojuegos y Películas.

## T-A44 — Evitar contenido obsoleto al cambiar de vista

- Estado: Implementada; comprobación visual pendiente.
- Alcance: invalidar las tarjetas de Biblioteca al entrar en En curso y mantener el estado de carga hasta recibir la consulta correspondiente.
- Verificación: alternar varias veces entre Biblioteca y En curso con una colección grande y comprobar que ninguna tarjeta ajena muestra temporalmente `+1 episodio`.

**Resultado:** cada vista renderiza únicamente datos de su propia consulta y la transición deja de transformar fugazmente la Biblioteca en En curso.

## T-A45 — Completar clasificación y acelerar portadas animadas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: asignar géneros a las entradas existentes sin clasificación; guardar una miniatura JPEG ligera para cada GIF, cargar el GIF completo únicamente al interactuar y conservar una caché acotada de animaciones recientes; adoptar la barra común de búsqueda y filtros de Media.
- Restricciones: no alterar títulos, contenidos ni puntuaciones; los formatos estáticos conservan su flujo actual y la caché debe liberar URLs al expulsarlas.
- Verificación: migrar una colección existente, abrir Biblioteca sin descargar todos los GIF, activar varias animaciones por hover y comprobar filtros completos en anchuras intermedias.

**Resultado:** los títulos existentes quedan clasificados, cada GIF persiste una miniatura JPEG después de su primera reproducción y Biblioteca conserva como máximo cuatro animaciones completas en memoria; los filtros se distribuyen sin truncar su valor.

## T-A46 — Recuperar visionados de películas y alternancia inmediata

- Estado: Implementada; comprobación visual pendiente.
- Alcance: retirar la fecha duplicada del formulario de película Anime, impedir que el estado Terminado cree progreso sin historial, recuperar películas existentes bloqueadas sin sesiones y alternar Anime/Películas sobre una colección ya cargada.
- Restricciones: conservar el estado manual y las sesiones existentes; no inventar fechas ni modificar películas convencionales.
- Verificación: crear y editar una película Anime terminada sin historial, registrar su primer visionado y alternar repetidamente ambas subsecciones con filtros y ordenaciones independientes.

**Resultado:** las películas Anime solo avanzan mediante una entrada explícita de Historial; la migración 0032 conserva como sesión cualquier fecha antigua verificable y libera las entradas sin fecha para registrar su primer visionado. El formulario deja de duplicar esa fecha y Anime/Películas alternan mediante filtrado local sobre una sola colección. 120 pruebas Rust, formato y build TypeScript/Vite correctos; comprobación visual en Tauri pendiente.

## T-A47 — Historial editable de películas Anime

- Estado: Implementada; comprobación visual pendiente.
- Alcance: separar el registro inmediato del registro fechado y añadir edición y eliminación a cada visionado desde el detalle de la película.
- Restricciones: migrar la sesión existente sin duplicarla, reutilizar el historial repetible compartido con Películas y confirmar cualquier cambio automático de estado al añadir o retirar un visionado.
- Verificación: registrar con hoy y con una fecha anterior, añadir un revisionado, corregir ambas fechas, eliminar una entrada y aceptar o rechazar la sugerencia de estado resultante.

**Resultado:** el detalle ofrece `Registrar hoy` como atajo y `Registrar visionado` como formulario con fecha; los botones permanecen disponibles tras el primer visionado y cada revisionado puede editarse o eliminarse con el patrón visual de Lectura. La migración 0033 conserva la entrada histórica previa en el almacenamiento repetible compartido. Build TypeScript/Vite, 121 pruebas Rust, Clippy estricto y formato correctos; comprobación visual en Tauri pendiente.
