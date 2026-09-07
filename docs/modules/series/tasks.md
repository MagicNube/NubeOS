# Tareas — Series

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-06
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## T-S01 — Separar Series de Anime

- Estado: Implementada y aprobada por Nube.
- Alcance: entrada lateral propia y consultas limitadas a Series.

## T-S02 — Añadir progreso simple

- Estado: Implementada y aprobada por Nube.
- Alcance: temporada, episodio, fecha inicial y final opcionales con validación Rust.

## T-S03 — Crear Biblioteca y detalle simples

- Estado: Implementada y aprobada por Nube.
- Alcance: tarjetas, filtros, formulario, detalle y Archivo reutilizando el núcleo común.

## T-S04 — Verificar

- Estado: Revisión técnica completada; comprobación manual pendiente
- Verificación: migraciones, pruebas Rust, Clippy, build y uso manual.

**Resultado:** persistencia de posición verificada en SQLite; 91 pruebas Rust y build TypeScript/Vite correctos.

## T-S05 — Crear recorridos audiovisuales

- Estado: Implementada y aprobada por Nube.
- Alcance: `SeriesRun`, migración e invariantes propias de Series.
- Verificación: migración de fechas existentes y un recorrido abierto máximo.

## T-S06 — Implementar casos de uso de revisionado

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-S05
- Alcance: iniciar, finalizar, registrar, corregir y retirar visionados de Series.
- Verificación: transacciones de estado, posición e historial.

## T-S07 — Añadir Historial y acciones de detalle

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-S06
- Alcance: API, filtros, `Volver a ver`, finalizar y correcciones.
- Verificación: build y recorrido con dos visionados.

## T-S08 — Revisar la ampliación

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-S05 a T-S07
- Verificación: pruebas Rust, Clippy, formato, build y uso manual.

## T-S09 — Recolocar la portada horizontal

- Estado: Implementada y aprobada por Nube.
- Alcance: reutilizar el editor porcentual del núcleo audiovisual y recuperar el encuadre después de reiniciar.
- Verificación: arrastrar, centrar y guardar una portada de Serie; cerrar y volver a abrir el detalle.

**Resultado:** Series utiliza las mismas coordenadas persistentes, validación Rust y acción de cabecera que Anime y Películas. Build TypeScript/Vite, 112 pruebas Rust y Clippy estricto correctos.

## T-S10 — Corregir la geometría de la cabecera

- Estado: Implementada y aprobada por Nube.
- Alcance: reservar el ancho real de la portada horizontal en cada breakpoint y compartir la sustitución inmediata de imagen con Anime y Películas.
- Verificación: abrir una Serie en ventana ancha y estrecha, comprobar que portada y estado no se solapan y sustituir su imagen sin reiniciar.

## T-S11 — Unificar formulario, tarjeta y ordenación

- Estado: Implementada y aprobada por Nube.
- Alcance: contextualizar los ejemplos del formulario, incorporar favorito, mover el estado fuera de la portada, mostrar fechas de seguimiento y conservar la ordenación por título, puntuación o fechas.
- Verificación: crear y editar una serie, alternar favoritos y comprobar tarjetas y ordenación después de reiniciar.

## T-S12 — Alinear navegación y añadir estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: presentar las vistas `Biblioteca` y `Estadísticas` a la misma altura que los demás trackers, sin añadir historial global a Series.
- Verificación: alternar ambas pestañas, consultar series totales, terminadas y puntuación media y aplicar el filtro de puntuación mínima.

## T-S13 — Evitar inferencias temporales silenciosas

- Estado: Implementada y aprobada por Nube.
- Alcance: pedir confirmación antes de marcar una serie como Terminada al introducir una fecha de finalización.
- Restricciones: cambiar el estado manualmente no inventa fechas ni entradas de historial.
- Verificación: introducir y retirar una fecha final desde distintos estados, aceptando y rechazando la sugerencia.

**Resultado:** la fecha final puede sugerir un estado, pero la decisión sigue siendo del usuario.

## T-S14 — Completar acciones y estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: convertir Editar en acción iconográfica, retirar la estrella duplicada de la identidad y añadir Top 5/10/25, distribución por estado y actividad registrada.
- Verificación: abrir una serie favorita, editarla y consultar el ranking con distintos límites y puntuaciones mínimas.

**Resultado:** el detalle adopta la misma barra de acciones que el resto de Media y Estadísticas deja de limitarse a tres cifras aisladas.

## T-S15 — Derivar fechas del historial y normalizar filtros

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar inicio y fin del formulario principal, conservar las fechas derivadas de los visionados existentes, aceptar años abreviados en el historial y adoptar la barra común de búsqueda y filtros.
- Restricciones: editar metadatos no elimina fechas históricas y cambiar el estado no inventa visionados.
- Verificación: editar una serie con historial, registrar fechas con años de dos cifras y comprobar que búsqueda, favoritos y ordenación muestran siempre su texto completo.

**Resultado:** el formulario principal ya no duplica fechas del historial; los periodos siguen siendo su fuente y los controles usan la presentación común de Media.

## T-S16 — Consolidar historial y validación

- Estado: Implementada y aprobada por Nube.
- Alcance: cargar todos los visionados de Estadísticas en una única consulta y rechazar en Rust fechas futuras al crear o editar periodos.
- Verificación: consultar varias series con historial y enviar fechas pasada y futura directamente a los comandos.

**Resultado:** Estadísticas evita una consulta por serie y el historial no depende únicamente de la validación visual.

## T-S17 — Adoptar la navegación contextual compartida

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: identificar Series en la ruta fija, mostrar un único título por vista, mover acciones a la barra contextual y alinear Biblioteca y Estadísticas con los demás módulos Media.
- Verificación: comprobación TypeScript y revisión de whitespace correctas; sin build instalable en esta tarea.

## T-S18 — Simplificar identidad, ruta y filtros

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: ruta dinámica por vista, cabecera reducida a Series y filtros secundarios plegables con contador.
- Verificación: TypeScript correcto y estructura visual compartida revisada; sin build instalable.

## T-S19 — Limpiar cabecera y contador de filtros

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: usar un título plano, colocar Archivo y Añadir serie junto a las vistas y excluir la ordenación del contador de filtros.
- Verificación: TypeScript correcto y comprobación visual de la cabecera compartida; sin build instalable.

## T-S20 — Ampliar filtros y alinear fechas

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: añadir género, puntuación, años, visionados y recorridos abiertos mediante un constructor progresivo con ordenación separada; usar título alfabético como valor neutro, señalar en morado cualquier alternativa, alinear Inicio/Fin con Lectura y unificar las acciones del historial.

## T-S21 — Permitir varios estados y ordenar con estabilidad

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: convertir Estado en una condición multiselección, colocar Título primero y resolver alfabéticamente los empates de puntuación y fechas.
- Verificación: combinar varios estados y revisar órdenes con valores repetidos. Build TypeScript/Vite correcta; sin build instalable.

## T-S22 — Guardar una ordenación predeterminada explícita

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: separar el orden temporal del predeterminado, mantener Título A–Z como inicio neutro y ofrecer Guardar como predeterminado dentro del panel de ordenación compartido.
- Verificación: elegir, guardar y sustituir una preferencia; TypeScript/Vite correcto.
