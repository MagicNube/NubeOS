# Tareas — Documentos

- Estado: Módulo completado y aprobado por Nube
- Última actualización: 2026-08-14

## Cómo usar este documento

Las tareas se realizan de una en una y requieren aprobación antes de implementar. Cada tarea mantiene un alcance pequeño, criterios observables y una verificación proporcional al riesgo. Una tarea posterior no empieza hasta completar y revisar sus dependencias.

El orden desarrolla primero reglas y persistencia, después un vertical mínimo utilizable y finalmente las integraciones de PDF. Las ADR-006 y ADR-007 ya están aprobadas y forman parte de las restricciones de todas las tareas. De forma excepcional, Nube aprobó implementar conjuntamente T-002 a T-018 hasta alcanzar una revisión funcional completa del módulo.

## T-001 — Crear el núcleo de dominio de documentos

- Estado: Completada
- Dependencias: ADR-006 y ADR-007 aprobadas
- Alcance: crear los tipos Rust `Document`, `DocumentId`, `DocumentName`, `DocumentCategory`, `DocumentStatus` y la información del PDF administrado, con constructores e invariantes. No incluye etiquetas, caducidad derivada, SQLite, archivos ni Tauri.
- Criterios de aceptación: el identificador y el nombre interno son seguros e inmutables; el nombre visible no puede estar vacío; categoría y estado son conjuntos cerrados; tamaño y nombres de archivo inválidos se rechazan; las fechas opcionales pueden representarse sin imponer relación entre ellas.
- Verificación: pruebas unitarias Rust de valores válidos, nombre vacío, categorías, estados e información de archivo; `cargo test` y revisión de naming y responsabilidades.

**Resultado:** se crea el módulo Rust `documents::document` con tipos propios para identificador UUID, nombre visible, nombre original del PDF, información del archivo, categoría, estado y fecha civil. Los constructores recortan y validan texto, rechazan nombres de archivo con rutas o extensiones distintas de PDF, impiden tamaños cero y comprueban días y años bisiestos. Un documento nuevo nace activo, no favorito y permite fechas opcionales independientes. No se añaden dependencias, persistencia, operaciones de archivos, comandos Tauri ni interfaz. Las cinco pruebas nuevas pasan junto con el resto del proyecto; `cargo clippy --all-targets -- -D warnings` confirma compatibilidad con el Rust mínimo `1.77.2`.

## T-002 — Modelar etiquetas y caducidad

- Estado: Completada
- Dependencias: T-001
- Alcance: añadir `Tag`, normalización y deduplicación, `ExpiryStatus` y una abstracción de fecha actual que permita producción en `Europe/Madrid` y pruebas deterministas. Incorporar solo la dependencia temporal mínima que resulte necesaria y documentar su justificación.
- Criterios de aceptación: espacios y mayúsculas no crean etiquetas duplicadas; se conserva la primera grafía visible; se distinguen sin caducidad, caducado, próximos 30 días y vigente exactamente en sus límites; las fechas se comparan como días civiles.
- Verificación: pruebas unitarias con una fecha fija para ayer, hoy, 30 días, 31 días y ausencia de caducidad; `cargo test`; nota en `docs/learning/rust.md` sobre la abstracción usada para el reloj.

**Resultado:** se añaden etiquetas con normalización Unicode, deduplicación que conserva la primera grafía y un reloj inyectable. `MadridClock` obtiene el día civil de `Europe/Madrid`; las pruebas fijas cubren ayer, hoy, 30, 31 días y cambio de año. Se documenta el patrón en aprendizaje de Rust.

## T-003 — Crear la migración SQLite de Documentos

- Estado: Completada
- Dependencias: T-001, T-002
- Alcance: crear y registrar una migración versionada para documentos, etiquetas y relaciones, con restricciones, claves foráneas e índices definidos en el design. No implementa todavía un repositorio.
- Criterios de aceptación: la migración se aplica sobre una base existente de NubeOS sin alterar tablas de Comidas; impide estados, categorías y relaciones inválidas; permite fechas opcionales y cero etiquetas.
- Verificación: prueba de migración en SQLite temporal, inspección de tablas e índices, ejecución conjunta de todas las migraciones existentes y `cargo test`.

**Resultado:** la migración `0009_create_documents.sql` crea documentos, etiquetas y relaciones con restricciones, cascadas e índices, y se ejecuta junto a las ocho migraciones existentes sin modificar las tablas de Comidas.

## T-004 — Implementar el repositorio básico

- Estado: Completada
- Dependencias: T-003
- Alcance: implementar el repositorio Rust para crear, obtener y listar documentos por estado, persistiendo todas sus propiedades y etiquetas en transacciones. No incluye búsqueda avanzada ni operaciones físicas sobre PDFs.
- Criterios de aceptación: un documento con cero o varias etiquetas sobrevive al cierre y reapertura de SQLite; las etiquetas compartidas no se duplican; el orden de etiquetas se conserva; obtener un identificador ausente devuelve un resultado explícito.
- Verificación: pruebas de integración con SQLite temporal para creación, reapertura, etiquetas compartidas, ausencia y aislamiento respecto a otros módulos; `cargo test`.

**Resultado:** `DocumentRepository` crea, obtiene y lista por estado dentro de transacciones. Las pruebas verifican cero o varias etiquetas, reutilización normalizada, orden, ausencia explícita y cierre y reapertura de una base SQLite real.

## T-005 — Crear el almacén privado y la preparación de PDFs

- Estado: Completada
- Dependencias: T-001, ADR-006
- Alcance: crear el adaptador Rust del almacén privado, las carpetas `files`, `staging` y `recovery`, la validación inicial de PDF, los nombres internos y tokens temporales de un solo uso. Incluye preparar y descartar una selección; no crea metadatos ni abre todavía diálogos Tauri.
- Criterios de aceptación: solo se aceptan archivos regulares, legibles, no vacíos, con extensión y firma PDF; ninguna entrada permite escapar de la raíz del módulo; preparar copia a `staging` sin modificar el original; consumir o descartar un token no puede repetirse.
- Verificación: pruebas con directorios temporales para PDF válido, falso PDF, vacío, ruta inexistente, token repetido y nombres con intentos de recorrido; `cargo test`; nota en `docs/learning/rust.md` sobre `Path`, `PathBuf` y operaciones de archivos.

**Resultado:** `PdfStore` crea `files`, `staging` y `recovery`, valida extensión, archivo regular, tamaño y firma `%PDF-`, y administra tokens UUID de un solo uso. Preparar copia el PDF sin tocar el original; descartar, promover y compensar solo operan bajo la raíz privada.

## T-006 — Implementar la importación coordinada

- Estado: Completada
- Dependencias: T-004, T-005
- Alcance: implementar el caso de uso que consume un PDF preparado, crea documento y etiquetas en SQLite y mueve el archivo a `files`, aplicando las compensaciones aprobadas. No expone comandos ni interfaz.
- Criterios de aceptación: una importación correcta deja un registro y un único PDF final; un fallo antes de confirmar no deja un documento visible ni consume irrecuperablemente el temporal; el token solo se consume una vez; el original permanece intacto.
- Verificación: pruebas de integración con repositorio y sistema de archivos temporales, incluyendo fallos simulados antes y después del renombrado; `cargo test` y revisión de rutas de compensación.

**Resultado:** el caso de uso de importación valida dominio y etiquetas, inserta metadatos en una transacción, promueve el temporal y solo entonces confirma. Una interrupción simulada después del renombrado devuelve el PDF a staging y revierte SQLite.

## T-007 — Reconciliar interrupciones del almacén

- Estado: Completada
- Dependencias: T-006
- Alcance: implementar la reconciliación acotada de temporales caducados, archivos en retirada y finales sin referencia. Los finales dudosos se mueven a `recovery`, nunca se eliminan automáticamente.
- Criterios de aceptación: el proceso solo opera dentro de la raíz de Documentos; limpia selecciones temporales caducadas; restaura o completa retiradas según SQLite; conserva en recuperación todo final sin referencia; puede ejecutarse repetidamente con el mismo resultado.
- Verificación: pruebas de cada estado interrumpido y de idempotencia, incluida una ruta externa que nunca debe tocarse; `cargo test` y revisión específica de acciones destructivas.

**Resultado:** al iniciar, la reconciliación limpia selecciones abandonadas, restaura retiradas referenciadas y mueve finales dudosos a `recovery`. Es idempotente y las pruebas confirman que no toca una ruta externa a Documentos.

## T-008 — Exponer el primer vertical mediante Tauri

- Estado: Completada
- Dependencias: T-006, T-007
- Alcance: añadir DTO y comandos para seleccionar un PDF mediante diálogo nativo, descartar una selección, importar, listar y obtener detalle. Registrar únicamente permisos y comandos necesarios; React no recibe rutas.
- Criterios de aceptación: cancelar el diálogo no es un error; la selección devuelve token, nombre y tamaño; los contratos usan `camelCase`; los errores distinguen selección inválida, PDF inválido, documento ausente y fallo interno; no se exponen nombres internos ni rutas.
- Verificación: pruebas de los adaptadores separando el diálogo mediante un puerto sustituible donde sea necesario, `cargo test`, `cargo clippy` y actualización de `docs/learning/tauri.md` sobre diálogos y tokens opacos.

**Resultado:** se incorpora el diálogo oficial de Tauri desde Rust y comandos pequeños para seleccionar, descartar, importar, listar y obtener detalle. Los DTO usan `camelCase`, devuelven errores con código y mensaje y no contienen rutas ni nombres internos. La selección, importación, persistencia y consulta de detalle se comprobaron en la aplicación Tauri de Windows 11.

## T-009 — Crear la interfaz mínima de Documentos

- Estado: Completada
- Dependencias: T-008
- Alcance: conectar la entrada Documentos de la barra lateral con un módulo React propio, crear contratos TypeScript, estado vacío, lista compacta y formulario de importación con nombre, categoría, etiquetas y fechas opcionales. Reutilizar el lenguaje visual oscuro de NubeOS sin modificar Comidas.
- Criterios de aceptación: el usuario selecciona un PDF, revisa sus datos, cancela sin importar o confirma y lo ve en la lista; los estados de carga, error y colección vacía son claros; cerrar el formulario descarta la selección temporal.
- Verificación: `pnpm build`, comprobación manual del flujo seleccionar → cancelar y seleccionar → importar → listar, y revisión de accesibilidad básica de formulario y lista.

**Resultado:** la barra lateral abre un workspace propio con estado vacío, lista compacta, selector nativo, formulario, errores, carga y detalle lateral. Cambiar de módulo o cancelar descarta el token pendiente. El build de producción pasa y el usuario comprobó que los documentos importados se conservan y sus detalles se abren correctamente.

## T-010 — Añadir búsqueda, filtros y ordenación

- Estado: Completada
- Dependencias: T-004, T-009
- Alcance: ampliar repositorio, comandos y React para buscar por nombre, nombre original y etiquetas; filtrar por categoría y por todas las etiquetas seleccionadas; ordenar por nombre, importación y caducidad con valores ausentes al final.
- Criterios de aceptación: los filtros vacíos no restringen; categoría y etiquetas se combinan mediante `AND`; varias etiquetas exigen contenerlas todas; la búsqueda usa valores normalizados; cambiar o limpiar filtros actualiza la lista y deja visible el estado seleccionado.
- Verificación: pruebas SQLite de combinaciones y ordenaciones, `cargo test`, `pnpm build` y comprobación manual con resultados, ausencia de resultados y limpieza de filtros.

**Resultado:** el repositorio combina búsqueda normalizada, categoría, todas las etiquetas seleccionadas y estado, y ordena por importación, nombre o caducidad manteniendo las fechas ausentes al final. React ofrece controles oscuros y actualiza la lista con una espera breve para no consultar en cada pulsación inmediata.

## T-011 — Añadir favoritos y resumen de caducidades

- Estado: Completada
- Dependencias: T-002, T-004, T-009
- Alcance: implementar cambio de favorito, accesos rápidos activos, resumen de caducados y próximos, filtros Todos/Caducados/Próximos 30 días/Este año/Sin caducidad y orden por caducan antes o después.
- Criterios de aceptación: la estrella responde sin abrir el formulario; solo favoritos activos aparecen como acceso rápido; el dominio calcula estados y periodos con el día de Madrid; documentos sin caducidad quedan al final al ordenar; el resumen no añade ruido cuando no hay incidencias.
- Verificación: pruebas Rust y SQLite con fechas límite y cambio de año, `cargo test`, `pnpm build` y comprobación manual de favoritos y cada filtro.

**Resultado:** los favoritos activos aparecen como accesos rápidos y pueden alternarse desde la lista o el detalle. El resumen solo se muestra cuando existen documentos caducados o próximos, y los filtros usan el día civil calculado por Rust en `Europe/Madrid`.

## T-012 — Editar metadatos y sugerir etiquetas

- Estado: Completada
- Dependencias: T-004, T-009
- Alcance: implementar consulta de etiquetas, edición de nombre, categoría, etiquetas y fechas, y formulario conectado desde el detalle. No modifica el PDF administrado.
- Criterios de aceptación: las sugerencias reutilizan etiquetas normalizadas; guardar reemplaza atómicamente las relaciones; cancelar no cambia datos; nombre vacío se rechaza en Rust y en la interfaz; el PDF y su tamaño permanecen iguales.
- Verificación: pruebas de repositorio y dominio para edición y limpieza de etiquetas sin uso, `cargo test`, `pnpm build` y comprobación manual de sugerencias, guardado y cancelación.

**Resultado:** el detalle permite editar todos los metadatos sin modificar el PDF. El repositorio sustituye las relaciones de etiquetas dentro de una transacción, reutiliza las normalizadas y elimina las que quedan sin referencias; las sugerencias proceden del catálogo persistido.

## T-013 — Archivar, restaurar y eliminar definitivamente

- Estado: Completada
- Dependencias: T-007, T-009
- Alcance: implementar archivo bajo demanda, archivado, restauración y borrado definitivo coordinado con el PDF. El borrado mueve primero el archivo, confirma SQLite y compensa fallos; solo se permite sobre documentos archivados.
- Criterios de aceptación: archivar conserva PDF, etiquetas y favorito, pero lo oculta de lista y accesos rápidos; restaurar recupera el estado; intentar borrar un activo se rechaza; confirmar elimina metadatos y PDF; un fallo restaura o conserva un estado recuperable.
- Verificación: pruebas de dominio, SQLite y archivos con fallos simulados, `cargo test`, `pnpm build` y comprobación manual de confirmación, restauración y rechazo de borrado activo.

**Resultado:** archivar y restaurar conservan el registro y el PDF. El borrado definitivo exige estado archivado, aparta primero el archivo a `recovery`, confirma SQLite y lo restaura si la operación no puede completarse. La interfaz exige una confirmación explícita.

## T-014 — Reemplazar el PDF administrado

- Estado: Completada
- Dependencias: T-007, T-009
- Alcance: implementar selección temporal y sustitución segura desde el detalle, conservando metadatos, estado y favorito. Apartar el PDF anterior hasta confirmar y no mantener historial después del éxito.
- Criterios de aceptación: la interfaz advierte de la sustitución permanente; cancelar conserva el anterior; el nuevo original nunca se modifica; un fallo mantiene utilizable el PDF anterior; el éxito actualiza nombre original, tamaño y fecha de modificación.
- Verificación: pruebas de integración para éxito y fallos en cada movimiento o confirmación, `cargo test`, `pnpm build` y comprobación manual con dos PDFs distinguibles.

**Resultado:** el reemplazo reutiliza la preparación validada, conserva los metadatos y aparta el PDF anterior hasta confirmar el nuevo. La interfaz advierte que no existe historial y descarta el temporal si se cancela la confirmación.

## T-015 — Entregar el PDF mediante IPC binario

- Estado: Completada
- Dependencias: T-004, T-005, T-008, ADR-007
- Alcance: implementar `read_document_pdf` resolviendo únicamente un `DocumentId` y devolviendo `tauri::ipc::Response` binaria. No incorpora todavía PDF.js ni interfaz de previsualización.
- Criterios de aceptación: un documento válido devuelve bytes exactos sin JSON, Base64 ni ruta; documento ausente, archivo ausente e ilegible producen errores diferenciados; el comando no acepta rutas.
- Verificación: pruebas del caso de uso y adaptador comparando bytes, `cargo test`, `cargo clippy` y nota en `docs/learning/tauri.md` sobre respuestas IPC binarias.

**Resultado:** `read_document_pdf` acepta únicamente el identificador, comprueba metadatos y archivo y devuelve `tauri::ipc::Response`. Una prueba compara el cuerpo `Raw` byte por byte y distingue documento inexistente de archivo administrado ausente; la técnica queda documentada en aprendizaje.

## T-016 — Crear el visor integrado con PDF.js

- Estado: Completada
- Dependencias: T-015
- Alcance: incorporar `pdfjs-dist`, configurar su worker local y crear en el detalle un visor de varias páginas con estados de carga y error. No incluye OCR, búsqueda, anotaciones ni descarga desde el visor.
- Criterios de aceptación: funciona sin red en desarrollo y bundle; muestra todas las páginas; cambiar o cerrar documento cancela tareas y libera recursos; un PDF corrupto falla solo en el visor; la dependencia y su impacto quedan registrados.
- Verificación: `pnpm build`, comprobación del bundle sin solicitudes externas y prueba manual con PDF de una página, varias páginas, tamaño representativo y archivo corrupto; inspección de limpieza al cambiar repetidamente.

**Resultado:** el detalle integra PDF.js mediante carga diferida del módulo, worker incluido localmente y páginas renderizadas en `canvas`. La carga muestra estados propios, los errores no rompen el resto del detalle y las tareas se cancelan o destruyen al cambiar de documento. El bundle funciona sin recursos remotos y el visor fue aceptado durante la revisión funcional del módulo.

## T-017 — Abrir el PDF y guardar una copia

- Estado: Completada
- Dependencias: T-005, T-008, T-009
- Alcance: añadir desde Rust las acciones para abrir el PDF con la aplicación predeterminada y guardar una copia mediante diálogo nativo. React solicita la acción por identificador y no recibe rutas.
- Criterios de aceptación: abrir resuelve siempre la copia administrada; guardar propone un nombre útil y respeta cancelar o confirmar sobrescritura; un error no modifica el documento; la copia exportada es independiente de NubeOS.
- Verificación: pruebas de puertos y errores donde sea automatizable, `cargo test`, `pnpm build` y comprobación manual en Windows 11 de apertura, guardado, cancelación y destino ocupado.

**Resultado:** Rust abre siempre la copia privada con la aplicación predeterminada y exporta mediante el diálogo nativo proponiendo el nombre original. Cancelar devuelve un resultado neutro y la interfaz solo confirma cuando realmente se guardó; las rutas no atraviesan el contrato React. Las acciones fueron aceptadas durante la revisión funcional del módulo.

## T-018 — Copiar el PDF al portapapeles de Windows

- Estado: Completada
- Dependencias: T-005, T-008, T-009
- Alcance: definir un puerto `FileClipboard` y una implementación Windows con `clipboard-win` y `CF_HDROP`, compilada solo para Windows. Añadir la acción al detalle sin `unsafe` propio.
- Criterios de aceptación: copiar publica el PDF administrado como archivo, sustituye el portapapeles normal y confirma la acción; documento o archivo ausente y portapapeles ocupado producen errores recuperables; la ruta no se muestra ni registra.
- Verificación: pruebas del caso de uso con adaptador falso, `cargo test`, `cargo clippy`, `pnpm build` y comprobación manual pegando en Explorador y al menos una aplicación compatible como WhatsApp Desktop.

**Resultado:** `FileClipboard` separa el caso de uso de la integración y `SystemFileClipboard` publica en Windows una lista de archivos mediante `clipboard-win`. La dependencia solo se compila para Windows, no existe `unsafe` propio y una prueba usa un adaptador falso. La acción y su aviso temporal fueron aceptados durante la revisión funcional del módulo.

## T-019 — Unificar detalle, formularios y controles visuales

- Estado: Completada
- Dependencias: T-009, T-016
- Alcance: convertir detalle, previsualización, importación y edición en diálogos modales; reutilizar los componentes visuales compartidos de modal, selector y aviso temporal; corregir el espaciado de la cabecera del detalle, unificar la navegación de Archivo con Comidas y separar la carga inicial de los refrescos por filtros. No modifica contratos Tauri, dominio, SQLite ni archivos administrados.
- Criterios de aceptación: al abrir un documento o formulario la colección queda atenuada y sin interacción; el foco se contiene y restaura al cerrar; `Escape`, cierre y fondo funcionan cuando procede; «PDF listo para pegar» desaparece automáticamente; todos los selectores muestran el mismo chevrón y margen derecho; Archivo y «Volver» usan el mismo texto y jerarquía que Productos y Comidas; cambiar filtros conserva la lista anterior hasta recibir el nuevo resultado y una respuesta obsoleta no puede sobrescribir la consulta más reciente.
- Verificación: `pnpm build`, revisión de duplicación y comprobación manual de detalle, visor, formularios, aviso temporal, selectores y navegación de Archivo.

**Resultado:** el detalle y el visor se abren en un modal amplio en lugar de dividir la colección; importación y edición usan el mismo plano modal. El aviso de copia desaparece automáticamente. Documentos reutiliza `Modal`, `SelectControl` y la navegación de Archivo compartidos, con foco contenido, cierre por fondo o `Escape` y restauración del foco. «Cargando documentos» queda reservado a la primera carga; los filtros refrescan silenciosamente y descartan respuestas obsoletas. La interfaz fue aceptada durante la revisión funcional del módulo.

## T-020 — Revisar y cerrar el módulo

- Estado: Completada
- Dependencias: T-010, T-011, T-012, T-013, T-014, T-016, T-017, T-018, T-019
- Alcance: revisar el módulo completo buscando duplicación, responsabilidades fuera de capa, permisos amplios, rutas filtradas, errores destructivos, problemas de memoria y divergencias respecto a spec, design y ADR. Completar documentación de aprendizaje y resultados de tareas sin añadir funcionalidad nueva.
- Criterios de aceptación: todos los criterios de la spec se trazan a una tarea y se verifican; no se registran rutas privadas ni contenido; capacidades y dependencias son mínimas; los temporales y recursos del visor se liberan; no quedan cambios accidentales en otros módulos.
- Verificación: `cargo fmt --check`, `cargo test`, `cargo clippy`, `pnpm build`, `git diff --check` y recorrido manual de importar, buscar, filtrar, editar, caducar, archivar, reemplazar, visualizar, abrir, copiar, guardar y eliminar.

**Resultado:** se revisaron límites de capas, contratos Tauri, permisos, rutas privadas, compensaciones de archivos, liberación del visor y coherencia con spec, design y ADR. `cargo fmt --check`, las 61 pruebas Rust, `cargo clippy --all-targets -- -D warnings`, `pnpm build` y `git diff --check` finalizan correctamente. Tras el recorrido funcional y el último refinamiento de carga, el módulo queda cerrado.
