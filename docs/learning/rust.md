# Notas de aprendizaje: Rust

Este documento recoge solo conceptos que se utilicen realmente en NubeOS.

## Plantilla de nota

### Concepto

- **Qué es:**
- **Por qué se usa en NubeOS:**
- **Qué problema evita:**
- **¿Es idiomático?:**
- **Ejemplo pequeño:**

<!-- Añadir notas conforme se introduzcan conceptos. -->

### `rusqlite` y migraciones de SQLite

- **Qué es:** `rusqlite` es una biblioteca Rust para abrir una base SQLite y ejecutar consultas. `rusqlite_migration` aplica cambios versionados al esquema de esa base.
- **Por qué se usa en NubeOS:** los datos de producto, comidas y planes viven localmente y Rust es su dueño. La feature `bundled` incluye SQLite en la compilación para no depender de una instalación externa, especialmente en Windows.
- **Qué problema evita:** las migraciones permiten evolucionar tablas ya existentes sin perder datos ni depender de cambios manuales en cada equipo.
- **¿Es idiomático?:** sí. Para una aplicación de escritorio local con operaciones pequeñas, un acceso síncrono y directo mediante `rusqlite` es una opción sencilla y adecuada.
- **Nota:** una migración describe solo cambios de esquema; las reglas de negocio siguen viviendo en los casos de uso y el dominio Rust.
