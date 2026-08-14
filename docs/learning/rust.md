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

- **Qué son:** una `struct` agrupa datos relacionados; un `enum` representa un conjunto cerrado de alternativas. En este módulo, `PurchasePresentation` expresa los tres modos posibles de compra y `QuantityUnit` las dos unidades permitidas. `Grams` es un _newtype_: una `struct` que envuelve un `f64` para impedir que unos gramos inválidos circulen por el dominio.
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

### Préstamos temporales al leer SQLite

- **Qué es:** una consulta preparada (`Statement`) presta temporalmente la conexión, y el iterador de filas que devuelve `query_map` mantiene ese préstamo mientras existe.
- **Por qué se usa en NubeOS:** al leer las necesidades manuales semanales, el repositorio recopila primero las filas en un `Vec` y solo después las devuelve.
- **Qué problema evita:** intentar devolver directamente una expresión que aún contiene el iterador puede hacer que Rust rechace el código: la consulta se destruiría antes de que finalizara el préstamo.
- **¿Es idiomático?:** sí. Materializar resultados pequeños de SQLite con `collect::<Result<Vec<_>, _>>()?` deja claro cuándo termina el acceso a la consulta y simplifica el resto del caso de uso.
- **Ejemplo pequeño:** `let needs = rows.collect::<Result<Vec<_>, _>>()?; Ok(needs)`.

### Céntimos enteros para importes redondeados

- **Qué es:** el cálculo de compra representa el coste final de cada línea como `u64` en céntimos, no como un `f64` en euros.
- **Por qué se usa en NubeOS:** al comprar a granel puede aparecer una fracción de céntimo. Rust redondea esa línea una sola vez al céntimo más cercano y después suma los importes ya redondeados.
- **Qué problema evita:** los decimales binarios pueden producir importes visualmente inesperados y redondear solo el total puede no coincidir con la suma de los precios mostrados en cada producto.
- **¿Es idiomático?:** sí. Para dinero se suele usar una unidad entera mínima (como céntimos); `checked_add` y `checked_mul` devuelven `None` si hubiera un desbordamiento, en lugar de fabricar un importe incorrecto.
- **Ejemplo pequeño:** `rounded_cents(33.5)` devuelve `Some(34)`; al sumar dos líneas se combinan sus céntimos ya redondeados.

### Revisiones para detectar cambios de una receta

- **Qué es:** una revisión es un número entero que aumenta cada vez que se guarda una receta. Una instancia planificada conserva el número de la revisión desde la que fue copiada.
- **Por qué se usa en NubeOS:** permite saber si la receta actual cambió sin sobrescribir silenciosamente los ingredientes que se planificaron antes.
- **Qué problema evita:** comparar ingredientes directamente sería más frágil y no explica la intención. Comparar dos revisiones expresa exactamente la pregunta: «¿esta copia procede de la versión actual?».
- **¿Es idiomático?:** sí. Un contador de versión es una forma simple y explícita de modelar la evolución de un agregado local. La migración inicializa las copias ya existentes con la revisión actual para no marcar todo el historial como pendiente de actualizar.
- **Ejemplo pequeño:** una receta pasa de revisión `1` a `2` al guardarse; una instancia con `source_meal_revision = 1` ofrece la actualización, pero conserva sus datos hasta que el usuario la solicita.

### Relojes inyectables y fechas civiles

- **Qué son:** el trait `Clock` expresa únicamente «qué día es hoy». Producción usa `MadridClock`, que transforma el instante UTC actual al día civil de `Europe/Madrid`; las pruebas usan un reloj fijo.
- **Por qué se usan en NubeOS:** la caducidad de un documento depende del día local, pero una prueba no debe cambiar de resultado según la hora o fecha en que se ejecute.
- **Qué problema evitan:** cálculos repartidos entre React y Rust, pruebas inestables alrededor de medianoche y errores al sumar 30 días entre meses o años.
- **¿Es idiomático?:** sí. Recibir una abstracción pequeña para el tiempo es una forma habitual de separar una regla determinista del reloj del sistema.
- **Ejemplo pequeño:** con hoy fijado en `2026-08-12`, una caducidad en `2026-09-11` está dentro de 30 días y otra en `2026-09-12` sigue vigente.

### `PathBuf`, staging y compensaciones

- **Qué son:** `Path` representa una ruta prestada y `PathBuf` una ruta poseída. El almacén de Documentos construye rutas privadas a partir de una raíz conocida, copia primero a `staging` y usa `rename` para confirmar o revertir movimientos.
- **Por qué se usan en NubeOS:** SQLite y NTFS no comparten una transacción. La importación debe coordinar ambos sin exponer rutas a React ni perder el único PDF preparado.
- **Qué problema evitan:** documentos visibles sin archivo, temporales consumidos tras un fallo y recorridos como `../` fuera de la carpeta privada.
- **¿Es idiomático?:** sí. Mantener rutas como tipos de la biblioteca estándar y compensar explícitamente operaciones externas es preferible a tratarlas como cadenas.
- **Ejemplo pequeño:** si SQLite no puede confirmar después de mover el PDF, Rust lo renombra de vuelta a `staging` y la transacción se revierte.

### Puertos pequeños para integraciones del sistema

- **Qué son:** un trait como `FileClipboard` describe la única operación que necesita el caso de uso sin acoplarlo directamente a una biblioteca de Windows.
- **Por qué se usan en NubeOS:** copiar un PDF al portapapeles requiere `CF_HDROP` en Windows 11, mientras que las reglas del módulo solo necesitan expresar «publica este archivo».
- **Qué problema evitan:** las pruebas no dependen del portapapeles real, una ventana activa ni un estado externo ocupado. También mantienen el código específico de Windows detrás de `cfg(windows)`.
- **¿Es idiomático?:** sí, cuando el límite externo aporta una prueba o un aislamiento reales. El trait debe ser pequeño; no conviene crear interfaces para cada función interna.
- **Ejemplo pequeño:** producción usa `SystemFileClipboard`; una prueba usa un adaptador falso que registra la ruta recibida y permite simular un error recuperable.
