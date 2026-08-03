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
