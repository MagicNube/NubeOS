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
