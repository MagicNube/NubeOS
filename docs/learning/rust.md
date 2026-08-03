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

### Repositorio SQLite y transacciones

- **Qué es:** `ProductRepository` es el adaptador que traduce entre los tipos de dominio y las filas de SQLite. Recibe una `&mut Connection`, una referencia mutable exclusiva a la conexión. `transaction()` agrupa varias sentencias en una operación atómica.
- **Por qué se usa en NubeOS:** crear o editar un producto puede afectar a su fila y a su presentación. Si cualquiera de las dos escrituras falla, SQLite revierte ambas en lugar de dejar datos incompletos.
- **Qué problema evita:** que exista un producto sin la presentación que se acababa de guardar, o una presentación perteneciente a un producto que no se creó correctamente. Las migraciones SQL versionadas crean el esquema una sola vez y lo conservan al reabrir la base de datos.
- **¿Es idiomático?:** sí. Separar el repositorio del dominio mantiene SQL fuera de las reglas de producto. Usar `&mut Connection` deja explícito que una transacción necesita acceso exclusivo temporal a esa conexión.
- **Ejemplo pequeño:** `let transaction = connection.transaction()?; ... transaction.commit()?;`. Si se devuelve un error antes de `commit`, la transacción se revierte al descartarse.

### Copias planificadas y agregación de macros

- **Qué son:** una receta (`Meal`) contiene ingredientes reutilizables; una instancia planificada (`PlannedInstance`) guarda su propia copia de esos ingredientes. `MacroTotals` es una `struct` pequeña que acumula proteínas, carbohidratos, grasas y kcal.
- **Por qué se usan en NubeOS:** al planificar se copia la composición de la receta. Editar después la instancia no modifica la receta ni las demás instancias, mientras que sus macros se calculan siempre con los productos actuales.
- **Qué problema evita:** referencias compartidas que reescribirían el historial al editar una receta. La instancia conserva cantidades y orden propios y marca `is_modified` al cambiarse.
- **¿Es idiomático?:** sí. Modelar los estados y sus invariantes con `struct`, `enum`, constructores que devuelven `Result` y pruebas unitarias hace explícitas las reglas sin depender de SQLite o React.
- **Ejemplo pequeño:** `calculate_macros(&ingredientes, &productos)` normaliza cada cantidad antes de sumarla; React solo recibe el total ya calculado.

### Migraciones que transforman datos y reordenamiento atómico

- **Qué es:** una migración SQLite puede transformar datos existentes además de crear tablas. Al simplificar la compra, la migración crea una tabla nueva de disponibilidad semanal, copia en ella `disponible + comprado` y después sustituye la tabla anterior. El movimiento de una instancia usa una transacción para actualizar el origen y el destino juntos.
- **Por qué se usa en NubeOS:** una versión anterior guardaba por separado lo que ya había y las compras parciales. Ahora ambos valores significan simplemente «Tienes» para esa semana. La transformación mantiene el valor total en vez de perder el progreso guardado. Mover una comida entre días o franjas tampoco debe dejar posiciones repetidas.
- **Qué problema evita:** cambios de modelo que borran datos del usuario o calendarios con dos instancias en la misma posición tras un fallo a mitad de operación.
- **¿Es idiomático?:** sí. En SQLite es habitual reconstruir una tabla cuando su esquema cambia de forma no soportada directamente. En Rust, `transaction()` delimita claramente el grupo de sentencias que deben completarse o revertirse juntas.
- **Ejemplo pequeño:** `INSERT INTO nueva_tabla ... SELECT available_grams + purchased_grams ...` conserva el total previo; `transaction.commit()?` confirma un movimiento solo después de reindexar ambos grupos.
