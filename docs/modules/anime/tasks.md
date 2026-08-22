# Tareas — Anime

- Estado: T-A01 a T-A22 implementadas; comprobación manual pendiente
- Última actualización: 2026-08-22

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
