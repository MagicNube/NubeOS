# Tareas — Series

- Estado: Historial por serie implementado; revisión visual pendiente
- Última actualización: 2026-08-30

## T-S01 — Separar Series de Anime

- Estado: Implementada
- Alcance: entrada lateral propia y consultas limitadas a Series.

## T-S02 — Añadir progreso simple

- Estado: Implementada
- Alcance: temporada, episodio, fecha inicial y final opcionales con validación Rust.

## T-S03 — Crear Biblioteca y detalle simples

- Estado: Implementada
- Alcance: tarjetas, filtros, formulario, detalle y Archivo reutilizando el núcleo común.

## T-S04 — Verificar

- Estado: Revisión técnica completada; comprobación manual pendiente
- Verificación: migraciones, pruebas Rust, Clippy, build y uso manual.

**Resultado:** persistencia de posición verificada en SQLite; 91 pruebas Rust y build TypeScript/Vite correctos.

## T-S05 — Crear recorridos audiovisuales

- Estado: Implementada; comprobación visual pendiente
- Alcance: `SeriesRun`, migración e invariantes propias de Series.
- Verificación: migración de fechas existentes y un recorrido abierto máximo.

## T-S06 — Implementar casos de uso de revisionado

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-S05
- Alcance: iniciar, finalizar, registrar, corregir y retirar visionados de Series.
- Verificación: transacciones de estado, posición e historial.

## T-S07 — Añadir Historial y acciones de detalle

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-S06
- Alcance: API, filtros, `Volver a ver`, finalizar y correcciones.
- Verificación: build y recorrido con dos visionados.

## T-S08 — Revisar la ampliación

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-S05 a T-S07
- Verificación: pruebas Rust, Clippy, formato, build y uso manual.

## T-S09 — Recolocar la portada horizontal

- Estado: Implementada; comprobación visual pendiente
- Alcance: reutilizar el editor porcentual del núcleo audiovisual y recuperar el encuadre después de reiniciar.
- Verificación: arrastrar, centrar y guardar una portada de Serie; cerrar y volver a abrir el detalle.

**Resultado:** Series utiliza las mismas coordenadas persistentes, validación Rust y acción de cabecera que Anime y Películas. Build TypeScript/Vite, 112 pruebas Rust y Clippy estricto correctos.

## T-S10 — Corregir la geometría de la cabecera

- Estado: Implementada; comprobación visual pendiente.
- Alcance: reservar el ancho real de la portada horizontal en cada breakpoint y compartir la sustitución inmediata de imagen con Anime y Películas.
- Verificación: abrir una Serie en ventana ancha y estrecha, comprobar que portada y estado no se solapan y sustituir su imagen sin reiniciar.

## T-S11 — Unificar formulario, tarjeta y ordenación

- Estado: Implementada; comprobación visual pendiente.
- Alcance: contextualizar los ejemplos del formulario, incorporar favorito, mover el estado fuera de la portada, mostrar fechas de seguimiento y conservar la ordenación por título, puntuación o fechas.
- Verificación: crear y editar una serie, alternar favoritos y comprobar tarjetas y ordenación después de reiniciar.

## T-S12 — Alinear navegación y añadir estadísticas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: presentar las vistas `Biblioteca` y `Estadísticas` a la misma altura que los demás trackers, sin añadir historial global a Series.
- Verificación: alternar ambas pestañas, consultar series totales, terminadas y puntuación media y aplicar el filtro de puntuación mínima.

## T-S13 — Evitar inferencias temporales silenciosas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: pedir confirmación antes de marcar una serie como Terminada al introducir una fecha de finalización.
- Restricciones: cambiar el estado manualmente no inventa fechas ni entradas de historial.
- Verificación: introducir y retirar una fecha final desde distintos estados, aceptando y rechazando la sugerencia.

**Resultado:** la fecha final puede sugerir un estado, pero la decisión sigue siendo del usuario.

## T-S14 — Completar acciones y estadísticas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: convertir Editar en acción iconográfica, retirar la estrella duplicada de la identidad y añadir Top 5/10/25, distribución por estado y actividad registrada.
- Verificación: abrir una serie favorita, editarla y consultar el ranking con distintos límites y puntuaciones mínimas.

**Resultado:** el detalle adopta la misma barra de acciones que el resto de Media y Estadísticas deja de limitarse a tres cifras aisladas.

## T-S15 — Derivar fechas del historial y normalizar filtros

- Estado: Implementada; comprobación visual pendiente.
- Alcance: retirar inicio y fin del formulario principal, conservar las fechas derivadas de los visionados existentes, aceptar años abreviados en el historial y adoptar la barra común de búsqueda y filtros.
- Restricciones: editar metadatos no elimina fechas históricas y cambiar el estado no inventa visionados.
- Verificación: editar una serie con historial, registrar fechas con años de dos cifras y comprobar que búsqueda, favoritos y ordenación muestran siempre su texto completo.

**Resultado:** el formulario principal ya no duplica fechas del historial; los periodos siguen siendo su fuente y los controles usan la presentación común de Media.

## T-S16 — Consolidar historial y validación

- Estado: Implementada; comprobación visual pendiente.
- Alcance: cargar todos los visionados de Estadísticas en una única consulta y rechazar en Rust fechas futuras al crear o editar periodos.
- Verificación: consultar varias series con historial y enviar fechas pasada y futura directamente a los comandos.

**Resultado:** Estadísticas evita una consulta por serie y el historial no depende únicamente de la validación visual.
