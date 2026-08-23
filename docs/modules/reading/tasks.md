# Tareas — Lectura

- Estado: T-R01 a T-R11 implementadas; comprobación manual pendiente
- Última actualización: 2026-08-23

## T-R01 — Auditar el modelo de Notion

- Estado: Implementada
- Alcance: revisar columnas, estados, géneros, fechas y valoraciones sin importar datos.
- Resultado: 27 filas sin títulos duplicados; cinco estados, doce géneros y valoraciones históricas de dos a cinco estrellas. Prioridad y URLs quedan excluidas.

## T-R02 — Unificar el filtro de favoritos

- Estado: Implementada; comprobación visual pendiente
- Alcance: crear un botón compartido compacto con estrella vacía/rellena y sustituir las variantes de Documentos y Media.
- Verificación: navegación por teclado, tooltip, `aria-pressed` y comparación visual.

## T-R03 — Crear dominio y migración

- Estado: Implementada
- Alcance: entidad, estados, validaciones y tabla SQLite vacía.
- Verificación: pruebas unitarias y de repositorio.

## T-R04 — Implementar casos de uso y comandos Tauri

- Estado: Implementada
- Alcance: listar, crear, editar, favorito, archivar, restaurar, borrar y estadísticas.
- Verificación: pruebas de persistencia y contratos registrados.

## T-R05 — Crear contratos TypeScript

- Estado: Implementada
- Alcance: DTOs, API y presentación de estados, fechas y puntuaciones.
- Verificación: comprobación TypeScript.

## T-R06 — Crear Biblioteca y En lectura

- Estado: Implementada; comprobación visual pendiente
- Alcance: navegación, filtros combinables, ordenación, tarjetas, estados vacíos y Archivo.
- Verificación: build y recorrido manual.

## T-R07 — Crear formulario, detalle y estadísticas

- Estado: Implementada; comprobación visual pendiente
- Alcance: modales coherentes, aviso de borrador, edición completa y resumen agregado.
- Verificación: build y recorrido manual.

## T-R08 — Revisar el módulo

- Estado: Revisión técnica completada; comprobación manual pendiente
- Alcance: duplicación, naming, accesibilidad, pruebas Rust, Clippy, formato, build y diff.
- Verificación: registrar el resultado técnico y dejar explícita la comprobación visual pendiente.

**Resultado:** biblioteca local vacía, dominio y migraciones independientes, once comandos Tauri, tres vistas, filtros, formularios, portadas privadas, Archivo, estadísticas y componentes compartidos de favorito, puntuación y acciones de Archivo. Build TypeScript/Vite, 102 pruebas Rust, Clippy estricto y formato correctos. Queda pendiente probar la interacción y ajustar la interfaz con datos reales.

## T-R09 — Refinar navegación y géneros

- Estado: Implementada; comprobación visual pendiente
- Alcance: Biblioteca inicial, pestaña Leyendo con iconos y medidas comunes, favoritos solo en Biblioteca y diez géneros seleccionables.
- Verificación: build y recorrido manual.

## T-R10 — Añadir portadas locales

- Estado: Implementada; comprobación visual pendiente
- Alcance: migración de metadatos, almacenamiento privado JPEG/PNG/WebP, selección provisional, sustitución, retirada y lectura.
- Verificación: pruebas Rust, build y recorrido manual.

## T-R11 — Unificar acciones de Archivo

- Estado: Implementada; comprobación visual pendiente
- Alcance: componente compartido con restaurar y papelera, iconográfico y visible por hover/foco en las colecciones archivadas.
- Verificación: build y revisión visual transversal.
