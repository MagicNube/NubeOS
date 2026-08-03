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
- Tienda y marca opcionales.
- Una presentación de compra opcional.

Tienda y marca pertenecen al producto porque ayudan a distinguir “nuggets Lidl” de “nuggets Mercadona”, incluso si la presentación es similar. Un producto archivado no puede usarse de nuevo, pero se conserva en recetas y planes existentes.

### Presentación de compra

La presentación pertenece a un producto y no existe por separado. Solo hay una en esta etapa. Tiene uno de estos modos:

| Modo | Datos | Ejemplo |
| --- | --- | --- |
| Paquete | etiqueta, gramos totales, precio por paquete, unidades opcionales | tortillas: 320 g, 8 uds |
| A granel por peso | precio opcional por kg | patata: 2,00 €/kg |
| A granel por unidad | gramos aproximados y precio opcional por unidad | pimiento: 80 g/ud |

Si un paquete tiene gramos totales y número de unidades, el dominio deriva `gramos_por_unidad`. Para un producto a granel por unidad ese valor se registra como aproximado. Sin `gramos_por_unidad`, el producto solo admite cantidades en gramos.

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

Una comida contiene nombre, estado e ingredientes. Una instancia planificada contiene semana identificada por su lunes, día, franja, posición, referencia opcional a la comida base, marca de modificación e ingredientes propios.

Al planificar una comida, se copia su composición. Cambiar después la receta base no modifica la instancia; cambiar los macros, el peso unitario o la presentación de un producto sí recalcula macros y compra de las instancias que lo usan. La marca de modificación indica que la composición de la instancia difiere de la receta copiada inicialmente.

### Cobertura de compra semanal

La lista de compra es una proyección de las instancias de la semana. Para cada pareja `semana + producto` se persisten ajustes manuales:

- Cantidad ya disponible.
- Cantidades cubiertas con compras parciales.
- Cobertura de compra completa.

Las cantidades de cobertura también pueden introducirse en gramos o unidades cuando el producto lo permita; el dominio las normaliza a gramos. No son inventario global ni se trasladan a otra semana.

La entrada calculada expone necesidad total, disponibilidad, cobertura, pendiente, recomendación de compra, coste y sobrante teórico.

## Relaciones

```text
Producto 1 ── 0..1 Presentación
Comida 1 ── 1..N Ingrediente de comida ── 1 Producto
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
pendiente = máximo(0, necesidad - disponible - compras cubiertas)
```

- Paquete: se recomienda `techo(pendiente / gramos_por_paquete)` paquetes.
- A granel por peso: se recomienda el pendiente en gramos.
- A granel por unidad: se convierten los gramos a unidades y se redondea hacia arriba.

El sobrante teórico es lo disponible y adquirido menos lo planificado. El coste usa los paquetes recomendados, precio por kg o precio por unidad, según exista. Si faltan datos, el resultado declara ese cálculo no disponible en vez de inventarlo.

Al completar una entrada, el caso de uso cubre de una vez el pendiente actual usando la mínima compra válida para su presentación. La compra parcial es una alternativa explícita y no requiere completar primero la entrada.

### Archivado y retirada

- Archivar una comida evita nuevos usos, conserva historial y permite restaurarla.
- Archivar un producto evita nuevos usos, pero preserva referencias existentes.
- Retirar un producto de recetas primero consulta comidas afectadas y, tras confirmación, elimina los ingredientes solo de las recetas base.
- Si una retirada dejara una comida vacía, el caso de uso impide guardar ese estado o pide una resolución explícita; esta interacción se concreta en tareas.

## Casos de uso y comandos Tauri

| Área | Casos de uso |
| --- | --- |
| Productos | listar, crear, editar, archivar, restaurar, consultar afectadas, retirar de recetas |
| Comidas | listar, crear, editar, archivar, restaurar, consultar detalle y macros |
| Planificación | consultar semana, crear/editar/retirar instancia, reordenar franja |
| Resúmenes | consultar macros diarios y semanales |
| Compra | consultar lista, indicar disponible, registrar parcial, completar entrada |

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

Los datos de producto incluyen nombre, categoría, macros por 100 g, tienda, marca y presentación opcional. La presentación lleva un discriminante `kind` y uno de los tres conjuntos de datos aprobados: paquete, a granel por peso o a granel por unidad. Un error de validación devuelve un mensaje serializable y comprensible; los errores internos de SQLite se traducen a un mensaje genérico sin exponer detalles de la base de datos.

## Persistencia y atomicidad

SQLite persiste productos, presentaciones, comidas e ingredientes, instancias e ingredientes planificados y coberturas semanales. Las operaciones que modifican una comida con ingredientes, crean una instancia copiada o retiran un producto de varias recetas son atómicas.

La implementación usará `rusqlite` con la feature `bundled`, de modo que SQLite se compile junto a la aplicación y no dependa de una DLL o instalación externa del equipo. Las migraciones usarán `rusqlite_migration` y archivos SQL versionados en `src-tauri/migrations/`, registrados explícitamente desde Rust.

Esta decisión concreta la ADR-001 sin cambiar la fuente de verdad local, la frontera Tauri ni la organización por módulos. Por ello no requiere una ADR adicional. No se usará `sqlx` ni un plugin SQL accesible desde React en esta etapa: el módulo no necesita infraestructura asíncrona ni debe abrir acceso directo de la interfaz a SQLite.

## Responsabilidades de React

- Catálogo: filtros, formularios de producto y presentación condicional por modo.
- Comidas: formularios y selector de gramos/unidades condicionado por el producto.
- Calendario: navegación, franjas, borradores, orden e indicación de instancia modificada.
- Compra: visualización de necesidad, cobertura, pendiente, coste y sobrante; controles de disponible y compras.

Los filtros, modales, formularios sin confirmar, semana enfocada y estados de carga/error son estado efímero de React.

## Validación y pruebas

Rust valida nombres, macros, precios y cantidades no negativas, ingredientes positivos, comidas no vacías, semanas/franjas válidas y que una cantidad por unidades disponga de gramos por unidad.

Las pruebas cubren validación, conversión gramos/unidades, macros, paquetes, venta a granel, redondeo, sobrantes, archivado, copiado de instancias, SQLite, contratos de comandos y flujos visibles de React.

## Decisiones concretadas durante el primer vertical

1. Los cálculos conservan precisión `f64` en Rust; la interfaz muestra macros con un decimal y kcal sin decimales. No se redondean valores antes de agregarlos.
2. La cobertura semanal se conserva si el plan cambia. La necesidad y el pendiente se recalculan contra el plan vigente; un control explícito para reiniciar cobertura queda fuera de esta versión.
3. Retirar un producto se rechaza si alguna receta base quedaría sin ingredientes. El usuario puede conservarla, sustituir el producto o archivarla antes de repetir la retirada.
