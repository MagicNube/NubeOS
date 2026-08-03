# Notas de aprendizaje: Tauri

Este documento recoge conceptos de Tauri incorporados de forma consciente al proyecto.

## Plantilla de nota

### Concepto

- **Qué es:**
- **Por qué se usa en NubeOS:**
- **Límite de responsabilidad:**
- **Implicaciones de seguridad:**
- **Ejemplo pequeño:**

<!-- Añadir notas conforme se introduzcan conceptos. -->

### Comandos Tauri y estado gestionado

- **Qué es:** un comando es una función Rust marcada con `#[tauri::command]` que React puede invocar localmente. Los DTOs de entrada se deserializan con `serde` y los de salida se serializan de vuelta al WebView.
- **Por qué se usa en NubeOS:** los comandos de productos son la única puerta de React hacia los casos de uso Rust. Reciben una intención como crear o archivar; no permiten acceso directo a SQLite.
- **Límite de responsabilidad:** el comando adapta DTOs, obtiene la conexión compartida y traduce errores. La validación de producto sigue en el dominio y las sentencias SQL siguen en el repositorio.
- **Implicaciones de seguridad:** se registran explícitamente en `invoke_handler`; solo esos comandos quedan disponibles para la interfaz. Los mensajes de validación son comprensibles y los errores internos de SQLite se ocultan tras un mensaje genérico.
- **Estado gestionado:** `Builder::manage` registra una única `ProductDatabase` al iniciar la aplicación. Tauri comparte ese estado con cada comando; el `Mutex` da acceso exclusivo a la conexión mientras dura una operación.
- **Ejemplo pequeño:** React podrá usar `invoke('create_product', { input })`; el comando devuelve el producto creado o rechaza la `Promise` con un mensaje de error.

### Invocar comandos desde React

- **Qué es:** `invoke` de `@tauri-apps/api/core` envía una petición desde el WebView al comando Rust cuyo nombre recibe. Devuelve una `Promise` con el DTO serializado por Rust.
- **Por qué se usa en NubeOS:** la interfaz de productos usa una pequeña capa `productApi` que concentra las cinco llamadas permitidas: listar, crear, editar, archivar y restaurar.
- **Límite de responsabilidad:** React transforma los valores de texto del formulario en el DTO del contrato y presenta estados de carga o error. No valida reglas de dominio ni construye consultas SQL; Rust sigue siendo la fuente de verdad.
- **Ejemplo pequeño:** `await invoke<Product>('create_product', { input })` llama al comando `create_product`. El objeto exterior debe coincidir con los argumentos del comando (`input`, o `id` e `input` al editar).

### DTOs para operaciones compuestas

- **Qué son:** un DTO es la versión serializable de un tipo de dominio. Por ejemplo, `WeeklyPlanDto` contiene instancias planificadas y macros diarios ya resueltos, sin exponer `Meal`, `Product` ni la conexión SQLite.
- **Por qué se usa en NubeOS:** un único comando de consulta devuelve la semana necesaria para el calendario y otro devuelve entradas de compra ya agregadas por Rust.
- **Límite de responsabilidad:** el comando coordina repositorios y convierte el resultado a DTO; la normalización de unidades, los macros, el redondeo de paquetes y la cobertura siguen en el dominio Rust.
- **Ejemplo pequeño:** `await invoke<WeeklyPlan>('list_week', { weekStart })` mantiene `weekStart` como un dato de interfaz y recibe un plan listo para presentar.

### Evolución de contratos de comandos

- **Qué es:** los DTOs de un comando son contratos entre TypeScript y Rust. Pueden evolucionar cuando una tarea cambia el producto, siempre que Rust valide la nueva entrada y las migraciones preserven los datos guardados.
- **Por qué se usa en NubeOS:** el formulario envía precios como texto en euros (`"2,99"`) y el comando los convierte a céntimos antes de SQLite. También existe `move_planned_instance`, un comando pequeño que recibe solo la instancia y su destino; el reordenamiento real vive en Rust.
- **Límite de responsabilidad:** React puede conservar un borrador de texto y representar un arrastre, pero no convierte dinero, calcula compra ni decide las posiciones finales del calendario.
- **Implicaciones de seguridad:** Rust sigue comprobando que la cantidad es válida, que el supermercado pertenece al conjunto permitido y que el día y la franja de destino son correctos, aunque React haya limitado los controles visuales.
- **Ejemplo pequeño:** `invoke('move_planned_instance', { id, input: { weekday, slot, position } })` expresa la intención; el comando delega en una transacción del repositorio.
