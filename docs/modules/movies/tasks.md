# Tareas — Películas

- Estado: Primera versión implementada; comprobación funcional pendiente
- Última actualización: 2026-08-16

## T-P01 — Separar Películas de Anime

- Estado: Implementada
- Alcance: entrada lateral propia y clasificación de películas convencionales.

## T-P02 — Implementar seguimiento binario

- Estado: Implementada
- Alcance: marcar vista o pendiente con fecha, estado e historial coherentes.

## T-P03 — Crear Biblioteca y detalle simples

- Estado: Implementada
- Alcance: tarjetas, filtros, formulario, detalle y Archivo.

## T-P04 — Verificar

- Estado: Revisión técnica completada; comprobación manual pendiente
- Verificación: migraciones, pruebas Rust, Clippy, build y uso manual.

**Resultado:** clasificación Anime/Películas y progreso binario verificados en Rust; build TypeScript/Vite correcta.

## T-P05 — Migrar visionados a recorridos audiovisuales

- Estado: Implementada; comprobación manual pendiente
- Alcance: usar `MovieViewing`, migrar la fecha existente y derivar el estado binario de uno o más visionados.
- Verificación: películas pendientes, vistas una vez y con fechas existentes.

## T-P06 — Implementar múltiples visionados

- Estado: Implementada; comprobación manual pendiente
- Dependencias: T-P05
- Alcance: marcar vista, volver a ver, corregir fecha y retirar un visionado.
- Verificación: estado coherente con cero, uno y varios visionados.

## T-P07 — Añadir Historial y contador

- Estado: Implementada; comprobación manual pendiente
- Dependencias: T-P06
- Alcance: API, vista Historial, filtros y acciones rápidas en detalle.
- Verificación: build y recorrido con dos visionados.

## T-P08 — Revisar la ampliación

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-P05 a T-P07
- Verificación: pruebas Rust, Clippy, formato, build y uso manual.

## T-P09 — Unificar tarjetas, detalle y controles

- Estado: Implementada; comprobación visual pendiente
- Alcance: portadas horizontales completas, filtros de Historial normalizados, favorito con estrella y detalle dividido en Resumen e Historial con métricas compartidas.
- Verificación: build y prueba manual con película pendiente, un visionado y varios revisionados.

## T-P10 — Añadir estadísticas filtrables y geometría común

- Estado: Implementada; comprobación visual pendiente
- Alcance: tarjeta horizontal común con Series y Videojuegos, más filtros estadísticos por año y puntuación mínima calculados en Rust.
- Verificación: build, pruebas Rust y prueba manual con varios años.
