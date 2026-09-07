# Notas de aprendizaje: Tauri

Este documento recoge conceptos de Tauri incorporados de forma consciente al proyecto.

## Barra de título personalizada

- **Qué es:** una ventana con `decorations: false` oculta el marco visual nativo y deja que React dibuje la superficie superior y sus controles.
- **Por qué se usa en NubeOS:** evita repetir el icono de la aplicación y permite una barra superior neutra, plana y coherente con el resto de la interfaz.
- **Límite de responsabilidad:** React presenta los botones y la región de arrastre; Tauri sigue ejecutando minimizar, maximizar o restaurar y cerrar mediante permisos limitados a la ventana principal.
- **Implicaciones de seguridad:** la capability concede únicamente las acciones de ventana necesarias. El resto de APIs de ventana no se habilita por este cambio.
- **Ejemplo pequeño:** la superficie vacía llama a `getCurrentWindow().startDragging()` al pulsar y a `toggleMaximize()` con doble clic. Declarar la capability en `app.security.capabilities` evita depender de su descubrimiento implícito.

## Comparar una presentación sin reconstruir la aplicación

Una vista aislada de Vite puede montar el mismo componente React con datos ficticios y alternar sus variantes. Así se revisa barra frente a anillo sin abrir SQLite ni generar un instalador. El porcentaje sigue llegando del contrato Rust; el SVG solo lo representa con `pathLength="100"`. La variante de prueba no cambia por sí sola la seleccionada en la aplicación.

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

### Arrastre en el WebView

- **Qué es:** el arrastre HTML basado en `draggable` y `dataTransfer` depende de la implementación del navegador embebido. Los eventos de puntero (`pointerdown`, `pointermove` y `pointerup`) describen directamente el gesto de ratón o táctil.
- **Por qué se usa en NubeOS:** en el calendario de comidas, el arrastre HTML nativo no entregaba de forma fiable el destino en el WebView de Tauri. React interpreta el gesto de puntero como estado temporal de interfaz, localiza la celda bajo el cursor y solicita a Rust el movimiento final.
- **Límite de responsabilidad:** React solo detecta origen, destino y posición visual. El comando `move_planned_instance` y el repositorio Rust validan y persisten el cambio de día, franja y orden.
- **Ejemplo pequeño:** al superar seis píxeles de desplazamiento, la tarjeta pasa a estado de arrastre, el origen se atenúa y una copia visual sigue al cursor. Al soltar sobre una tarjeta, su mitad superior inserta antes y su mitad inferior inserta después.

### Diálogos nativos y tokens opacos

- **Qué son:** el plugin oficial de diálogo abre el selector de Windows desde Rust. Después de elegir un PDF, Rust lo valida y devuelve a React un UUID temporal junto con el nombre y tamaño visibles.
- **Por qué se usan en NubeOS:** el formulario necesita referirse a una selección preparada sin recibir la ruta original ni conocer la carpeta privada de la aplicación.
- **Límite de responsabilidad:** React conserva el token mientras el formulario está abierto y pide importar o descartar. Rust relaciona el token con el temporal, impide reutilizarlo y realiza todas las operaciones de archivos.
- **Implicaciones de seguridad:** el contrato no acepta rutas construidas por React y el token no permite navegar por el sistema de archivos. Cancelar o abandonar el formulario retira la selección preparada.
- **Ejemplo pequeño:** `select_document_pdf` devuelve `{ token, originalFileName, sizeBytes }`; `import_document` consume ese token una sola vez.

### Respuestas IPC binarias y visor PDF local

- **Qué son:** un comando Tauri puede devolver `tauri::ipc::Response` con bytes sin serializarlos como JSON. PDF.js recibe esos bytes como `Uint8Array` y dibuja cada página en un `canvas` del WebView.
- **Por qué se usan en NubeOS:** el visor integrado necesita el contenido del PDF administrado, pero React no debe conocer su ruta privada. La transferencia binaria evita Base64, copias de texto innecesarias y contratos que acepten rutas arbitrarias.
- **Límite de responsabilidad:** Rust resuelve un `DocumentId`, comprueba que el documento exista y lee su archivo. React carga PDF.js, presenta las páginas y gestiona únicamente el estado visual del visor.
- **Implicaciones de seguridad:** el worker de PDF.js forma parte del bundle y funciona sin red. Al cambiar o cerrar el documento se cancelan renderizados y se destruye la tarea de carga para liberar recursos.
- **Ejemplo pequeño:** `read_document_pdf` responde con `Response::new(bytes)`; `invoke<ArrayBuffer>` entrega el cuerpo a `getDocument({ data: new Uint8Array(buffer) })`.

### Derivados binarios privados

- **Qué son:** archivos pequeños calculados a partir de un original administrado, como la miniatura JPEG de una portada GIF.
- **Por qué se usan en NubeOS:** Biblioteca puede mostrar una imagen estática ligera sin transferir ni decodificar todas las animaciones al abrirse.
- **Límite de responsabilidad:** Rust valida la identidad del título y guarda o lee la miniatura en una carpeta privada predecible; React genera el primer fotograma, solicita el GIF completo solo al interactuar y limita su caché de URLs.
- **Implicaciones de seguridad:** la interfaz nunca aporta rutas, la miniatura debe ser JPEG y tiene un máximo de 1 MB. El borrado definitivo elimina original y derivado.
- **Ejemplo pequeño:** `read_media_cover_thumbnail` devuelve bytes por IPC; si todavía no existe, React la genera una vez y `save_media_cover_thumbnail` la persiste para las siguientes visitas.

### Fechas y foco en WebView2

- Un `input type="date"` tiene segmentos internos que no son controles DOM independientes. Atrapar Tab al llegar al primer/último input puede impedir pasar de día a mes o año.
- Los guardas de foco en los extremos del modal permiten recorrer los segmentos antes de volver al principio. Se excluyen del foco inicial, junto a controles invisibles y con tabulación negativa.
- Para un resaltado morado fiable, Media usa tres inputs numéricos de presentación con `::selection` y conserva el calendario de un input date nativo auxiliar. El borrador parcial no se pierde y el año se normaliza al confirmar el segmento, no con un temporizador.
- Esto no mueve reglas de persistencia al navegador: Rust sigue rechazando fechas inválidas, futuras o anteriores al estreno cuando corresponda.

### Disponibilidad y sugerencias de estado

- Una propuesta derivada y un cambio persistido son distintos: confirmar el estado del contenido no actualiza por sí mismo el anime. El flujo debe consultar la propuesta del título devuelta por Rust y pedir otra confirmación si sigue Pendiente. Las pruebas de orquestación pueden ejecutar el módulo real con diálogos y comandos simulados, comprobando que Mantener no escribe y no descarta el progreso registrado.

- `Marcar todo` es un atajo de borrador, no un registro: usa el límite ya calculado (restantes o total del revisionado), permite deshacerlo y nunca inventa episodios si el total es desconocido. La casilla tiene dimensiones explícitas para no heredar el tamaño de los inputs de texto.

- El estado manual y el progreso registrado son independientes: `Terminado` con 0/13 puede representar un visionado pasado todavía sin historial. `canRewatch`, derivado en Rust, evita que el formulario envíe ese primer registro al comando de revisionado. La misma capacidad se valida al guardar.
- Un error del backend debe mostrarse dentro del modal que inició la operación, no solo en el workspace que queda tapado. El estreno junto al selector ayuda a entender los límites de fecha antes de guardar.

- Un estado de contenido futuro y una fecha desconocida no son lo mismo. Rust calcula el progreso disponible excluyendo únicamente Omitido y Por salir, y entrega por separado cuántos contenidos futuros quedan.
- `availableCompleted` exige al menos un contenido disponible; evita concluir que un anime vacío o solo anunciado está terminado. La sugerencia no modifica la entidad persistida.
- La interfaz detecta la transición tras un incremento y pide una decisión. Mantener conserva tanto el estado manual como el nuevo historial; una edición de fecha o un revisionado no dispara de nuevo el aviso.
- El diálogo compartido admite una alternativa recomendada y devuelve la elección, no escribe datos. Contiene el foco y restaura el control anterior; Escape equivale a Mantener.
- Compartir un enum entre títulos y contenidos no implica compartir todas sus opciones: un estado exclusivo requiere validación de dominio, restricción SQLite y listas de selección por contexto. La prueba de migración debe partir de un esquema anterior con filas, no solo de una base vacía.
- La jerarquía visual del progreso puede cambiar sin tocar el contrato Tauri: porcentaje y contador comparten una fila con alineación de línea base y salto flexible; los avisos de total desconocido se renderizan encima, mientras que la disponibilidad futura acompaña al estado en una fila compartida. Para anclar el pie abajo no basta con su margen automático: la tarjeta y el botón que contiene su cuerpo deben ocupar la altura disponible. Las filas de cabecera deben neutralizar ese margen y padding heredados para no generar espacios inesperados. Biblioteca y En curso reutilizan los mismos componentes y los valores derivados por Rust.

### Inicio automático de una aplicación Tauri en Windows

- El Administrador de tareas puede conservar un acceso de inicio obsoleto aunque su destino ya no exista. La presencia visual de la entrada no garantiza que Windows tenga un comando ejecutable.
- Una build de producción puede resolver su ubicación estable con `std::env::current_exe` y registrar esa ruta entre comillas en `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`. Las builds de desarrollo se excluyen para no guardar una ruta temporal de `target/debug`.
- `reg.exe` se ejecuta con `CREATE_NO_WINDOW` para evitar una consola fugaz. Un fallo se registra, pero no bloquea la apertura ni el acceso a los datos locales de NubeOS.
