# Diseño — Documentos

- Estado: Aprobado por Nube
- Última actualización: 2026-08-09
- Spec relacionada: `docs/modules/documents/spec.md`

## Propósito

Este documento concreta el modelo, las responsabilidades y los flujos técnicos necesarios para cumplir la spec aprobada del módulo Documentos. No divide todavía el trabajo en tareas ni autoriza la implementación.

El módulo pertenece únicamente a Documentos. No consulta ni modifica datos internos de Comidas ni de futuros módulos.

## Vista de alto nivel

```text
Interfaz React de Documentos
  ↓ comandos y respuestas serializables
Adaptadores Tauri de Documentos
  ↓
Casos de uso y dominio Rust
  ├─ Repositorio de metadatos → SQLite
  ├─ Almacén de PDFs → carpeta privada de la aplicación
  └─ Integraciones Windows → abrir, copiar y diálogos nativos
```

SQLite es la fuente de verdad de los metadatos y de la relación entre un documento y su archivo administrado. El contenido binario del PDF vive en el sistema de archivos privado; no se guarda como BLOB en SQLite.

## Entidades y tipos de dominio

### Documento

`Document` representa el agregado principal:

| Campo | Tipo conceptual | Regla |
| --- | --- | --- |
| `id` | `DocumentId` | UUID generado por Rust e inmutable |
| `name` | `DocumentName` | texto recortado y no vacío |
| `category` | `DocumentCategory` | uno de los valores cerrados |
| `document_date` | fecha opcional | fecha civil ISO, sin hora |
| `expires_on` | fecha opcional | fecha civil ISO, sin hora |
| `favorite` | booleano | se conserva al archivar |
| `status` | `Active` o `Archived` | nunca se infiere desde la interfaz |
| `original_file_name` | texto | nombre informativo del PDF seleccionado |
| `stored_file_name` | `StoredFileName` | identificador interno, nunca una ruta aportada por React |
| `file_size_bytes` | entero no negativo | tamaño de la copia administrada |
| `imported_at` | instante UTC | se asigna al importar |
| `updated_at` | instante UTC | cambia al editar o reemplazar |
| `tags` | colección de `Tag` | sin duplicados normalizados |

Las categorías del dominio son `Identity`, `Work`, `Education`, `Finance`, `Health`, `Housing`, `Vehicles`, `Resume` y `Other`. Los DTO las serializan con nombres estables en inglés; la traducción al español pertenece a la interfaz.

`stored_file_name` tendrá la forma `<document-id>.pdf`. No contiene el nombre visible, la categoría ni el nombre original, evitando colisiones y exposición innecesaria de información personal en el sistema de archivos.

### Etiqueta

`Tag` contiene un identificador, una etiqueta visible y una forma normalizada para comparar y sugerir. La normalización:

1. Recorta espacios exteriores.
2. Reduce secuencias internas de espacios a uno.
3. Convierte a minúsculas para comparar.
4. Conserva acentos y caracteres Unicode.

Dos etiquetas con la misma forma normalizada son la misma etiqueta. Se conserva la primera grafía visible guardada. Las etiquetas que dejan de estar asociadas a documentos pueden eliminarse durante la misma operación de actualización; no son datos independientes del usuario.

### Estado de caducidad

`ExpiryStatus` es un valor derivado, no persistido:

- `NoExpiry` si no existe `expires_on`.
- `Expired` si `expires_on < today`.
- `ExpiringSoon` si `today <= expires_on <= today + 30 días`.
- `Valid` en los demás casos.

El dominio recibe la fecha actual mediante una abstracción pequeña, `Clock` o equivalente. Producción obtiene el día civil de `Europe/Madrid`; las pruebas usan una fecha fija. El cambio de horario no afecta a las comparaciones porque las caducidades son fechas sin hora.

## Relaciones

```text
Document 1 ─── 1 ManagedPdf
Document n ─── n Tag
```

`ManagedPdf` no es una entidad editable por separado. Su ciclo de vida pertenece siempre a un documento.

Una categoría es un enum y no una tabla configurable. Favorito y estado son atributos del documento, no colecciones independientes.

## Persistencia SQLite

Se propone el siguiente esquema conceptual, cuyos nombres definitivos se fijarán en la migración:

### `documents`

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `normalized_name TEXT NOT NULL`
- `category TEXT NOT NULL`
- `document_date TEXT NULL`
- `expires_on TEXT NULL`
- `is_favorite INTEGER NOT NULL`
- `status TEXT NOT NULL`
- `original_file_name TEXT NOT NULL`
- `normalized_original_file_name TEXT NOT NULL`
- `stored_file_name TEXT NOT NULL UNIQUE`
- `file_size_bytes INTEGER NOT NULL`
- `imported_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `document_tags`

- `id TEXT PRIMARY KEY`
- `label TEXT NOT NULL`
- `normalized_label TEXT NOT NULL UNIQUE`

### `document_tag_links`

- `document_id TEXT NOT NULL`
- `tag_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- clave primaria compuesta por documento y etiqueta
- claves foráneas con borrado en cascada

La posición conserva el orden elegido al editar. Se añaden índices sobre estado, categoría, favorito, caducidad, nombre normalizado y las claves de relación. Las fechas civiles se almacenan como `AAAA-MM-DD`; los instantes, en UTC con formato estable.

La búsqueda normaliza el texto recibido y consulta nombre, nombre original y etiquetas. Los filtros se combinan mediante `AND`. Dentro del filtro de etiquetas, seleccionar varias exige que el documento contenga todas ellas; esta semántica permite estrechar progresivamente la colección. Los valores vacíos no aplican filtro.

Las ordenaciones de caducidad sitúan siempre los valores nulos al final, tanto en orden ascendente como descendente.

## Almacenamiento privado de PDFs

El directorio de datos de la aplicación contiene una zona propiedad del módulo:

```text
<app-data>/
├─ nubeos.sqlite3
└─ documents/
   ├─ files/
   │  └─ <document-id>.pdf
   ├─ staging/
   └─ recovery/
```

React no conoce estas rutas. Rust construye todas las rutas administradas combinando el directorio raíz conocido y un `StoredFileName` validado. Ninguna entrada externa puede introducir separadores, `..` ni una ruta absoluta como nombre administrado.

El archivo seleccionado por el usuario se valida antes de copiarlo:

- Existe y es un archivo regular legible.
- No está vacío.
- Tiene extensión `.pdf`, sin distinguir mayúsculas.
- Su cabecera comienza por la firma PDF esperada.

Esta validación evita errores evidentes, pero no promete verificar toda la estructura interna del formato. El renderizador puede rechazar posteriormente un PDF corrupto con un error de previsualización.

### Coordinación entre SQLite y el sistema de archivos

SQLite no puede incluir operaciones de archivos dentro de su transacción. El módulo usa copias temporales, renombrados dentro del mismo directorio y compensaciones para mantener un resultado coherente.

La selección prepara primero el archivo: Rust abre el diálogo, valida el PDF, lo copia a `staging` y devuelve un token opaco de un solo uso. Todavía no existe ningún documento. Este temporal se consume al importar o reemplazar, se retira al cancelar y caduca si la aplicación se cierra de forma inesperada.

#### Importación

1. Validar los metadatos y el token temporal.
2. Abrir una transacción SQLite e insertar documento y etiquetas.
3. Renombrar el temporal a su ubicación final dentro de `files`.
4. Confirmar la transacción y consumir el token.
5. Si un paso falla, revertir la transacción y retirar la copia nueva cuando exista.

#### Reemplazo

1. Validar el documento y el token temporal preparado.
2. Abrir una transacción y preparar los nuevos datos de archivo.
3. Mover el PDF anterior a una ubicación temporal de retirada.
4. Renombrar el nuevo temporal al nombre final estable del documento.
5. Confirmar en SQLite el nuevo nombre original, tamaño y fecha de actualización, y consumir el token.
6. Eliminar el PDF retirado después de confirmar.
7. Ante un fallo previo a la confirmación, retirar el nuevo y devolver el anterior a su ubicación.

#### Eliminación definitiva

1. Verificar que el documento está archivado.
2. Mover su PDF de `files` a una ubicación temporal de retirada.
3. Eliminar metadatos y relaciones dentro de una transacción.
4. Confirmar la transacción.
5. Eliminar el temporal.
6. Si la transacción falla, devolver el archivo a su ubicación anterior.

Al iniciar el módulo, una reconciliación acotada limpia selecciones temporales caducadas y resuelve archivos en retirada producidos por una interrupción entre pasos. Un PDF final sin referencia nunca se elimina automáticamente: se desplaza a una zona interna de recuperación para evitar destruir el único ejemplar por un error de coordinación. La reconciliación nunca examina ni elimina rutas fuera de `documents/`; sus reglas exactas deben quedar cubiertas por pruebas antes de habilitar borrado definitivo.

La estrategia de archivos administrados y recuperación tras interrupciones necesita una ADR propia antes de implementarse.

## Casos de uso

### Consultas

- Listar documentos con estado, búsqueda, filtros y ordenación.
- Obtener el detalle de un documento.
- Listar etiquetas existentes para sugerencias.
- Obtener resumen de caducidades activas.
- Leer el PDF de un documento para previsualizarlo.

### Modificaciones

- Importar un documento.
- Editar sus metadatos y etiquetas.
- Cambiar su condición de favorito.
- Reemplazar su PDF.
- Archivar y restaurar.
- Eliminar definitivamente un documento archivado.
- Guardar una copia fuera de NubeOS.

### Integraciones del sistema

- Abrir el PDF administrado con la aplicación predeterminada.
- Copiar el PDF administrado al portapapeles como archivo.

## Contratos Tauri

Los comandos son adaptadores pequeños. Reciben identificadores y DTO, localizan el documento desde Rust y nunca aceptan una ruta privada administrada enviada por React.

| Comando propuesto | Entrada | Salida |
| --- | --- | --- |
| `list_documents` | estado, búsqueda, filtros, orden | lista de `DocumentSummaryDto` |
| `get_document` | `documentId` | `DocumentDetailDto` |
| `list_document_tags` | texto opcional | etiquetas sugeridas |
| `get_document_expiry_summary` | ninguna | contadores de caducados y próximos |
| `select_document_pdf` | ninguna; abre diálogo nativo | token temporal y datos visibles del PDF, o cancelación |
| `discard_pending_document_pdf` | token temporal | confirmación |
| `import_document` | metadatos y token temporal | detalle creado |
| `update_document` | identificador y metadatos | detalle actualizado |
| `set_document_favorite` | identificador y booleano | confirmación |
| `replace_document_pdf` | identificador y token temporal | detalle actualizado |
| `archive_document` | identificador | confirmación |
| `restore_document` | identificador | confirmación |
| `delete_document` | identificador archivado | confirmación |
| `read_document_pdf` | identificador | respuesta IPC binaria |
| `open_document_pdf` | identificador | confirmación |
| `copy_document_pdf` | identificador | confirmación |
| `save_document_copy` | identificador; abre diálogo nativo | confirmación o cancelación |

React no recibe rutas fuente, destino ni rutas privadas. `select_document_pdf` abre el diálogo desde Rust, valida y copia la selección a `staging`, y devuelve un token aleatorio de un solo uso junto con el nombre original y el tamaño para mostrarlos. Rust conserva temporalmente la asociación entre token y archivo preparado. Importar o reemplazar consume el token; cancelar el formulario lo descarta. Los temporales que sobrevivan a un cierre inesperado se limpian al iniciar.

`save_document_copy` resuelve el documento y abre el diálogo de guardado desde Rust. Solo escribe en el destino confirmado por ese diálogo durante la misma operación. Los DTO de documento nunca incluyen `stored_file_name` ni rutas del sistema.

Los errores de frontera se representan mediante un código estable y un mensaje comprensible. Como mínimo se distinguen: documento inexistente, documento no archivado, selección inválida, PDF inválido, archivo administrado ausente, permiso denegado, destino ocupado o cancelado y fallo interno. La cancelación de un diálogo no se presenta como error.

## Selección, apertura y guardado nativos

Se propone usar el plugin oficial de diálogo de Tauri desde Rust para seleccionar un único PDF y elegir el destino de «Guardar copia». React inicia el caso de uso, pero recibe únicamente un token temporal o su resultado; no recibe rutas ni usa el plugin de sistema de archivos.

La apertura con el lector predeterminado se ejecuta desde Rust mediante el plugin oficial `opener`, resolviendo primero el documento por identificador. De este modo la ruta privada no atraviesa el contrato de React.

Las capacidades Tauri se limitan a los diálogos y operaciones necesarias. No se concede a React acceso general al directorio de datos de la aplicación.

## Previsualización PDF

Se propone utilizar `pdfjs-dist`, distribución oficial de PDF.js, dentro de la interfaz. PDF.js renderiza páginas en elementos `canvas`; no edita ni persiste el contenido.

Flujo:

1. React solicita `read_document_pdf(documentId)`.
2. Rust valida el identificador, consulta SQLite y resuelve internamente el archivo.
3. Rust lee el PDF y devuelve una `tauri::ipc::Response` binaria.
4. React convierte la respuesta en `Uint8Array` y la entrega a PDF.js.
5. El visor renderiza las páginas bajo demanda y libera sus recursos al cerrar o cambiar de documento.

La respuesta binaria evita serializar el archivo como JSON o Base64. Esta primera versión carga el PDF completo en memoria para previsualizarlo. No se implementan streaming, peticiones por rango ni caché persistente; si el uso real muestra PDFs demasiado grandes, se diseñará una mejora independiente.

El visor muestra carga, número de páginas y errores. No incorpora búsqueda de texto, descarga interna, anotaciones ni controles de edición.

La incorporación de PDF.js y el transporte binario se aprobarán mediante una ADR por su impacto en dependencias, memoria y tratamiento de documentos no confiables.

## Portapapeles de Windows 11

Windows representa una lista de archivos existentes mediante el formato de portapapeles `CF_HDROP`. El caso de uso `copy_document_pdf`:

1. Resuelve el documento y verifica que su PDF existe.
2. Abre el portapapeles de Windows.
3. Publica una lista `CF_HDROP` con la ruta absoluta del PDF administrado.
4. Cierra el portapapeles y devuelve confirmación.

Se propone encapsular esta integración en un adaptador compilado solo para Windows mediante `clipboard-win`, que expone `FileList` como envoltorio de `CF_HDROP`. El código del dominio no conoce Win32 ni contiene `unsafe`; el módulo solo depende de un trait conceptual como `FileClipboard`.

El portapapeles contiene temporalmente una referencia del sistema a la ruta privada porque Windows la necesita para pegar el archivo. Esa ruta no se muestra en la interfaz ni se registra. Mientras el documento exista, una aplicación compatible podrá leerlo desde el portapapeles; archivar no invalida la referencia, pero reemplazar o eliminar el documento puede hacerlo.

Si el portapapeles está ocupado por otra aplicación, se devuelve un error recuperable y el usuario puede repetir la acción. Copiar sustituye el contenido actual del portapapeles, como cualquier operación normal de Windows.

## Responsabilidades de React

- Mostrar accesos rápidos, resumen de caducidades, lista compacta, detalle y Archivo.
- Mantener búsqueda, filtros, orden, selección, diálogos y borradores no guardados.
- Traducir categorías, estados y errores para la interfaz.
- Solicitar mediante comandos los diálogos nativos y conservar solo los tokens temporales devueltos.
- Renderizar el binario recibido con PDF.js y liberar el visor al cerrarlo.
- Confirmar reemplazo y eliminación definitiva antes de solicitar el caso de uso.
- Refrescar consultas después de una modificación confirmada.

React no calcula el estado de caducidad, no construye rutas administradas, no copia archivos, no decide si un documento puede eliminarse y no accede directamente a SQLite.

### Estructura visible propuesta

```text
Documentos
├─ Resumen de caducidades, solo cuando aporta información
├─ Accesos rápidos de favoritos activos
├─ Buscador + filtros + ordenación + Añadir PDF
├─ Lista compacta de documentos activos
├─ Detalle con previsualización y acciones
└─ Archivo, accesible bajo demanda
```

La lista es la única representación de la colección; no existe selector de tarjetas. Al pulsar una fila se abre el detalle. La estrella cambia favorito sin abrir el formulario. Editar, reemplazar y archivar son acciones secundarias.

## Responsabilidades de Rust

- Validar entidades, fechas, categorías, etiquetas y transiciones de estado.
- Calcular caducidad y aplicar filtros y ordenaciones.
- Coordinar SQLite con el ciclo de vida de archivos administrados.
- Resolver identificadores a rutas internas sin aceptar rutas administradas externas.
- Validar PDFs y controlar importación, reemplazo, copia y eliminación.
- Entregar bytes para previsualización.
- Adaptar apertura y portapapeles de Windows.
- Traducir fallos de persistencia y sistema de archivos a errores de aplicación.

## Organización propuesta

Sin fijar todavía cada fichero, el módulo seguirá la organización vertical aprobada:

```text
src/documents/
  componentes, contratos TypeScript y acceso a comandos

src-tauri/src/documents/
  dominio, casos de uso, repositorios y adaptadores del módulo

src-tauri/migrations/
  migración identificada como propiedad de Documentos
```

Las piezas de diálogo, reloj o sistema de archivos no pasan a una zona compartida hasta existir un segundo consumidor real y una tarea explícita.

## Validación y pruebas

### Dominio Rust

- Nombre, categorías, etiquetas y transiciones de estado.
- Normalización y deduplicación de etiquetas.
- Cálculo exacto de los cuatro estados de caducidad en los límites de 30 días.
- Filtros «Próximos 30 días» y «Este año».
- Orden de fechas con ausencia de caducidad al final.

### Persistencia

- Migración sobre una base existente.
- Documento con cero o varias etiquetas.
- Búsqueda y combinaciones de filtros.
- Archivo, restauración y favoritos.
- Borrado en cascada de relaciones sin afectar otros módulos.

### Archivos

- Importación correcta y compensación ante fallos simulados.
- Reemplazo que conserva el anterior si falla.
- Eliminación definitiva y recuperación si falla la transacción.
- Reconciliación acotada de temporales, archivos en retirada y finales sin referencia, sin borrar automáticamente estos últimos.
- Rechazo de rutas administradas inválidas y falsos PDFs evidentes.

### Frontera e interfaz

- Los DTO no exponen rutas privadas.
- La respuesta del PDF es binaria.
- Los comandos traducen documento ausente, archivo ausente y permisos.
- Verificación manual del visor con PDFs de una y varias páginas.
- Verificación manual de abrir, copiar y pegar en aplicaciones compatibles de Windows 11.
- Verificación manual de guardar copia, cancelar diálogos y confirmar sobrescritura.

## Dependencias propuestas

Cada dependencia se incorporará únicamente en la tarea que la necesite:

- `tauri-plugin-dialog`: selector y diálogo de guardado oficiales.
- `tauri-plugin-opener`: apertura con la aplicación predeterminada.
- `pdfjs-dist`: renderizado local y sin conexión de PDFs.
- `clipboard-win`, solo bajo `cfg(windows)`: publicación de archivos mediante `CF_HDROP`.
- Una biblioteca de fecha y zona horaria capaz de obtener `Europe/Madrid`, si la biblioteca estándar no cubre el contrato de forma clara.

No se propone `tauri-plugin-fs`: React no necesita acceso general a archivos. Tampoco se introduce una biblioteca para guardar PDFs en SQLite, analizar su contenido o cifrarlos.

## Decisiones pendientes

Antes de crear `tasks.md` se proponen dos ADR:

1. **Almacenamiento administrado de archivos junto a metadatos SQLite.** Debe aprobar la separación entre SQLite y PDFs, el directorio privado, el uso de `staging`, las compensaciones y la reconciliación tras interrupciones.
2. **Previsualización con PDF.js mediante IPC binario.** Debe comparar el visor integrado de WebView2, un protocolo local y PDF.js con bytes entregados por comando, incluyendo seguridad, memoria y mantenimiento.

La integración `CF_HDROP` permanece como decisión local del módulo y se documenta aquí; solo necesitará ADR adicional si la implementación exige `unsafe` propio, permisos amplios o una dependencia distinta con mayor impacto.

## Fuentes técnicas revisadas

- [Tauri: respuestas binarias desde comandos](https://v2.tauri.app/develop/calling-rust/)
- [Tauri: plugin oficial de diálogos](https://v2.tauri.app/plugin/dialog/)
- [Tauri: plugin oficial para abrir archivos](https://v2.tauri.app/reference/javascript/opener/)
- [PDF.js: ejemplos oficiales](https://mozilla.github.io/pdf.js/examples/)
- [Microsoft: formatos de archivos en el portapapeles](https://learn.microsoft.com/en-us/windows/win32/shell/clipboard)
- [`clipboard-win`: formato `FileList`](https://docs.rs/clipboard-win/latest/clipboard_win/formats/struct.FileList.html)
