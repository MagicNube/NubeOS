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

### Tipos de dominio y pruebas unitarias

- **Qué son:** una `struct` agrupa datos relacionados; un `enum` representa un conjunto cerrado de alternativas. En este módulo, `PurchasePresentation` expresa los tres modos posibles de compra y `QuantityUnit` las dos unidades permitidas. `Grams` es un *newtype*: una `struct` que envuelve un `f64` para impedir que unos gramos inválidos circulen por el dominio.
- **Por qué se usan en NubeOS:** hacen que reglas como «una cantidad es positiva» o «solo se usan unidades si hay gramos por unidad» vivan cerca de los datos y no se repitan en React, comandos o SQLite.
- **Qué problema evitan:** representar una presentación con campos incompatibles o convertir unidades sin información suficiente. Los constructores devuelven `Result<T, DomainError>`: quien crea el dato debe manejar el error antes de continuar.
- **¿Es idiomático?:** sí. Los tipos expresivos y `Result` son una forma habitual de codificar invariantes en Rust. Los `#[test]` dentro del mismo módulo protegen reglas pequeñas y se ejecutan con `cargo test` desde `src-tauri`.
- **Ejemplo pequeño:** `IngredientQuantity::units(3.0)?.normalize_to_grams(&producto)?` produce gramos solo cuando el producto conoce su conversión por unidad.
