# Documentación de NubeOS

Este directorio es la fuente de verdad del diseño del proyecto.

- `current-state.md`: mapa de incorporación, estado funcional, rutas de código, datos, build e instalación actuales.
- `vision.md`: propósito, usuarios y límites del producto.
- `architecture.md`: arquitectura vigente y límites entre capas.
- `principles.md`: reglas de diseño y desarrollo.
- `roadmap.md`: hitos y orden de evolución.
- `todo.md`: bugs, detalles visuales y pequeños refinamientos pendientes.
- `review-2026-09-03.md`: acta histórica del cierre documental de la primera versión.
- `releases/`: versiones compiladas, instalación y comprobaciones de conservación de datos.
- `decisions/`: ADRs aprobadas.
- `modules/`: especificación, diseño y tareas por módulo.
- `modules/dashboard/`: módulo Inicio que resume los demás módulos sin duplicar su dominio.
- `modules/media-statistics/`: sistema estadístico compartido por los cinco módulos MEDIA.
- `learning/`: notas breves sobre Rust y Tauri introducidos en el proyecto.

No se implementa una funcionalidad sin la documentación aplicable y una tarea aprobada.

Una conversación nueva debe comenzar por `current-state.md` y seguir el orden de lectura que contiene. El acta de revisión no sustituye ese estado vigente ni las tareas posteriores al 2026-09-03.
