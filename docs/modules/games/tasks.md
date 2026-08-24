# Tareas — Videojuegos

- Estado: Implementación completada; comprobación visual pendiente
- Última actualización: 2026-08-24

## Cómo usar este documento

Las tareas se realizan de una en una después de aprobar spec y diseño. Cada tarea debe producir un cambio pequeño, verificable y revisable.

## T-G01 — Crear dominio y migración

- Estado: Implementada
- Alcance: `Game`, `GameRun`, estados, invariantes, tablas e índices.
- Verificación: pruebas unitarias y migración sobre una base vacía.

## T-G02 — Implementar repositorio

- Estado: Implementada
- Dependencias: T-G01
- Alcance: CRUD, Archivo, favoritos, partidas, consultas y transacciones.
- Verificación: pruebas de persistencia, restricciones y borrado en cascada.

## T-G03 — Implementar portadas administradas

- Estado: Implementada
- Dependencias: T-G01
- Alcance: selección provisional, promoción, sustitución, retirada y lectura binaria.
- Verificación: pruebas del almacén y compensación ante errores.

## T-G04 — Crear comandos Tauri

- Estado: Implementada
- Dependencias: T-G02, T-G03
- Alcance: adaptar todos los casos de uso aprobados mediante comandos pequeños.
- Verificación: contratos registrados y errores de frontera comprensibles.

## T-G05 — Crear contratos TypeScript

- Estado: Implementada
- Dependencias: T-G04
- Alcance: DTOs, API, presentación de estados, fechas y errores.
- Verificación: TypeScript sin errores.

## T-G06 — Crear Biblioteca y Jugando

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-G05
- Alcance: navegación, búsqueda, filtros, ordenación, tarjetas, favoritos y Archivo.
- Verificación: build y recorrido manual con datos reales.

## T-G07 — Crear formulario y detalle

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-G05
- Alcance: crear/editar, portada, puntuación, opinión y acciones de seguimiento.
- Verificación: aviso de cambios sin guardar y recorrido de estados.

## T-G08 — Crear Historial y Estadísticas

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-G06, T-G07
- Alcance: filtros, corrección y retirada de partidas; agregados calculados en Rust.
- Verificación: primera partida, rejugada, partida abierta y correcciones.

## T-G09 — Integrar navegación y revisar

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-G01 a T-G08
- Alcance: barra lateral, carga diferida, coherencia visual, accesibilidad y revisión técnica.
- Verificación: pruebas Rust, formato, Clippy estricto, build TypeScript, `git diff --check` y prueba en Tauri.

## T-G10 — Refinar portadas y acceso a Jugando

- Estado: Implementada; comprobación visual pendiente
- Alcance: mostrar completa la ilustración horizontal, usar un mando en Jugando y aceptar portadas pegadas normalizadas a JPEG.
- Verificación: build y prueba manual con carátulas horizontales y WebP copiado.

## T-G11 — Unificar el detalle del tracker

- Estado: Implementada; comprobación visual pendiente
- Alcance: dividir el detalle en Resumen e Historial, aplicar las métricas compartidas y usar una portada horizontal completa también dentro del videojuego.
- Verificación: build y prueba manual con título sin partidas, partida abierta y varias rejugadas.
