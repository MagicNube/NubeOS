# Tareas — Series

- Estado: Primera versión implementada; comprobación funcional pendiente
- Última actualización: 2026-08-16

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

- Estado: Propuesta pendiente de aprobación
- Alcance: `MediaTitleRun`, migración e invariantes compartidas con Películas.
- Verificación: migración de fechas existentes y un recorrido abierto máximo.

## T-S06 — Implementar casos de uso de revisionado

- Estado: Propuesta pendiente de aprobación
- Dependencias: T-S05
- Alcance: iniciar, finalizar, registrar, corregir y retirar visionados de Series.
- Verificación: transacciones de estado, posición e historial.

## T-S07 — Añadir Historial y acciones de detalle

- Estado: Propuesta pendiente de aprobación
- Dependencias: T-S06
- Alcance: API, filtros, `Volver a ver`, finalizar y correcciones.
- Verificación: build y recorrido con dos visionados.

## T-S08 — Revisar la ampliación

- Estado: Propuesta pendiente de aprobación
- Dependencias: T-S05 a T-S07
- Verificación: pruebas Rust, Clippy, formato, build y uso manual.

## T-S09 — Recolocar la portada horizontal

- Estado: Implementada; comprobación visual pendiente
- Alcance: reutilizar el editor porcentual del núcleo audiovisual y recuperar el encuadre después de reiniciar.
- Verificación: arrastrar, centrar y guardar una portada de Serie; cerrar y volver a abrir el detalle.

**Resultado:** Series utiliza las mismas coordenadas persistentes, validación Rust y acción de cabecera que Anime y Películas. Build TypeScript/Vite, 112 pruebas Rust y Clippy estricto correctos.
