# ADR-007: Previsualización de PDFs con PDF.js e IPC binario

- Estado: Aprobada por Nube
- Fecha: 2026-08-10
- Decisores: Nube

## Contexto

La spec de Documentos exige previsualizar PDFs de varias páginas dentro de NubeOS. Los archivos son privados, están administrados por Rust y sus rutas no deben formar parte de los DTO enviados a React.

La solución debe funcionar localmente y sin conexión en Windows 11, integrarse con React y Tauri, mostrar errores comprensibles y no incorporar edición, OCR ni búsqueda de contenido. También debe evitar representar el PDF como una cadena Base64 o una lista JSON de números, porque esas transformaciones aumentan memoria y coste de serialización.

Debemos elegir tanto el renderizador como el mecanismo para entregar el archivo privado a la interfaz.

## Alternativas

1. **PDF.js con bytes entregados mediante una respuesta IPC binaria.**
   - Flujo: React solicita el PDF por identificador; Rust resuelve y lee el archivo; `tauri::ipc::Response` devuelve bytes crudos; PDF.js recibe un `Uint8Array` y renderiza páginas en `canvas`.
   - Ventajas: React nunca conoce la ruta; no se habilita acceso general al sistema de archivos; el visor tiene comportamiento controlable y consistente; Tauri ofrece una respuesta binaria optimizada sin JSON ni Base64; todo funciona sin red.
   - Inconvenientes: añade `pdfjs-dist`; la primera versión mantiene el PDF completo en memoria de Rust y del WebView durante la carga; hay que configurar y empaquetar correctamente el worker de PDF.js; la dependencia procesa documentos potencialmente malformados y debe mantenerse actualizada.

2. **Visor PDF integrado de WebView2 mediante una URL local.**
   - Ventajas: evita PDF.js y puede aprovechar el visor incluido en Chromium/WebView2.
   - Inconvenientes: exige convertir una ruta privada en un recurso navegable o ampliar permisos del protocolo de assets; ofrece menos control visual; la disponibilidad y controles pertenecen a la versión instalada de WebView2; puede mostrar acciones fuera del alcance del producto y comportarse de forma distinta tras actualizaciones del runtime.

3. **PDF.js servido mediante un protocolo URI privado.**
   - Flujo: React entrega a PDF.js una URL con el identificador; un protocolo registrado en Rust resuelve el PDF y responde a las solicitudes.
   - Ventajas: no expone la ruta real; permitiría evolucionar a streaming, caché o peticiones por rango para archivos grandes.
   - Inconvenientes: introduce una nueva superficie HTTP-like dentro del WebView, validación de rutas y cabeceras, configuración de CSP y posibles diferencias de protocolo entre plataformas; es más infraestructura de la necesaria para los PDFs personales previstos.

4. **Sin previsualización interna; abrir siempre con Windows.**
   - Ventajas: mínima complejidad, sin renderizador adicional y sin bytes dentro del WebView.
   - Inconvenientes: contradice la spec aprobada y añade fricción para consultar rápidamente varios documentos.

## Decisión propuesta

Usar **PDF.js en React con el PDF entregado por un comando Tauri mediante `tauri::ipc::Response` binaria**.

El flujo será:

1. React solicita `read_document_pdf(documentId)`.
2. Rust valida el identificador y consulta el documento en SQLite.
3. Rust construye internamente la ruta administrada y verifica que el PDF existe y es legible.
4. El comando devuelve los bytes mediante la variante binaria de IPC.
5. React entrega el `Uint8Array` resultante a PDF.js.
6. PDF.js carga el documento y renderiza sus páginas en `canvas`.
7. Al cerrar el detalle o cambiar de documento, React cancela trabajo pendiente y destruye los recursos del visor.

No se devuelve Base64, una ruta privada ni una URL `file://`. React no usa un plugin de sistema de archivos y el comando solo acepta un `DocumentId`, nunca una ruta.

La primera versión carga el archivo completo. No implementa streaming, peticiones por rango, caché persistente, miniaturas guardadas, búsqueda textual, anotaciones ni edición. Si el uso real demuestra problemas con PDFs grandes, se evaluará un protocolo privado o streaming en una decisión posterior basada en medidas.

El visor proporciona únicamente los controles necesarios para recorrer páginas y reconocer carga o error. Abrir con Windows, guardar una copia y copiar el archivo siguen siendo casos de uso independientes controlados por Rust.

## Consecuencias

### Positivas

- La interfaz previsualiza PDFs sin conocer rutas privadas.
- No se concede a React acceso general al directorio de datos.
- El transporte binario evita el coste adicional de JSON o Base64.
- El comportamiento visual no depende del visor incorporado en una versión concreta de WebView2.
- PDF.js permite renderizar localmente y mantener el diseño coherente con NubeOS.
- El contrato entre capas sigue siendo pequeño: identificador de entrada y bytes o error de salida.

### Negativas y compromisos

- `pdfjs-dist` aumenta dependencias, tamaño del frontend y superficie de seguridad.
- El worker de PDF.js debe empaquetarse para funcionar sin conexión en desarrollo y producción.
- Un PDF grande ocupa memoria completa durante la lectura y puede existir simultáneamente en Rust, IPC y JavaScript.
- La interfaz debe cancelar renderizados y liberar recursos para evitar consumo acumulado al cambiar de documento.
- Los PDFs malformados pueden superar la validación inicial y fallar durante el renderizado; ese fallo debe aislarse y mostrarse sin afectar al resto del módulo.
- Será necesario revisar actualizaciones de PDF.js por correcciones de seguridad y compatibilidad.

## Seguimiento

- Crear una prueba del comando que confirme respuesta binaria y errores para documento o archivo ausente.
- Verificar manualmente PDFs de una página, varias páginas, distintos tamaños y un archivo corrupto.
- Medir tiempo de apertura y memoria con varios PDFs reales antes de declarar terminado el visor.
- Confirmar que el worker y los recursos de PDF.js se incluyen en el bundle y no solicitan red.
- Destruir explícitamente tareas y documentos PDF.js al cerrar o cambiar de detalle.
- Documentar en `docs/learning/tauri.md` la diferencia entre una respuesta serializada y `tauri::ipc::Response` binaria.
- Proponer una ADR sustituta si se incorpora streaming, protocolo privado, peticiones por rango o un visor diferente.
