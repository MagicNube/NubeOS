# Diseño — Planificador de comidas, compra y productos

- Estado: Aprobado por Nube
- Última actualización: 2026-08-03

## Propósito y límites

Este diseño concreta la spec del módulo. Describe entidades, flujos, contratos y responsabilidades; no contiene código.

```text
React → comandos Tauri → casos de uso Rust → dominio → repositorios → SQLite
```

React muestra información, recoge formularios y mantiene estado visual. Rust valida, calcula macros, normaliza cantidades, genera compra y persiste datos.

## Modelo de dominio

### Producto

Un producto es un artículo reutilizable de catálogo. Tiene:

- Identificador, nombre, categoría y estado activo o archivado.
- Macros por 100 g.
- Supermercado opcional: Mercadona, Lidl, Consum, FamilyCash u Otro.
- Una presentación de compra obligatoria para productos nuevos.

El nombre del producto contiene la marca cuando haga falta distinguirlo. No se modela marca como campo propio. Un producto archivado no puede usarse de nuevo, pero se conserva en recetas y planes existentes.

### Presentación de compra

La presentación pertenece a un producto y no existe por separado. Solo hay una en esta etapa y los productos nuevos deben elegir uno de estos modos:

| Modo | Datos | Ejemplo |
| --- | --- | --- |
| Paquete, bolsa o bandeja | gramos totales, precio por paquete en euros, unidades (opcionales) | tortillas: 320 g, 8 uds |
| A granel por peso | precio (opcional) por kg | patata: 2,00 €/kg |

Si un paquete tiene gramos totales y número de unidades, el dominio deriva `gramos_por_unidad`. Sin ese dato, el producto solo admite cantidades en gramos. El nombre de compra se deriva del nombre actual del producto; no existe una etiqueta adicional.

Los importes se introducen como texto decimal en euros, aceptando coma o punto. El comando Rust los valida y convierte a céntimos antes de persistirlos; SQLite continúa usando enteros para evitar errores de precisión monetaria. La interfaz no muestra céntimos ni controles de incremento.

`bulk_by_unit` y la ausencia de presentación permanecen en persistencia solo para leer datos existentes. Los comandos de creación y actualización no los ofrecen; una edición debe sustituirlos por paquete, bolsa o bandeja, o a granel por peso.

La columna de marca actual se conserva temporalmente para compatibilidad de datos, pero no forma parte del nuevo contrato ni se muestra. Un supermercado guardado que no pertenezca a la lista prevista se presenta como `Otro` hasta que el producto se edite.

### Cantidad de ingrediente

Un ingrediente de una comida o instancia planificada guarda:

- Producto referenciado.
- Valor introducido, mayor que cero.
- Unidad elegida: gramos o unidades.
- Posición dentro de la lista.

Los gramos son la opción predeterminada. La interfaz ofrece unidades solo si el producto tiene `gramos_por_unidad`. El dominio calcula una cantidad normalizada en gramos sin exigir que el usuario haga la conversión:

```text
gramos normalizados = gramos introducidos
                     o unidades introducidas × gramos_por_unidad
```

La cantidad normalizada se deriva, no se edita como una segunda fuente de verdad.

### Comida e instancia planificada

Una comida contiene nombre, estado, ingredientes y cero o más momentos recomendados. Los momentos usan el mismo conjunto cerrado que el calendario (`breakfast`, `lunch`, `snack`, `dinner`, `extra`) y se persisten en una relación propia de receta y franja.

Una instancia planificada contiene semana identificada por su lunes, día, franja, posición, referencia opcional a la comida base, marca de modificación e ingredientes propios.

Al planificar una comida, se copia su composición. Cambiar después la receta base no modifica la instancia; cambiar los macros, el peso unitario o la presentación de un producto sí recalcula macros y compra de las instancias que lo usan. La marca de modificación indica que la composición de la instancia difiere de la receta copiada inicialmente.

### Cobertura de compra semanal

La lista de compra es una proyección de las instancias de la semana. Para cada pareja `semana + producto` se persiste un ajuste manual:

- Cantidad ya disponible.
- Estado de comprobación de la línea de compra.

La disponibilidad se almacena en gramos. La interfaz puede recibir unidades únicamente cuando el producto deriva gramos por unidad y Rust las normaliza antes de persistir. No es inventario global ni se traslada a otra semana. No se persiste un historial de compras.

La entrada calculada expone necesidad total, disponibilidad, pendiente, recomendación de compra, coste y sobrante teórico. La proyección semanal añade coste total planificado y coste pendiente (solo líneas no marcadas como compradas).

## Relaciones

```text
Producto 1 ── 0..1 Presentación
Comida 1 ── 1..N Ingrediente de comida ── 1 Producto
Comida 1 ── 0..N Momento recomendado
Instancia 1 ── 1..N Ingrediente planificado ── 1 Producto
Instancia N ── 0..1 Comida base
Semana + Producto 1 ── 0..1 Cobertura semanal
```

## Cálculos de dominio

### Macros

```text
macro ingrediente = macro del producto por 100 g × gramos normalizados / 100
```

Los macros de comida, día y semana son sumas de ingredientes, instancias y días. La precisión se conserva internamente y se redondea solo al presentar.

### Compra, coste y sobrante

```text
necesidad total = suma de gramos normalizados planificados
pendiente = máximo(0, necesidad - disponible)
```

- Paquete: se recomienda `techo(pendiente / gramos_por_paquete)` paquetes.
- A granel por peso o presentación heredada: se recomienda el pendiente en gramos.

El sobrante teórico es lo disponible menos lo planificado, más la compra recomendada cuando corresponda. El coste usa los paquetes recomendados o el precio por kg, según exista. Si faltan datos, el resultado declara ese cálculo no disponible en vez de inventarlo.

La casilla de una línea no es una operación de compra: persiste un estado semanal de comprobación y no modifica la disponibilidad. El usuario modifica la disponibilidad y el dominio recalcula recomendación, coste y sobrante. El coste pendiente suma solo las líneas no comprobadas.

### Archivado y retirada

- Archivar una comida evita nuevos usos, conserva historial y permite restaurarla.
- Archivar un producto evita nuevos usos, pero preserva referencias existentes.
- Retirar un producto de recetas primero consulta comidas afectadas y, tras confirmación, elimina los ingredientes solo de las recetas base.
- Si una retirada dejara una comida vacía, el caso de uso impide guardar ese estado o pide una resolución explícita; esta interacción se concreta en tareas.

## Casos de uso y comandos Tauri

| Área | Casos de uso |
| --- | --- |
| Productos | listar y buscar activos, crear, editar, archivar, restaurar, consultar afectadas, retirar de recetas |
| Comidas | listar y buscar activas, filtrar por producto, crear, editar, archivar, restaurar, consultar detalle y macros |
| Planificación | consultar semana, crear/editar/retirar instancia, mover y reordenar entre franjas |
| Resúmenes | consultar macros diarios y semanales |
| Compra | consultar proyección semanal, indicar disponibilidad y marcar una línea como comprobada |

Cada comando recibe y devuelve DTOs serializables, delega inmediatamente en un caso de uso y traduce errores de dominio. Contratos concretos se definen junto con cada tarea.

### Contratos de productos

Los DTOs de productos usan nombres en `camelCase` y no exponen tipos internos de dominio. Las categorías y estados se representan como valores cerrados: `vegetable`, `fruit`, `yogurt`, `meat`, `fish`, `other`; y `active` o `archived`.

| Comando | Entrada | Salida |
| --- | --- | --- |
| `list_products` | estado opcional | productos ordenados por nombre |
| `create_product` | datos de producto sin identificador | producto creado con identificador generado por Rust |
| `update_product` | identificador y datos completos de producto | producto guardado con su estado actual |
| `archive_product` | identificador | confirmación sin contenido |
| `restore_product` | identificador | confirmación sin contenido |

Los datos de producto incluyen nombre, categoría, supermercado, macros por 100 g y una presentación obligatoria para crear o actualizar. La presentación lleva un discriminante `kind` y uno de los dos conjuntos de datos aprobados: paquete o a granel por peso. Un error de validación devuelve un mensaje serializable y comprensible; los errores internos de SQLite se traducen a un mensaje genérico sin exponer detalles de la base de datos.

Los comandos de búsqueda reciben texto opcional y filtros de categoría o producto, y devuelven solo activos salvo que se solicite explícitamente el archivo. El contrato de planificación incorporará `move_planned_instance`, con identificador, día de destino, franja de destino y posición de inserción. Rust reordenará atómicamente los elementos de origen y destino.

## Persistencia y atomicidad

SQLite persiste productos, presentaciones, comidas e ingredientes, instancias e ingredientes planificados y coberturas semanales (disponibilidad y estado de comprobación). Las operaciones que modifican una comida con ingredientes, crean una instancia copiada o retiran un producto de varias recetas son atómicas.

La implementación usará `rusqlite` con la feature `bundled`, de modo que SQLite se compile junto a la aplicación y no dependa de una DLL o instalación externa del equipo. Las migraciones usarán `rusqlite_migration` y archivos SQL versionados en `src-tauri/migrations/`, registrados explícitamente desde Rust.

Esta decisión concreta la ADR-001 sin cambiar la fuente de verdad local, la frontera Tauri ni la organización por módulos. Por ello no requiere una ADR adicional. No se usará `sqlx` ni un plugin SQL accesible desde React en esta etapa: el módulo no necesita infraestructura asíncrona ni debe abrir acceso directo de la interfaz a SQLite.

## Responsabilidades de React

- Catálogo: buscador, filtro de categoría visible, menú de acciones secundarias y archivo bajo demanda.
- Comidas: buscador, filtros por producto y momento recomendado, formulario con momentos recomendados y selector de gramos/unidades condicionado por el producto. Las tarjetas reservan una altura común, muestran hasta tres ingredientes y permiten desplegar los restantes.
- Calendario: navegación, buscador de comidas, orden por momento recomendado, arrastrar y soltar con datos explícitos en `dataTransfer`, indicación de instancia modificada y resaltado del día actual en `Europe/Madrid`. Los macros diarios aparecen bajo la fecha.
- Compra: visualización de necesidad, disponible, pendiente, recomendación, coste, sobrante y estado de comprobación; control «Tienes» en gramos o unidades cuando existe conversión. React aplica una espera breve al persistir cada pulsación para no saturar los comandos.

Los filtros, búsquedas, modales, formularios sin confirmar, semana enfocada y estados de carga/error son estado efímero de React. El contenedor del módulo conserva filtros y búsquedas al cambiar de pestaña durante la sesión, pero no los guarda tras cerrar la aplicación.

## Validación y pruebas

Rust valida nombres, supermercado permitido, presentación obligatoria al guardar, macros, precios en euros convertibles a céntimos y cantidades no negativas, ingredientes positivos, comidas no vacías, semanas/franjas válidas y que una cantidad por unidades disponga de gramos por unidad.

Las pruebas cubren validación, conversión gramos/unidades, macros, paquetes, venta a granel por peso, redondeo, sobrantes, archivado, copiado y movimiento de instancias, SQLite, contratos de comandos y flujos visibles de React.

## Decisiones concretadas durante el primer vertical

1. Los cálculos conservan precisión `f64` en Rust; la interfaz muestra macros y kcal como enteros y no usa incrementos decimales. No se redondean valores antes de agregarlos.
2. La disponibilidad semanal se conserva si el plan cambia. La necesidad y el pendiente se recalculan contra el plan vigente; no existe historial de compras ni control de reinicio en esta versión.
3. Retirar un producto se rechaza si alguna receta base quedaría sin ingredientes. El usuario puede conservarla, sustituir el producto o archivarla antes de repetir la retirada.
