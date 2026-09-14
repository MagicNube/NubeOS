# Tareas — Anime

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-09
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.
- Verificación consolidada: build de producción e instalador NSIS generados el 2026-09-03; 149 pruebas Rust y 29 pruebas aisladas de nombres y confirmaciones correctas. Instalación y validación con datos reales pendientes.

## T-A65 — Adoptar la navegación contextual compartida

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: usar la ruta fija para identificar Anime, un único título principal por vista, pestañas secundarias bajo el título y acciones de colección en la barra contextual.
- Verificación: comprobación TypeScript y revisión de whitespace correctas; sin build instalable en esta tarea.

## T-A66 — Simplificar identidad, ruta y filtros

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: ruta `NubeOS › Anime › vista`, cabecera reducida a Anime, selector Anime/Películas integrado en la barra principal y filtros secundarios bajo divulgación progresiva.
- Verificación: TypeScript correcto y revisión visual en Biblioteca; sin build instalable.

## T-A64 — Filtros de contenidos e historial compacto

- Estado: Implementada; revisión visual pendiente de Nube.
- Autorización: solicitud del 2026-09-04.
- Alcance: filtro visual de omitidos, Archivo sin creación, historial global con edición de fecha en modal y acciones al hover/foco. Sin Primera actividad.
- Borrado: auditado; no depende del estado. Se conserva la restricción del último episodio del progreso principal y se explica en la ayuda. Permitir huecos requiere una decisión sobre el modelo de progreso.
- Verificación: TypeScript, prueba de persistencia del último episodio y regresiones de Anime correctas; revisión visual pendiente.

## T-A63 — Sugerencias por contenidos y subtítulos sin redundancia

- Estado: Implementada y aprobada por Nube.
- Alcance: sugerir Abandonado o En pausa según el último contenido marcado en el orden recomendado, Pendiente si todos los disponibles siguen pendientes sin progreso, Viendo si hay actividad y Esperando contenido cuando solo queda contenido por salir. Excluir Omitidos y conservar las reglas de finalización y Por retomar.
- Interfaz: confirmar la sugerencia al cambiar estados, disponibilidad, inclusión u orden; Mantener conserva el cambio de contenido sin modificar el anime. No repetir avisos al editar solo nombres, fechas o notas.
- Nombres: abreviar `Temporada 2 — Anime: Subtítulo` como `Temporada 2 — Subtítulo`, también con nombre alternativo y distintos guiones. Conservar títulos oficiales sin marcador y todos los nombres persistidos.
- Verificación: pruebas Rust de prioridades y exclusiones; pruebas de aceptar/mantener y nombres en TypeScript. Sin build ni modificaciones de datos personales.

**Resultado:** propuestas coherentes con el último estado marcado, todos pendientes y solo futuros; diálogo compartido tras cambios relevantes de contenidos, conservando Mantener y la propuesta Por retomar. Horimiya y Solo Leveling muestran solo el subtítulo tras Temporada 2, sin modificar nombres persistidos ni recortar No Game No Life: Zero. 149 pruebas Rust, 29 pruebas de nombres/confirmaciones y TypeScript sin emisión correctos. Sin build ni acceso a datos personales.

## T-A62 — Recorridos de visionado con intervalos

- Refinamiento solicitado el 2026-09-04: normalizar el desplegable En curso/Terminado/Interrumpido con los campos Media y aislarlo de la tipografía secundaria de fechas. Sin cambios de dominio ni datos.

- Estado: Implementada y aprobada por Nube.
- Alcance: agrupar registros por recorrido de cada contenido, continuar desde el siguiente episodio sugerido o empezar otro recorrido, introducir y editar intervalos inclusivos y fecha, y cerrar o interrumpir un recorrido sin cambiar el estado del anime.
- Migración: conservar el progreso original como recorrido base y cada registro adicional antiguo como recorrido independiente; nunca inferir que dos registros antiguos pertenecen al mismo recorrido. Etiquetas ordenadas cronológicamente.
- Reglas: no duplicar episodios dentro de un recorrido; para repetirlos se crea otro. Se admiten registros antiguos fuera de orden, con fechas válidas desde el estreno y no futuras. El rango no supera el total conocido. Los revisionados no inflan ni reducen el progreso principal. Los periodos interrumpidos pueden retomarse explícitamente.
- Verificación: migración con datos, HxH 1–60 → 61–75, nuevo 1–10, solapamientos, límites, contenido ajeno, edición/borrado, estados y persistencia. Sin build ni modificación de la base personal durante el desarrollo.

**Resultado:** el historial agrupa los intervalos por recorrido y ofrece Continuar y Nuevo recorrido. El formulario sugiere el primer episodio pendiente y permite editar inicio/final; los recorridos independientes no alteran el progreso principal ni el estado del anime. Un recorrido interrumpido se retoma eligiendo En curso. Corregir un recorrido cerrado conserva su estado manual y permite reabrirlo explícitamente. La migración 0037 conserva los episodios, fechas y puntuaciones existentes. 147 pruebas Rust y TypeScript sin emisión correctos; comprobación de navegador con datos ficticios: 61–75, nuevo 1–10, bloqueo de solapamientos, límite 148, edición 61–80 y acceso directo Continuar. Sin build ni acceso a la base personal.

## T-A61 — Etiquetar revisionados por fecha real

- Estado: Implementada y aprobada por Nube.
- Alcance: determinar la etiqueta Revisionado por la fecha de visionado de episodios del mismo contenido, no por el orden de introducción. Recalcular al consultar tras crear, editar o borrar registros; el formulario no anticipa una etiqueta basada solo en el contador.
- Restricciones: no alterar fechas, episodios, puntuaciones ni el progreso ya guardado. Separar la clasificación cronológica visible de la marca interna que protege las correcciones de progreso. Episodios diferentes no constituyen por sí solos un revisionado. A igualdad de día, desempate estable priorizando el registro base.
- Verificación: fechas desordenadas, edición que invierte el orden, eliminación del más antiguo, bloques parciales, distintos contenidos y empate de fechas; pruebas Rust y TypeScript. Sin build.

**Resultado:** Rust deriva `isChronologicalRewatch` según la primera fecha registrada de cada episodio del mismo contenido; React lo usa únicamente para la etiqueta del grupo. El registro de 170 episodios de 2022 precede al de 2026 aunque se haya introducido después. Se conserva la marca interna que protege progreso y permisos de edición/borrado. El formulario se denomina Registrar visionado y deja de prometer un revisionado antes de guardar. 143 pruebas Rust, 9 pruebas de confirmaciones y TypeScript sin emisión correctos. Sin migración ni modificación de datos personales; pendiente de build.

## T-A60 — Avisar de Anime pendiente con progreso registrado

- Estado: Implementada y aprobada por Nube.
- Alcance: sugerir Viendo para un anime Pendiente con progreso disponible ya registrado, aunque solo haya temporadas completas y otras sin empezar. Al aumentar episodios, confirmar el cambio del anime además del contenido; conservar las sugerencias de cierre cuando se termina todo lo disponible.
- Restricciones: nunca cambiar estados sin confirmación; mantener el historial si se rechaza, no corregir datos existentes en lote, no extender el nuevo aviso a otros estados ni a películas. Omitidos y Por salir no cuentan. Corregir solo fechas o reducir progreso no repite el aviso.
- Verificación: pruebas Rust de la sugerencia y pruebas del flujo aceptar/mantener, finalización, estados manuales y cambios sin aumento. TypeScript sin emisión. Sin build salvo nueva petición.

**Resultado:** la sugerencia de Rust cubre temporadas completas seguidas de otras pendientes cuando el anime continúa en Pendiente. Tras aumentar episodios, el flujo de registro confirma también la sugerencia del anime. Se conserva el aviso de cierre completo y no se insiste tras una simple edición de fecha. 139 pruebas Rust, 9 pruebas aisladas del flujo y TypeScript sin emisión correctos. No se cambian datos existentes ni el ejecutable instalado.

## T-A59 — Progreso visible y estrenos españoles

- Build posterior autorizada (2026-09-03): producción y NSIS correctos, 137 pruebas Rust superadas; ejecutable instalado actualizado con copia preventiva y verificación SHA-256. Aplicación abierta y respondiendo. La auditoría pendiente de estrenos españoles no se considera cerrada por esta build.

- Decisión actual aprobada (2026-09-03): porcentaje principal grande en morado, con `32 de 54 episodios` a su derecha en gris, anclados siempre abajo a la izquierda. Sin barra, anillo ni cápsula. El contenido por salir aparece a la derecha del estado, encima del título, como texto gris sin cápsula y solo cuando existe. Los avisos de total desconocido preceden al progreso. En anchos reducidos las filas permiten saltos. Biblioteca, En curso y prueba aislada comparten la fila de estado. Sin build ni cambios en datos.
- Verificación: Biblioteca y En curso comparten componente; TypeScript sin emisión y comprobación de diff correctos. Revisión visual pendiente de Nube. Sin build.

- Iteración visual aprobada (2026-09-03): comparar la barra con un anillo morado junto al contador, abajo a la izquierda. La prueba permite alternar las dos opciones; no cambia todavía la variante predeterminada de Biblioteca, no toca datos ni genera build.
- Resultado de la comparación: anillo SVG de 48 px, porcentaje centrado y contador lateral. Probados los seis casos y el cambio Barra/Anillo; sin desbordamiento a 408 px de ventana. TypeScript correcto.
- Aplicación aprobada (2026-09-03): usar el anillo por defecto en todas las tarjetas Anime de Biblioteca y En curso para continuar la revisión visual; sin build ni cambios en datos.
- Verificación de aplicación: ambos listados reutilizan la variante predeterminada; TypeScript y revisión de diferencias correctos. Los seis ejemplos del navegador muestran anillo.

- Estado: Porcentaje en texto implementado y verificado; revisión visual pendiente de Nube. Criterio España aprobado; conversión del catálogo parcialmente aplicada y todavía abierta.
- Alcance: barra morada fina y porcentaje junto al contador en los previews de Biblioteca y En curso. Unificar el criterio del catálogo a primera disponibilidad legal en España, incluido cine y subtítulos.
- Restricciones: sin build ni instalación; no tocar notas personales, historial, progreso, estados ni puntuaciones al corregir fechas. Respaldar datos y documentar fuentes/incertidumbres fuera del repositorio. No inventar estrenos españoles.
- Verificación: TypeScript sin emisión, pruebas de dominio y vista aislada con 0 %, parcial, completo, total desconocido, omitidos/futuros y anchura estrecha.

**Resultado (2026-09-03):** barra compartida en Biblioteca y En curso; 137 pruebas Rust y TypeScript sin emisión correctos. Vista aislada `tests/anime-progress.html` con seis casos y sin desbordamiento. Se han corregido 20 estrenos españoles en la base local, con copia preventiva y comparación integral de las 29 tablas y 199 archivos: no cambia ningún dato personal. Quedan estrenos sin evidencia territorial suficiente y una discrepancia con un visionado previo por revisar. Fuentes y lista completa de fechas vacías en el informe privado `estrenos-espana-y-progreso-2026-09-03.md`, fuera del repositorio. Sin build ni instalación.


## T-A58 — Por retomar

- Estado: Implementada y aprobada por Nube.
- Alcance: nuevo estado manual exclusivo de Anime para volver a una obra con contenido disponible. Añadir etiqueta, ayuda, filtros y estadísticas; sugerirlo al pasar un contenido de Por salir a Pendiente cuando el anime espera contenido.
- Restricciones: no cambiar estados sin confirmación; mantener episodios, historial, portadas y datos. No añadir este estado a temporadas, películas ni series.
- Verificación: migración con datos existentes, restricciones por tipo, aceptar (una escritura) / mantener (cero escrituras), omitir y edición sin cambio de disponibilidad. Prueba aislada de interfaz en `tests/anime-resume.html`, sin datos personales.

**Resultado:** 135 pruebas Rust, Clippy y build NSIS correctos. Migración 0036 aplicada al abrir la instalación; las 30 tablas y 196 archivos administrados coinciden exactamente con la copia preventiva. Inicio automático conservado.

## T-A57 — Ayudas breves y marcar todos los episodios

- Estado: Implementada y aprobada por Nube.
- Alcance: acortar ayudas de estreno/Por salir y añadir una casilla compacta Marcar todo bajo Episodios vistos, alineada con la ayuda de fecha; compilar e instalar.
- Reglas: rellena los episodios restantes en un primer visionado, o el total en un revisionado, sin guardar por sí sola. Con total desconocido queda desactivada; desmarcar recupera el borrador anterior.
- Verificación: cero episodios, progreso parcial, cambio de contenido, revisionado y total desconocido; comprobación visual y build.

**Resultado:** casilla de 16 px alineada con el estreno breve. Prueba del formulario real confirma 0/13 → 13, 3/13 → 10 nuevos, recuperación del borrador, revisionado y desactivación con total desconocido. 131 pruebas Rust correctas y build NSIS completado. Copia preventiva e instalación verificadas, sin modificar datos personales.

## T-A56 — Registro manual y contexto de estreno

- Estado: Implementada y aprobada por Nube.
- Alcance: usar el progreso real para distinguir visionado y revisionado, priorizar un contenido con progreso pendiente al abrir el registro y mostrar estreno/errores junto a la fecha al crear o editar historial.
- Restricciones: conservar los estados manuales y todos los datos; validar también en Rust y no actualizar la instalación sin nueva compilación.
- Verificación: caso Solo Leveling (Terminado con 0/13), progreso parcial, revisionado completo, límites de fecha y mensajes visibles en formulario.

**Resultado:** causa confirmada mediante consulta de solo lectura: T2 estaba Terminado con 0/13 y se enviaba como revisionado, rechazado por Rust. El DTO `canRewatch` unifica la decisión, el formulario prioriza progreso pendiente y los fallos se muestran dentro del modal. El estreno se muestra al registrar, editar instancias y corregir fechas en Historial. 131 pruebas Rust y Clippy correctos; build y prueba aislada del formulario real (`tests/anime-watch.html`) verifican registro normal, revisionado, bloqueo antes del estreno, aceptación el mismo día y error visible. No se modificaron datos personales.

## T-A55 — Contenidos Por salir y cierre de lo disponible

- Estado: Implementada y aprobada por Nube.
- Alcance: reutilizar Esperando contenido como Por salir en contenidos, excluirlos del progreso y proponer Esperando contenido (recomendado), Terminado o Mantener al completar todo lo disponible.
- Restricciones: no inferir disponibilidad por falta de fecha, no cambiar estados automáticamente ni modificar datos existentes; conservar el checkbox de cierre del anime cuando no hay contenidos futuros.
- Verificación: pruebas de totales conocidos/desconocidos, pendientes, omitidos, solo futuros y confirmaciones; build y regresión Rust.

**Resultado:** 129 pruebas Rust, Clippy estricto y build correctos. Verificación aislada en navegador de las tres decisiones, contenido ya marcado Terminado, conservación del progreso y de los futuros, edición de fecha sin avisos y navegación Tab/Escape. Se conserva el tick opcional cuando no hay futuros. No se modificó la base personal ni se actualizó el ejecutable instalado; no requiere migración.

## T-A54 — Homogeneizar nombres, sugerencias y fechas

- Estado: Implementada y aprobada por Nube.
- Alcance: reconocer los separadores importados y el título alternativo al abreviar redundancias en las tarjetas, sin recortar títulos oficiales; sugerir Viendo al aumentar un progreso parcial y permitir Mantener; corregir Tab y el resaltado de los campos de fecha compartidos de Media.
- Restricciones: no modificar nombres persistidos, no cambiar estados sin confirmación, conservar el calendario nativo y la validación de fechas en Rust.
- Verificación: casos de nombres con guiones distintos y títulos oficiales, pruebas Rust de sugerencias, navegación por teclado y colores en fechas, build TypeScript y pruebas de regresión.

**Resultado:** 8 casos de títulos verificados y 127 pruebas Rust correctas, Clippy estricto y build de producción correctos. Prueba aislada de UI confirma Mantener/Cambiar tras registrar 3/12 episodios, Tab entre día/mes/año, expansión 25 → 2025 y selección morada/blanca. `tests/media-inputs.html` permite repetir estas comprobaciones sin acceder a los datos personales. El selector conserva el calendario nativo, con tres segmentos editables propios dentro de una caja común.

## T-A01 — Separar la Biblioteca Anime

- Estado: Implementada y aprobada por Nube.
- Alcance: renombrar el workspace anterior y limitar todas sus consultas a Anime.
- Verificación: build y prueba manual de navegación.

## T-A02 — Admitir películas anime independientes

- Estado: Implementada y aprobada por Nube.
- Alcance: clasificar películas anime directas sin confundirlas con películas convencionales.
- Verificación: pruebas de dominio y persistencia.

## T-A03 — Conservar la jerarquía completa

- Estado: Implementada y aprobada por Nube.
- Alcance: mantener contenidos, orden, progreso, historial, puntuaciones y Archivo.
- Verificación: pruebas Rust existentes y recorrido manual pendiente.

## T-A04 — Revisar el refactor

- Estado: Revisión técnica completada; comprobación manual pendiente
- Alcance: Clippy, formato, pruebas, build y comprobación visual.

**Resultado:** 91 pruebas Rust, Clippy estricto, formato, build TypeScript/Vite y `git diff --check` correctos. La comprobación visual queda pendiente por la restricción del navegador local de esta sesión.

## T-A05 — Ampliar el modelo para la biblioteca importada

- Estado: Implementada y aprobada por Nube.
- Alcance: número de catálogo estable, géneros, fecha de inicio y notas de contenido, puntuaciones en décimas y puntuación efectiva.
- Verificación: migración, pruebas de dominio, repositorio, comandos y build frontend.

## T-A06 — Preparar e importar los datos de Notion

- Estado: Implementada y aprobada por Nube.
- Alcance: auditar los CSV, corregir inconsistencias inequívocas, añadir continuaciones principales confirmadas e importar sin portadas ni URLs.
- Restricción: copia de seguridad previa, transacción única y ninguna fila personal dentro del repositorio.
- Verificación: 62 números de catálogo únicos, relaciones válidas, posiciones consecutivas y ausencia de enlaces Notion.

## T-A07 — Revisar la biblioteca importada

- Estado: Revisión técnica completada; comprobación visual pendiente
- Alcance: ejecutar tests, Clippy, build y consultas de integridad sobre SQLite.
- Verificación: entregar recuentos finales, copia de seguridad y lista explícita de decisiones aplicadas.

**Resultado:** 62 animes, 282 contenidos, 28 continuaciones principales añadidas, catálogo `#1–#62`, cero enlaces de Notion, cero portadas, cero errores de clave foránea y posiciones consecutivas. `PRAGMA integrity_check`, 93 pruebas Rust, Clippy estricto, formato y build TypeScript/Vite correctos.

## T-A08 — Refinar biblioteca y seguimiento de contenidos

- Estado: Implementada y aprobada por Nube.
- Alcance: ordenación por catálogo, valoración y título; acción rápida para omitir contenidos; conservar confirmación explícita de correcciones manuales.
- Verificación: prueba de la ordenación, progreso sin contenidos omitidos, build y revisión visual.

**Resultado:** selector de ordenación por catálogo ascendente/descendente, valoración ascendente/descendente y título; acción rápida Omitir; build TypeScript/Vite correcto. La regla que excluye contenidos omitidos continúa cubierta por la prueba de dominio existente.

## T-A09 — Rediseñar el historial como unidades vistas

- Estado: Implementada y aprobada por Nube.
- Alcance: migrar sesiones, crear una entrada por episodio o película, editar fechas y retirar únicamente la última entrada de cada objetivo manteniendo el progreso sincronizado.
- Verificación: pruebas de dominio, repositorio, migración y comandos con progreso importado sin historial.

**Resultado:** cada incremento genera una sesión por episodio; las películas generan una única visualización. La fecha se puede corregir y solo la última entrada de cada contenido se puede retirar, actualizando el progreso en la misma transacción. El progreso importado queda como línea base sin fechas inventadas.

## T-A10 — Refinar estado, puntuación y estudios

- Estado: Implementada y aprobada por Nube.
- Alcance: estado global manual con sugerencias, edición rápida de estado/puntuación, valores 0–10 con una décima, autocompletado y filtro por estudio derivado.
- Verificación: pruebas Rust de validación, sugerencias y filtros; build frontend.

**Resultado:** estado global manual con sugerencia informativa, controles rápidos de estado y puntuación, validación 0–10 con una décima, escala cromática y estudios derivados con autocompletado y filtro.

## T-A11 — Reorganizar detalle, tarjetas y formularios

- Estado: Implementada y aprobada por Nube.
- Alcance: tarjetas de contenido más legibles con orden visible, puntuaciones cromáticas, fechas agrupadas, GIF y aviso de cambios sin guardar.
- Verificación: build y revisión visual manual.

**Resultado:** contenidos más altos y jerarquizados, orden `#n`, puntuaciones visibles, fechas coherentes, portadas GIF y confirmación al cerrar formularios con cambios sin guardar.

## T-A12 — Incorporar la vista Historial

- Estado: Implementada y aprobada por Nube.
- Alcance: navegación principal, filtros por año/mes/anime/contenido, orden temporal, edición de fecha y retirada segura.
- Verificación: pruebas de consulta y recorrido manual.

**Resultado:** Historial es una vista principal con filtros de año, mes, anime y contenido, orden temporal, edición de fecha y retirada segura de la última entrada.

## T-A13 — Unificar búsqueda y filtros compartidos

- Estado: Implementada y aprobada por Nube.
- Alcance: aplicar tipografía y geometría compartidas a Anime, Comidas, Documentos y Hábitos según `principles.md`.
- Verificación: build y comparación visual de los cuatro módulos.

**Resultado:** controles de búsqueda y filtro comparten una tipografía base de 14 px documentada y aplicada en Anime, Comidas, Documentos y Hábitos.

## Revisión del refinamiento

**Resultado técnico:** 95 pruebas Rust, formato, Clippy estricto, build TypeScript/Vite y `git diff --check` correctos. Queda pendiente la comprobación visual y de interacción en Tauri.

## T-A14 — Pulir jerarquía visual y separar películas anime

- Estado: Implementada y aprobada por Nube.
- Alcance: reorganizar fechas y puntuación en formularios, sustituir Favorito por estrella, separar franquicias y películas independientes, hacer configurable el Top, mover el número sobre la portada, ordenar acciones de cabecera y rediseñar las tarjetas de contenido.
- Restricciones: no renumerar franquicias, no crear un cuarto módulo audiovisual y no introducir una escala de puntuación morada.
- Verificación: pruebas de asignación y estadísticas, build TypeScript/Vite, Clippy, formato y comprobación visual manual.

**Resultado:** formularios y detalle reorganizados, puntuación principal sin botón auxiliar, estrella rápida para Favorito, Top 5/10/25 limitado a franquicias, dos minivistas de Biblioteca y números superpuestos únicamente en franquicias. La migración 0016 retira números antiguos de películas y recalcula la secuencia sin renumerar animes. 96 pruebas Rust, Clippy estricto, formato, build TypeScript/Vite y `git diff --check` correctos.

## T-A15 — Refinar progreso parcial, transición y densidad visual

- Estado: Implementada y aprobada por Nube.
- Alcance: conservar totales conocidos ante contenidos futuros, evitar reordenación intermedia al cambiar minivista, autoguardar puntuación, reorganizar tarjetas y compactar el formulario de contenido.
- Restricciones: no modificar nombres persistidos al abreviarlos, no autoguardar correcciones destructivas de progreso y no introducir dependencias de interfaz.
- Verificación: pruebas Rust del progreso parcial, build TypeScript/Vite, Clippy, formato y comprobación visual manual.

**Resultado:** progreso parcial `130 de 150 + ?`, transición limpia entre minivistas, puntuación con autoguardado, nombres abreviados solo en presentación, puntuación separada, estado junto al progreso, acciones en `hover` y formulario dividido en cinco grupos compactos. Se conserva la confirmación explícita para correcciones que alteran historial. 97 pruebas Rust, Clippy estricto, formato, build TypeScript/Vite y `git diff --check` correctos.

## T-A16 — Hacer reversible Omitir y simplificar el seguimiento

- Estado: Implementada y aprobada por Nube.
- Alcance: permitir volver a incluir un contenido como Canon, editar su estado desde la tarjeta, alinear puntuaciones y eliminar la apariencia de tarjeta anidada del bloque de progreso.
- Restricciones: conservar confirmación explícita para correcciones que modifican historial y no añadir otro estado persistente.
- Verificación: build TypeScript/Vite, pruebas Rust, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** Omitir es reversible y recupera el contenido como Canon; el estado se edita directamente con opciones oscuras; puntuación, progreso y acciones conservan una geometría estable; `Guardar cambios` solo aparece ante una corrección pendiente. Build TypeScript/Vite, 97 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos.

## T-A17 — Agilizar estado, progreso y favoritos

- Estado: Implementada y aprobada por Nube.
- Alcance: reemplazar el selector de estado de contenidos por un control segmentado accesible, permitir `+1` en contenidos terminados pero incompletos y alternar Favorito desde Biblioteca.
- Restricciones: reutilizar Lucide y estilos propios, mantener Rust como dueño de la regla de incremento y no anidar botones interactivos.
- Verificación: pruebas Rust de incremento, build TypeScript/Vite, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** control segmentado de seis estados accesibles y persistidos, `+1` habilitado por progreso real también desde `nextContent`, y estrella reversible sobre las tarjetas activas de Biblioteca. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto y formato correctos; comprobación visual manual pendiente.

## T-A18 — Reorganizar contenidos y hacer navegable su historial

- Estado: Implementada y aprobada por Nube.
- Alcance: reutilizar el selector segmentado en el anime, corregir estados activos y tooltips, alinear `+1` con la fecha, separar los metadatos de tarjeta y navegar al historial completo o filtrado.
- Restricciones: no inventar fechas para progreso importado, no añadir persistencia ni dependencias y mantener los accesos de historial disponibles en contenido archivado.
- Verificación: build TypeScript/Vite, pruebas Rust existentes, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** selector segmentado reutilizado en anime y contenidos, seis estados activos con tooltip propio, progreso alineado con `+1` junto a la fecha, metadatos jerarquizados y accesos al historial completo o filtrado con primera actividad real. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos.

## T-A19 — Navegar al historial y convertir contenidos en tarjetas

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar el historial incrustado del detalle, navegar a la vista principal Historial con anime y contenido preseleccionados, hacer dependiente el filtro de contenido, conservar allí el resumen de primera actividad y presentar los contenidos en una cuadrícula de dos tarjetas por fila.
- Restricciones: reutilizar la consulta de Historial existente, conservar los filtros como estado efímero de React, no añadir persistencia ni dependencias y tomar la imagen de referencia únicamente como guía de distribución.
- Verificación: abrir Historial desde anime y contenido con los filtros correctos; comprobar que cambiar de anime limpia el contenido incompatible y que aparecen también contenidos sin sesiones; verificar la primera actividad sin inventar fechas; probar dos columnas y la alternativa responsive de una; reordenar tarjetas mediante arrastre; ejecutar build TypeScript/Vite, pruebas Rust existentes, Clippy, formato, `git diff --check` y comprobación visual manual.

**Resultado:** el detalle navega a la vista principal Historial con anime y contenido preseleccionados; el selector dependiente se alimenta de todos los contenidos del título; la primera actividad permanece visible sin inferir fechas; y los contenidos usan una cuadrícula responsive de dos tarjetas que conserva el orden lineal y el arrastre por ID. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos. La comprobación visual e interactiva con datos reales queda pendiente.

## T-A20 — Compactar tarjetas y alinear la cabecera del detalle

- Estado: Implementada y aprobada por Nube.
- Alcance: convertir Editar en acción de icono, eliminar la caja anidada del estado general, mantener visible `Guardar cambios` y retirar el espacio que las acciones ocultas reservan en las tarjetas de contenido.
- Restricciones: conservar nombres accesibles y tooltips, mantener el guardado manual de correcciones, no modificar persistencia ni comportamiento de progreso y no hacer visibles permanentemente las acciones secundarias.
- Verificación: comparar la altura de puntuaciones y Estado; comprobar los estados habilitado y deshabilitado de `Guardar cambios`; revisar tarjetas con y sin metadatos; probar acciones mediante ratón y teclado; ejecutar build TypeScript/Vite, pruebas Rust existentes, Clippy, formato y `git diff --check`.

**Resultado:** Editar usa un botón de icono con tooltip y nombre accesible; el selector general pierde su borde y fondo interiores; `Guardar cambios` permanece visible y desactivado sin borrador; y las acciones secundarias se posicionan fuera de la cuadrícula para no crear una fila vacía. Las tarjetas reducen su altura mínima y distribuyen identidad, estado y progreso mediante `space-between`. Build TypeScript/Vite, 98 pruebas Rust, Clippy estricto, formato y `git diff --check` correctos. Comprobación visual en Tauri pendiente.

## T-A21 — Distribuir los metadatos de contenido

- Estado: Implementada y aprobada por Nube.
- Alcance: sustituir la columna compacta de clasificación, estreno e historial por una rejilla fluida que utilice el ancho superior de la tarjeta.
- Restricciones: conservar la jerarquía del título y la puntuación, no añadir información, mantener Historial como botón accesible y permitir que Estudio o Estreno sean opcionales sin huecos fijos.
- Verificación: revisar contenidos con y sin Estudio, Estreno y puntuación; comprobar títulos largos y las vistas de dos y una columna; ejecutar build TypeScript/Vite y `git diff --check`.

**Resultado:** Tipo, Canonicidad, Estudio, Estreno e Historial forman una rejilla `auto-fit` que usa el ancho libre, omite celdas opcionales sin reservar huecos y conserva la jerarquía de título y puntuación. Build TypeScript/Vite y `git diff --check` correctos. Comprobación visual en Tauri pendiente.

## T-A22 — Alinear puntuación y acciones de seguimiento

- Estado: Implementada y aprobada por Nube.
- Alcance: alinear la puntuación con la parte superior de la tarjeta, retirar Historial de los metadatos y situar `Guardar cambios` bajo el contador y `Ver historial` bajo la fecha con sus mismas anchuras.
- Restricciones: conservar el acceso filtrado al historial, el guardado manual del progreso y la distribución responsive; no modificar dominio ni persistencia.
- Verificación: revisar tarjetas puntuadas y sin puntuar, comprobar la alineación de las dos filas de seguimiento, ejecutar build TypeScript/Vite y `git diff --check`.

**Resultado:** la puntuación queda alineada con la parte superior de la identidad; Historial deja de ocupar una celda de metadatos y se alinea bajo la fecha, mientras `Guardar cambios` conserva el ancho del contador. Build TypeScript/Vite y `git diff --check` correctos. Comprobación visual en Tauri pendiente.

## T-A23 — Aclarar estudio y pegar portadas

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar el rótulo redundante Anime de las tarjetas, presentar el estudio como metadato diferenciado y admitir portadas pegadas convertidas a JPEG.
- Restricciones: el estudio continúa perteneciendo al contenido y se edita desde su formulario; GIF sigue admitido al elegir un archivo.
- Verificación: build, formulario de contenido y pegado manual de PNG/WebP.

## T-A24 — Separar información e historial por contenido

- Estado: Implementada y aprobada por Nube.
- Alcance: añadir dos vistas locales a cada tarjeta sin duplicar sesiones ni crear otra fuente de verdad.
- Verificación: cambiar de vista en varias tarjetas, registrar progreso y abrir Historial con anime y contenido preseleccionados.

**Resultado:** cada tarjeta alterna localmente entre `Información` e `Historial`; los metadatos y el selector de estado no compiten con los controles de progreso, y el acceso al historial global conserva el contenido preseleccionado. Build TypeScript/Vite correcto.

## T-A25 — Suavizar la biblioteca y recolocar portadas

- Estado: Implementada y aprobada por Nube.
- Alcance: impedir que el cambio Anime/Películas Anime reordene resultados antiguos y persistir la posición porcentual de cada portada Media.
- Verificación: alternar secciones con filtros activos, arrastrar portadas verticales y horizontales, reiniciar y comprobar su posición.

**Resultado:** la subsección nueva se consulta antes de sustituir atómicamente la colección visible; durante la espera la cuadrícula se atenúa sin vaciarse ni cambiar de orden. La migración 0024 persiste coordenadas porcentuales validadas por Rust y el editor permite arrastrar y centrar la portada. 112 pruebas Rust, Clippy estricto y build TypeScript/Vite correctos.

## T-A26 — Redistribuir las vistas de contenido

- Estado: Implementada y aprobada por Nube.
- Alcance: sustituir la geometría heredada de la tarjeta por una rejilla-resumen en Información y un editor de seguimiento jerarquizado en Historial.
- Restricciones: no cambiar datos, comandos ni reglas de progreso; mantener acciones secundarias en `hover` o foco y conservar visible `Guardar cambios`.
- Verificación: revisar tarjetas con metadatos opcionales, comprobar que Estado nunca se solapa con acciones y probar historial con progreso conocido, desconocido, completo y pendiente.

**Resultado:** Información usa una rejilla-resumen para puntuación, tipo, canonicidad, estudio y estreno; Estado ocupa una franja independiente y las acciones secundarias un lateral reservado. Historial presenta resumen y barra de progreso, controles etiquetados y una fila final simétrica para guardar o abrir el historial completo. La alternativa estrecha apila los controles y sitúa las acciones en una fila propia. Build TypeScript/Vite correcto; comprobación visual en Tauri pendiente.

## T-A27 — Simplificar la cabecera de Información

- Estado: Implementada y aprobada por Nube.
- Alcance: centrar el selector de vista, trasladar las acciones al extremo superior derecho y sustituir el estado rápido por un resumen de progreso seguido de la tabla informativa.
- Restricciones: Estado continúa editable en el formulario; Historial no cambia y el resumen de progreso se reutiliza sin duplicar cálculos.
- Verificación: revisar títulos largos, contenidos archivados y tarjetas con diferentes cantidades de metadatos; comprobar que cabecera, progreso y tabla conservan su alineación.

**Resultado:** la cabecera usa tres zonas equilibradas: título a la izquierda, vistas centradas y acciones permanentes a la derecha. Información reutiliza el resumen y la barra de progreso de Historial, elimina el selector rápido de estado y presenta después la tabla de metadatos. Estado continúa disponible en Editar. Build TypeScript/Vite correcto; comprobación visual en Tauri pendiente.

## T-A28 — Desacoplar navegación, identidad y seguimiento

- Estado: Implementada y aprobada por Nube.
- Alcance: bajar el título a una línea independiente, mostrar Estado como dato textual, ordenar las acciones finales de Historial, simplificar `Registrar +1`, robustecer el arrastre de portada y ordenar Opinión antes de Anotaciones.
- Restricciones: no cambiar dominio ni persistencia, conservar Estado editable únicamente en el formulario y mantener el guardado explícito de correcciones.
- Verificación: probar títulos largos, todos los estados, una corrección con y sin cambios, acceso filtrado al historial y encuadre mediante arrastre y controles de eje.

**Resultado:** las pestañas ocupan una barra propia y el título baja a una segunda línea; Estado aparece como texto cromático en el resumen; Historial alinea acceso y guardado en el orden acordado; `Registrar +1` pierde el icono redundante; el formulario coloca Opinión antes de Anotaciones; y el editor sigue el puntero a nivel de ventana y añade ajuste explícito por ejes. Build TypeScript/Vite y `git diff --check` correctos; comprobación visual en Tauri pendiente.

## T-A29 — Simplificar Información y corregir el gesto de encuadre

- Estado: Implementada y aprobada por Nube.
- Alcance: trasladar el estado textual a la esquina superior izquierda, separar la puntuación de los metadatos y sustituir la captura de puntero del editor de portada por seguimiento global del ratón.
- Restricciones: Estado continúa editable desde el formulario; no eliminar fechas históricas ni cambiar dominio o persistencia en esta tarea.
- Verificación: probar todos los estados, tarjetas con metadatos opcionales y arrastre horizontal/vertical desde distintos puntos de una portada recortada.

**Resultado:** Estado ocupa el hueco superior izquierdo como texto cromático; la puntuación abarca dos filas y los metadatos se reparten en una rejilla 2 × 2. El editor instala listeners de ratón globales desde su montaje, muestra las coordenadas actuales y conserva los deslizadores como alternativa. Build TypeScript/Vite y `git diff --check` correctos; falta comprobar el gesto con una portada realmente recortada dentro de Tauri.

## T-A30 — Aclarar metadatos temporales y acceso al encuadre

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar inicio/fin del formulario de contenido, conservar Estreno, rellenar siempre la rejilla informativa, dar cuerpo al estado, centrar la puntuación y hacer visible el acceso al editor sobre la portada.
- Restricciones: conservar valores históricos ya importados, no inventar sesiones y mantener Biblioteca como acción de navegación.
- Verificación: editar contenido con y sin estudio/estreno, comprobar que los valores históricos no se borran, abrir `Ajustar` desde la portada y guardar un encuadre.

**Resultado:** el formulario conserva internamente inicio/fin importados pero solo muestra Estreno; la tabla siempre reserva Estudio y Estreno, Estado tiene cuerpo visual y Puntuación queda centrada. El acceso `Ajustar` aparece sobre la portada de los detalles Anime, Series y Películas y sustituye al icono ambiguo de cabecera. Las estadísticas Anime ya contabilizaban sesiones desde `media_watch_sessions`; ningún agregado dependía de las fechas manuales del contenido. Build TypeScript/Vite y `git diff --check` correctos; comprobación visual en Tauri pendiente.

## T-A31 — Añadir zoom al encuadre de portadas

- Estado: Implementada y aprobada por Nube.
- Alcance: persistir un zoom entre 1× y 2×, previsualizar el recorte dentro de un marco fijo y aplicar X, Y y zoom en todas las portadas Media.
- Restricciones: la migración asigna 1× a portadas existentes; Rust valida los tres valores y React solo mantiene el borrador previo a guardar.
- Verificación: comprobar 1× sin recorte, ampliar una portada, moverla en ambos ejes, guardar, reiniciar y verificar Biblioteca y detalle.

**Resultado:** la migración 0025 añade zoom 1×–2×; modelo, repositorio y comando validan y persisten X/Y/zoom. El marco morado representa la vista final, el control Zoom crea excedente visible y todas las portadas Media aplican el encuadre guardado. El editor se comparte con Lectura y Videojuegos y el acceso `Ajustar` se revela por hover o foco. Comprobación visual en Tauri pendiente.

## T-A32 — Simplificar Anime y normalizar portadas horizontales

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar estudios de formularios, tarjetas, filtros y estadísticas; mostrar el último visionado real en cada contenido; utilizar marcos horizontales en todas las vistas de Anime.
- Restricciones: conservar las columnas audiovisuales heredadas por compatibilidad, mantener puntuaciones y opiniones, y obtener la actividad únicamente del historial real.
- Verificación: revisar Biblioteca, En curso, detalle, formularios, estadísticas y editor de encuadre; ejecutar build TypeScript/Vite y pruebas Rust.

## T-A33 — Reiniciar y auditar el catálogo importado

- Estado: Implementada y aprobada por Nube.
- Alcance: reiniciar exclusivamente los estados, episodios e historial de Anime y contrastar orden recomendado, contenidos ausentes y estrenos verificables en España.
- Restricciones: preservar los otros módulos, títulos, opiniones, puntuaciones y números de catálogo; no inventar fechas españolas ni agregar contenidos no aprobados.
- Verificación: contar franquicias y contenidos antes/después, comprobar progreso cero e historial Anime vacío, e informar sobre discrepancias y títulos sin distribución española verificable.

## T-A34 — Completar y simplificar franquicias aprobadas

- Estado: Implementada y aprobada por Nube.
- Alcance: incorporar los contenidos de Steins;Gate y Fairy Tail en orden recomendado, conservar las rutas alternativas existentes de otras franquicias, reclasificar el promocional de Dungeon Meshi y dejar únicamente la primera temporada de Danganronpa.
- Restricciones: proteger la base con una copia previa, no crear historiales ficticios y no inventar fechas de estreno españolas.
- Verificación: comprobar títulos, posiciones, cantidades de episodios y progreso inicial; conservar inalterados los demás módulos.

## T-A35 — Unificar formulario, colección y portadas animadas

- Estado: Implementada y aprobada por Nube.
- Alcance: ofrecer favorito en el formulario, utilizar ejemplos específicos de Anime, renombrar la sección Películas, mostrar el estado fuera de la portada, conservar la ordenación y permitir GIF pegados que solo se animan al pasar el cursor por la tarjeta.
- Verificación: pegar GIF y formatos estáticos, revisar tarjetas y favoritos, reiniciar la aplicación y comprobar la ordenación elegida.

## T-A36 — Simplificar la cabecera y el resumen de Anime

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar el selector iconográfico superior, igualar y centrar las dos puntuaciones, abrir el detalle sin enfocar automáticamente la nota y mostrar el estado textual en el resumen junto a Progreso y Contenidos.
- Verificación: revisar franquicias y películas independientes, comprobar ambos valores y modificar el estado desde el formulario de edición.

## T-A37 — Unificar navegación de contenidos, portadas y estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: utilizar un único selector `Información / Historial` para todos los contenidos, identificar portadas GIF detenidas, ampliar el editor con imagen completa y recorte final, convertir géneros en una selección visual y permitir estadísticas combinadas o separadas entre Anime y Películas.
- Restricciones: conservar el estado global manual; las sugerencias se muestran a la izquierda inmediatamente encima del resumen y nunca se aplican automáticamente.
- Verificación: alternar la vista global con contenidos de distinto tipo, ajustar una portada recortada, reproducir un GIF y combinar los tres ámbitos estadísticos.

**Resultado:** la jerarquía de los contenidos deja de repetirse tarjeta por tarjeta, el encuadre revela la zona que quedará visible, los GIF se reconocen antes de reproducirse y las estadísticas distinguen Anime, Películas o toda la colección.

## T-A38 — Compactar metadatos y centrar la navegación del contenido

- Estado: Implementada y aprobada por Nube.
- Alcance: impedir que los géneros se repartan por toda la tarjeta, centrar geométricamente el selector global `Información / Historial` e igualar la caja de puntuación con Lectura.
- Restricciones: la ausencia de nota se representa mediante `—` en todos los trackers y estadísticas que reutilizan el formateador común.
- Verificación: revisar tarjetas con uno, dos y tres géneros, contenidos en ambas vistas y títulos con o sin puntuación.

**Resultado:** los géneros forman un grupo compacto y legible con la escala compartida de etiquetas a 11 px; las pestañas ya no dependen del ancho de los filtros y la puntuación comparte 58 × 48 px con Lectura. Anime, Películas y Series reutilizan además el título global de tarjeta a 18 px.

## T-A39 — Centralizar contenidos e historial de la franquicia

- Estado: Implementada y aprobada por Nube.
- Alcance: sustituir las vistas repetidas de cada tarjeta por una selección global `Contenidos / Historial`, convertir las tarjetas en resúmenes audiovisuales, agrupar sesiones por contenido y fecha y registrar varios episodios desde un único formulario.
- Restricciones: conservar una sesión persistida por episodio, permitir retirar únicamente el último bloque de cada contenido y mantener disponible la vista Historial completa para correcciones detalladas.
- Verificación: registrar uno y varios episodios, editar la fecha agrupada, retirar el último bloque, reordenar tarjetas y comprobar puntuaciones nulas y de todos los tramos SeriesGraph.

**Resultado:** Contenidos queda libre de formularios repetidos; el estado aparece bajo el título, el progreso ocupa el pie izquierdo y la puntuación una celda coloreada con texto blanco. Historial adopta el patrón de Lectura y registra contenido, fecha y cantidad sin perder el detalle episodio a episodio. La sugerencia global se desplaza a la parte superior del detalle.

## T-A40 — Consolidar puntuaciones y acciones de Historial

- Estado: Implementada y aprobada por Nube.
- Alcance: reutilizar la celda SeriesGraph en los cinco trackers, integrar la sugerencia en la identidad del anime, reunir el acceso completo y las dos formas de registro en la cabecera de Historial y separar estreno y último visionado en las tarjetas.
- Restricciones: `+1 episodio` prioriza el contenido marcado como Viendo y, si no existe, utiliza el siguiente contenido que el dominio declara avanzable; registrar varios episodios conserva una sesión persistida por episodio; `Añadir contenido` permanece disponible solo en Contenidos.
- Verificación: revisar notas puntuadas y vacías en colecciones, detalles y estadísticas; avanzar un episodio desde Historial; registrar varios; abrir el historial completo; comprobar el formulario y tarjetas en ancho normal y estrecho.

**Resultado:** puntuaciones, medias y rankings comparten una única celda cromática; la sugerencia deja de competir con la portada; Historial ofrece `Ver historial completo`, `+1 episodio` y `Registrar visionado` en una sola zona; y los metadatos temporales dejan de colisionar en una línea.

## T-A41 — Simplificar puntuaciones y estados de unidades

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar `/ 10` y los contenedores exteriores de las notas del detalle, expresar los contenidos unitarios como `Visto / No visto` y confirmar cualquier estado derivado al registrar películas independientes.
- Restricciones: el progreso episódico no modifica estados; cambiar manualmente el estado de una película de anime no inventa una sesión con fecha actual.
- Verificación: revisar anime con y sin notas, OVA y películas a cero y uno, y aceptar o mantener una sugerencia de estado tras registrar un visionado.

**Resultado:** las notas conservan únicamente su celda SeriesGraph y el seguimiento de unidades deja de mostrar la redundancia `0 de 1`.

## T-A42 — Reequilibrar la cabecera horizontal del detalle

- Estado: Implementada y aprobada por Nube.
- Alcance: separar portada, identidad, puntuaciones y acciones en cuatro zonas de cabecera y mantener el resumen general como una fila completa inferior.
- Restricciones: conservar la portada 16:9, las dos puntuaciones editables y todas las acciones accesibles; no alterar contenidos ni historial.
- Verificación: revisar títulos cortos y largos, con una o dos puntuaciones, activos y archivados, en escritorio, anchura intermedia y móvil.

**Resultado:** la cabecera deja de crecer únicamente bajo el título y aprovecha el ancho disponible sin convertir la portada horizontal en una composición vertical.

## T-A43 — Unificar la navegación del detalle

- Estado: Implementada y aprobada por Nube.
- Alcance: presentar `Contenidos / Historial` como una barra de ancho completo con iconos, reutilizando el patrón de los trackers simples.
- Restricciones: conservar filtros y creación dentro de Contenidos, y las acciones de registro dentro de Historial.
- Verificación: alternar ambas vistas en una franquicia con varios contenidos y comprobar teclado, foco y anchura estrecha.

**Resultado:** la navegación de la franquicia comparte geometría, tamaño y accesibilidad con `Resumen / Historial` de Lectura, Videojuegos y Películas.

## T-A44 — Evitar contenido obsoleto al cambiar de vista

- Estado: Implementada y aprobada por Nube.
- Alcance: invalidar las tarjetas de Biblioteca al entrar en En curso y mantener el estado de carga hasta recibir la consulta correspondiente.
- Verificación: alternar varias veces entre Biblioteca y En curso con una colección grande y comprobar que ninguna tarjeta ajena muestra temporalmente `+1 episodio`.

**Resultado:** cada vista renderiza únicamente datos de su propia consulta y la transición deja de transformar fugazmente la Biblioteca en En curso.

## T-A45 — Completar clasificación y acelerar portadas animadas

- Estado: Implementada y aprobada por Nube.
- Alcance: asignar géneros a las entradas existentes sin clasificación; guardar una miniatura JPEG ligera para cada GIF, cargar el GIF completo únicamente al interactuar y conservar una caché acotada de animaciones recientes; adoptar la barra común de búsqueda y filtros de Media.
- Restricciones: no alterar títulos, contenidos ni puntuaciones; los formatos estáticos conservan su flujo actual y la caché debe liberar URLs al expulsarlas.
- Verificación: migrar una colección existente, abrir Biblioteca sin descargar todos los GIF, activar varias animaciones por hover y comprobar filtros completos en anchuras intermedias.

**Resultado:** los títulos existentes quedan clasificados, cada GIF persiste una miniatura JPEG después de su primera reproducción y Biblioteca conserva como máximo cuatro animaciones completas en memoria; los filtros se distribuyen sin truncar su valor.

## T-A46 — Recuperar visionados de películas y alternancia inmediata

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar la fecha duplicada del formulario de película Anime, impedir que el estado Terminado cree progreso sin historial, recuperar películas existentes bloqueadas sin sesiones y alternar Anime/Películas sobre una colección ya cargada.
- Restricciones: conservar el estado manual y las sesiones existentes; no inventar fechas ni modificar películas convencionales.
- Verificación: crear y editar una película Anime terminada sin historial, registrar su primer visionado y alternar repetidamente ambas subsecciones con filtros y ordenaciones independientes.

**Resultado:** las películas Anime solo avanzan mediante una entrada explícita de Historial; la migración 0032 conserva como sesión cualquier fecha antigua verificable y libera las entradas sin fecha para registrar su primer visionado. El formulario deja de duplicar esa fecha y Anime/Películas alternan mediante filtrado local sobre una sola colección. 120 pruebas Rust, formato y build TypeScript/Vite correctos; comprobación visual en Tauri pendiente.

## T-A47 — Historial editable de películas Anime

- Estado: Implementada y aprobada por Nube.
- Alcance: separar el registro inmediato del registro fechado y añadir edición y eliminación a cada visionado desde el detalle de la película.
- Restricciones: migrar la sesión existente sin duplicarla, reutilizar el historial repetible compartido con Películas y confirmar cualquier cambio automático de estado al añadir o retirar un visionado.
- Verificación: registrar con hoy y con una fecha anterior, añadir un revisionado, corregir ambas fechas, eliminar una entrada y aceptar o rechazar la sugerencia de estado resultante.

**Resultado:** el detalle ofrece `Registrar hoy` como atajo y `Registrar visionado` como formulario con fecha; los botones permanecen disponibles tras el primer visionado y cada revisionado puede editarse o eliminarse con el patrón visual de Lectura. La migración 0033 conserva la entrada histórica previa en el almacenamiento repetible compartido. Build TypeScript/Vite, 121 pruebas Rust, Clippy estricto y formato correctos; comprobación visual en Tauri pendiente.

## T-A48 — Proteger títulos largos de las acciones

- Estado: Implementada y aprobada por Nube.
- Alcance: reservar en la cabecera de cada contenido el ancho completo de Omitir, Editar y Eliminar, permitiendo que el título ocupe hasta dos líneas.
- Verificación: revisar contenidos con nombres largos en la cuadrícula de dos columnas y con las acciones visibles mediante `hover` y teclado.

**Resultado:** el nombre conserva su jerarquía y nunca queda debajo de las acciones iconográficas.

## T-A49 — Permitir puntuaciones con centésimas

- Estado: Implementada y aprobada por Nube.
- Alcance: aceptar coma o punto durante la edición rápida, conservar el foco mientras se escribe y persistir puntuaciones entre 0 y 10 con hasta dos decimales.
- Verificación: introducir `9,11`, esperar el autoguardado, reabrir el anime y comprobar también `10`, `0`, un separador incompleto y un tercer decimal.

**Resultado:** escribir la coma ya no dispara un guardado parcial y valores como `9,11` se conservan en dominio, SQLite y presentación.

## T-A50 — Conservar títulos oficiales de contenido

- Estado: Implementada y aprobada por Nube.
- Alcance: dejar de retirar automáticamente el nombre de la franquicia cuando aparece antes de `:` en una temporada, película, OVA o especial.
- Verificación: revisar `No Game No Life: Zero` y otros contenidos cuyo nombre oficial comienza por el título de su anime.

**Resultado:** solo se eliminan marcadores importados realmente redundantes; las tarjetas muestran el nombre oficial completo.

## T-A51 — Sugerir Terminado al completar un contenido

- Estado: Implementada y aprobada por Nube.
- Alcance: detectar cuándo un registro múltiple o `+1 episodio` alcanza por primera vez el total conocido del contenido y ofrecer cambiar su estado a Terminado; si es el último contenido pendiente, permitir decidir mediante un checkbox si se termina también el anime.
- Restricciones: no modificar el estado silenciosamente, no sugerir nada si ya estaba completo o Terminado y conservar el estado actual cuando se rechaza la propuesta.
- Verificación: completar una temporada desde el formulario y desde En curso, aceptando y rechazando la propuesta en casos separados.

**Resultado:** completar el progreso abre la confirmación compartida de estados; aceptar actualiza el contenido y, cuando completa toda la obra, un checkbox compacto controla si también se actualiza el anime. Mantener conserva ambos estados previos.

## T-A52 — Validar visionados posteriores al estreno

- Estado: Implementada y aprobada por Nube.
- Alcance: impedir que `+1`, el registro múltiple o la edición del historial sitúen un episodio antes del estreno conocido de su contenido.
- Restricciones: aplicar la regla en Rust como fuente de verdad y reflejar el límite en los selectores de fecha; los contenidos sin estreno continúan aceptando cualquier fecha no futura.
- Verificación: intentar registrar y editar un episodio el día anterior, el mismo día y el día posterior al estreno.

**Resultado:** las fechas anteriores se rechazan con un mensaje específico; el mismo día del estreno y cualquier fecha posterior válida se conservan.

## T-A53 — Registrar revisionados de contenidos Anime

- Estado: Implementada y aprobada por Nube.
- Alcance: mantener disponibles en Historial los contenidos completados, registrar cada revisionado como un bloque independiente y permitir corregir su fecha o eliminarlo.
- Restricciones: no aumentar el progreso por encima del total, no reducirlo al borrar un revisionado y conservar la protección aplicada a episodios originales intermedios.
- Verificación: completar una temporada, registrar dos revisionados —incluidos dos en la misma fecha—, editar uno, eliminarlo y corregir después el progreso original.

**Resultado:** la migración 0035 identifica cada bloque de registro y distingue los revisionados. El formulario cambia de modo al elegir un contenido completo, las instancias pueden repetirse, editarse y eliminarse, y el contador principal permanece independiente. El editor permite corregir fecha y cantidad, acota los episodios durante la escritura y vuelve a validarlos en Rust; la nota del contenido se edita con autoguardado desde su tarjeta. 32 pruebas Media y build TypeScript/Vite correctos; comprobación visual en Tauri pendiente.

## T-A67 — Igualar selectores y jerarquía lateral

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: compartir el `hover` morado entre filtros y ordenación, mantener título alfabético como orden neutro sin indicador persistente y presentar Entretenimiento como categoría secundaria alineada al inicio.
- Verificación: TypeScript, revisión del diff y comparación visual en tema oscuro; sin build instalable.

## T-A68 — Mostrar el último visionado en películas Anime

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: sustituir la etiqueta redundante `Vista / No vista` de las tarjetas de películas Anime por la fecha del último visionado, conservando el estado en su posición superior y usando el historial repetible de películas como fuente real.
- Resultado: la actividad de una película toma la última fecha sincronizada de `media_movie_viewings`; el resumen superior sustituye `Contenidos 0` por el número de `Visionados`.
- Verificación: revisar películas con y sin historial en Biblioteca y En curso; pruebas Rust, TypeScript y comprobación del diff. Sin build instalable.

## T-A69 — Simplificar recorridos, filtros e historial

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: admitir varios estados en Biblioteca, añadir orden por porcentaje visto, usar título como desempate, retirar los controles repetidos de cada recorrido y reorganizar el historial global con anime, contenido y fechas en tres niveles claros.
- Restricciones: conservar estados y recorridos persistidos, mantener la edición y eliminación de bloques, y no retirar la vista Historial principal.
- Verificación: combinar tres estados, ordenar porcentajes en ambos sentidos, registrar un recorrido desde un episodio intermedio y revisar historial con y sin estreno. Build TypeScript/Vite correcta; sin build instalable.

## T-A70 — Pulir filtros, puntuación y resumen de visionado

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: separar visualmente el nombre de cada filtro de su control, integrar el foco de la puntuación editable en la celda cromática y expresar el borrador de visionado como `Episodio 1 (1 episodio)` o `Episodios 2–4 (3 episodios)`.
- Restricciones: conservar foco visible por teclado, la escala cromática SeriesGraph y el cálculo inclusivo del intervalo.
- Verificación: recorrer la puntuación con teclado, comparar etiquetas y controles de filtros y probar intervalos de uno y varios episodios. TypeScript/Vite y revisión visual; sin build instalable.

## T-A71 — Numerar el resultado y guardar la ordenación elegida

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: calcular el número de cada tarjeta después de aplicar búsqueda, filtros y orden; retirar Catálogo del selector y permitir guardar explícitamente cualquier orden como predeterminado para Anime y Películas Anime por separado.
- Restricciones: el orden alfabético continúa siendo el valor inicial neutro y todo empate se resuelve por título.
- Verificación: combinar filtro y orden, comprobar numeración consecutiva y volver a cada tipo de biblioteca tras guardar una preferencia. TypeScript/Vite correcto.

## T-A72 — Alinear el historial global con Lectura

- Estado: Implementada y aprobada por Nube.
- Alcance: reunir episodio, contenido y anime en el título de cada entrada; colocar la fecha del visionado debajo, conservar el estreno como contexto a la derecha y reutilizar el icono morado de calendario de Lectura.
- Restricciones: no modificar sesiones ni reglas de edición y eliminación; mantener las acciones secundarias en `hover` o foco.
- Verificación: revisar temporadas, OVA, especiales y películas con y sin estreno, además de la adaptación a anchura estrecha.

**Resultado:** el historial global adopta la jerarquía compacta de Lectura sin perder la identidad del contenido ni el contexto objetivo de estreno.

## T-A73 — Limpiar cabecera y conservar Historial

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: usar un título plano, colocar Archivo y Añadir anime junto a las vistas, excluir la ordenación del contador de filtros y reutilizar Historial al volver con los mismos filtros.
- Verificación: TypeScript correcto y comprobación visual de la cabecera compartida; sin build instalable.

## T-A74 — Ampliar filtros de Biblioteca

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: filtrar por género, disponibilidad y rango de puntuación, año de actividad, progreso y contenido por salir mediante un constructor progresivo compartido; separar la ordenación en un acceso propio, usar título alfabético como valor neutro y señalar en morado cualquier alternativa.
- Resultado: los filtros actúan sobre la colección cargada, la búsqueda por título alternativo se conserva y «Omitidos» sustituye a la etiqueta ambigua anterior.

## T-A75 — Unificar confirmaciones accesibles

- Estado: Implementada el 2026-09-08.
- Alcance: sustituir las confirmaciones nativas de eliminación y descarte del núcleo Media por el diálogo compartido accesible.
- Restricciones: no modificar progreso, estados derivados, historial ni contratos.
- Verificación: pruebas de interfaz, build y recorrido de cancelación y confirmación.

**Resultado:** Media ya no usa confirmaciones nativas; títulos, contenidos, visionados y formularios muestran consecuencias y acciones concretas en un diálogo accesible compartido.

## T-A76 — Recuperar el borde visible de las tarjetas

- Estado: Implementada el 2026-09-09 por petición directa de Nube.
- Alcance: aumentar el contraste estructural del borde en las tarjetas de Biblioteca Anime y en las tarjetas de Contenidos del detalle.
- Restricciones: conservar dimensiones, fondos, radios, estados de arrastre y distribución existentes; no modificar Películas, Series ni datos.
- Verificación: revisar reposo, `hover`, foco interior, arrastre y destino de arrastre; ejecutar pruebas de interfaz y build TypeScript/Vite.

**Resultado:** ambos tipos de tarjeta recuperan un borde gris-violeta perceptible sobre el fondo oscuro y lo refuerzan en `hover` o foco, sin competir con el morado de los estados de arrastre.

**Corrección visual:** la primera subida de contraste de un solo píxel seguía perdiéndose en la superficie del diálogo. Tras revisar la captura real se añadió una superficie diferenciada y profundidad interior/exterior al contorno, con una prueba de regresión que exige borde, fondo y sombra en ambos tipos de tarjeta.

**Sustituida por T-A78:** la revisión conjunta de Media confirmó que ese refuerzo rompía la coherencia con Lectura y las demás bibliotecas.

## T-A77 — Unificar las superficies del detalle Anime

- Estado: Implementada el 2026-09-09 por petición directa de Nube.
- Alcance: revisar el detalle completo y delimitar con el mismo sistema el resumen de Progreso/Contenidos/Estado, las tarjetas de Contenidos, los recorridos y las listas de Historial.
- Restricciones: conservar el detalle sin cajas alrededor de las puntuaciones, la cuadrícula de dos columnas, el historial persistido y los estados de arrastre.
- Verificación: revisar Contenidos e Historial con y sin recorridos, etiquetas secundarias, foco y anchura estrecha; ejecutar pruebas de interfaz y build instalable.

**Resultado:** el detalle dispone de tokens locales para borde, separador, superficie y texto secundario; resumen, contenidos e historial comparten una jerarquía perceptible. Los números de orden, fechas y controles de arrastre recuperan contraste, y el botón Archivar recibe un nombre accesible explícito.

**Sustituida visualmente por T-A78:** se conserva la mejora de legibilidad secundaria y se retiran los tokens locales de superficie y borde en favor del sistema compartido.

## T-A78 — Alinear Anime con la jerarquía compartida de Media

- Estado: Implementada el 2026-09-09 por petición directa de Nube.
- Alcance: retirar la iluminación violeta permanente de las tarjetas de Anime y reutilizar en su resumen el mismo componente de métricas que Lectura y el resto de trackers.
- Restricciones: conservar el morado para interacción y arrastre; no modificar las superficies del resto de Media ni los datos mostrados.
- Verificación: comprobar reposo, `hover`, foco, arrastre, separadores del resumen y adaptación estrecha; ejecutar pruebas de interfaz y build instalable.

**Resultado:** las tarjetas parten de borde y superficie neutros, se realzan solo al interactuar y Progreso, Contenidos y Estado usan la cuadrícula compartida con separadores reales.

## T-A79 — Recuperar contornos neutros perceptibles en el detalle

- Estado: Implementada el 2026-09-09 por petición directa de Nube y revisión de capturas reales.
- Alcance: aumentar el contraste neutro de las tarjetas de Contenidos, los recorridos y las listas de Historial sin volver al borde violeta permanente.
- Restricciones: no modificar Biblioteca ni el resto de Media; conservar morado para selección, foco de controles y arrastre.
- Verificación: revisar tarjetas completas, recorridos, entradas agrupadas y películas Anime en reposo e interacción; ejecutar pruebas de interfaz y build instalable.

**Resultado:** las superficies extensas del detalle quedan delimitadas por un gris neutro visible y sus divisores internos conservan un contraste secundario.

**Consolidada por T-A80:** el contraste deja de ser una excepción local de Anime y pasa a formar parte del sistema compartido de tarjetas históricas.

## T-A80 — Hacer visibles las tarjetas de Contenidos e Historial

- Estado: Implementada el 2026-09-09 por petición directa de Nube.
- Alcance: aplicar el contorno estructural compartido a las tarjetas de Contenidos, recorridos y entradas de Historial, separar cada registro como tarjeta y aumentar la información de contenido por salir del resumen.
- Restricciones: usar un borde neutro en reposo, reservar el morado para foco, selección y arrastre, y conservar radios, datos y acciones existentes.
- Verificación: comprobar reposo, hover, foco, recorridos, películas Anime, historial global, arrastre y destino de arrastre; ejecutar pruebas de interfaz y build TypeScript/Vite.

**Resultado:** cada contenido y cada entrada histórica se reconoce como una tarjeta delimitada; el detalle deja de parecer texto flotante y el aviso de contenido por salir usa un tamaño legible.
