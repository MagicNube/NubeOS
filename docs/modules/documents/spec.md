# Spec — Documentos

- Estado: Aprobada por Nube
- Última actualización: 2026-08-09

## Objetivo

Permitir al propietario de NubeOS conservar sus documentos personales importantes en un único archivador privado y local, encontrarlos con rapidez y utilizarlos sin depender de servicios externos. El módulo está orientado a documentos como currículums, identificaciones, nóminas, contratos, certificados o documentación académica.

NubeOS administra una copia propia de cada PDF importado. El archivo deja de depender de la ubicación desde la que se añadió y continúa disponible aunque el original se mueva, cambie de nombre o se elimine.

## Vocabulario del módulo

- **Documento:** registro personal formado por un PDF administrado por NubeOS y sus datos descriptivos.
- **Archivo administrado:** copia privada del PDF que pertenece al documento. No es un enlace al archivo original.
- **Categoría:** clasificación principal y cerrada de un documento.
- **Etiqueta:** término libre y reutilizable que permite clasificar un documento con mayor detalle.
- **Fecha del documento:** fecha opcional asociada a su emisión, generación o periodo de referencia.
- **Fecha de caducidad:** fecha opcional a partir de la cual el documento deja de estar vigente.
- **Favorito:** documento activo señalado como acceso rápido.
- **Archivo:** sección que contiene documentos retirados de la vista habitual sin eliminar su PDF.

## Alcance de la primera versión funcional

La primera versión permite importar PDFs individualmente, administrarlos mediante categorías y etiquetas, encontrarlos en una lista compacta, consultar su contenido, utilizarlos fuera de NubeOS, controlar caducidades y retirarlos de forma segura.

El módulo funciona únicamente en Windows 11 durante esta etapa. Los datos y archivos permanecen en el equipo local y no se cifran.

## Funcionalidades

### Importación y almacenamiento

El usuario puede seleccionar un PDF desde el sistema de archivos y completar sus datos antes de importarlo. La importación crea una copia dentro del almacenamiento privado de NubeOS; no mueve, modifica ni elimina el archivo original.

Un documento contiene:

- Nombre visible obligatorio.
- Categoría obligatoria.
- Cero o más etiquetas.
- Fecha del documento opcional.
- Fecha de caducidad opcional.
- Estado activo o archivado.
- Condición de favorito.
- Nombre original del archivo.
- Tamaño del PDF.
- Fecha de importación y última modificación de sus datos.

Las categorías disponibles inicialmente son:

- Identidad.
- Trabajo.
- Formación.
- Finanzas.
- Salud.
- Vivienda.
- Vehículos.
- Currículum.
- Otros.

Las etiquetas son libres. Al escribirlas, la interfaz sugiere etiquetas ya existentes para facilitar su reutilización y evitar variantes accidentales. Un documento puede existir sin etiquetas.

La importación solo se completa si pueden guardarse tanto el PDF administrado como sus datos. Un fallo no debe producir un documento sin PDF ni dejar una copia huérfana visible como parte de la colección.

### Consulta y organización

La vista principal presenta únicamente una lista compacta. Cada entrada permite reconocer como mínimo el nombre, la categoría, las etiquetas, el estado de caducidad y si es favorita.

El usuario puede:

- Buscar por nombre visible, nombre original y etiquetas.
- Filtrar por categoría.
- Filtrar por una o más etiquetas.
- Mostrar solo favoritos.
- Filtrar por estado o periodo de caducidad.
- Ordenar por nombre, fecha de importación o fecha de caducidad.

Cuando se ordena por caducidad, los documentos sin fecha de caducidad aparecen después de los que sí tienen fecha.

La vista principal muestra accesos rápidos a los documentos favoritos activos. Archivar un favorito lo oculta de estos accesos, pero conserva su condición para una posible restauración.

### Caducidad

La fecha de caducidad no es obligatoria. Los documentos sin caducidad, como una nómina antigua o un PDF académico, se muestran como «Sin caducidad» y no generan avisos.

Los estados derivados son:

- **Vigente:** caduca dentro de más de 30 días.
- **Caduca pronto:** caduca durante los próximos 30 días, incluyendo el día actual.
- **Caducado:** su fecha de caducidad es anterior al día actual.
- **Sin caducidad:** no tiene fecha definida.

El cálculo utiliza la fecha local de España. La vista principal destaca de forma calmada si existen documentos caducados o próximos a caducar, sin mostrar notificaciones del sistema operativo.

Los filtros de caducidad incluyen:

- Todos.
- Caducados.
- Próximos 30 días.
- Este año.
- Sin caducidad.

El usuario puede ordenar los resultados con caducidad por «Caducan antes» o «Caducan después». El filtro «Este año» incluye documentos cuya caducidad pertenece al año natural actual.

### Detalle y previsualización

Al seleccionar un documento se abre una vista de detalle con sus datos y una previsualización integrada del PDF. La previsualización permite recorrer todas sus páginas sin modificar el archivo.

Desde el detalle se puede:

- Abrir el PDF con la aplicación predeterminada de Windows.
- Copiar el PDF al portapapeles de Windows como archivo.
- Guardar una copia del PDF en una ubicación elegida por el usuario.
- Editar sus datos descriptivos.
- Marcarlo o retirarlo de favoritos.
- Reemplazar su PDF.
- Archivarlo.

«Copiar archivo» permite pegar posteriormente el PDF en aplicaciones de Windows 11 que acepten archivos desde el portapapeles, por ejemplo un cliente de mensajería. No copia el contenido textual ni muestra al usuario la ruta privada de NubeOS. Tras la operación, la interfaz confirma que el PDF está listo para pegarse.

«Guardar copia» crea un PDF fuera del almacenamiento privado en la ubicación elegida. No cambia el documento administrado ni constituye una copia de seguridad o exportación completa de NubeOS.

### Edición y reemplazo

El usuario puede modificar el nombre, la categoría, las etiquetas, la fecha del documento y la fecha de caducidad sin alterar el PDF administrado.

También puede reemplazar el PDF conservando todos esos datos, su estado y su condición de favorito. Antes de confirmar, la interfaz advierte que la copia administrada anterior se sustituirá permanentemente y no existirá historial de versiones.

El reemplazo solo finaliza cuando el nuevo PDF está guardado y asociado correctamente. Si falla, el documento continúa utilizando el PDF anterior. NubeOS no modifica ni elimina el nuevo archivo original seleccionado por el usuario.

### Archivado y eliminación

Archivar un documento lo retira de la lista principal y de los accesos rápidos, pero conserva sus datos y su PDF administrado. Desde Archivo se puede restaurar.

La eliminación definitiva solo está disponible para documentos archivados. Requiere confirmación explícita e informa de que también se eliminará el PDF privado de NubeOS y que la acción no puede deshacerse.

Eliminar definitivamente nunca elimina el archivo original desde el que se realizó la importación ni las copias que el usuario haya guardado posteriormente fuera de NubeOS.

## Reglas de negocio

- El nombre visible no puede estar vacío.
- Todo documento pertenece a exactamente una categoría admitida.
- Solo se admiten archivos PDF en esta versión.
- La fecha del documento y la fecha de caducidad son independientes y opcionales.
- No es obligatorio que la fecha de caducidad sea posterior a la fecha del documento, porque pueden importarse documentos ya caducados o fechas cuyo significado no sea de emisión.
- Pueden existir varios documentos con el mismo nombre, categoría o archivo original.
- Un favorito archivado no aparece en accesos rápidos.
- Editar datos no modifica el contenido del PDF.
- Reemplazar el PDF no crea una versión anterior recuperable.
- Los estados de caducidad se calculan a partir de la fecha actual; no se guardan como una segunda fuente de verdad.

## Casos límite y errores

- Cancelar el selector o el formulario no importa ningún documento.
- Un archivo inexistente, inaccesible, vacío o que no sea un PDF válido produce un error comprensible y no crea el documento.
- Si un PDF administrado falta o no puede leerse, el documento sigue identificable y la interfaz informa del problema sin bloquear la consulta del resto de la colección.
- Si una previsualización no puede mostrarse, siguen disponibles las acciones que puedan realizarse de forma segura, como intentar abrir o guardar una copia.
- Un fallo al abrir, copiar o guardar una copia no modifica ni elimina el documento.
- Guardar una copia en una ubicación que ya contiene un archivo con el mismo nombre solicita al usuario confirmar el reemplazo mediante el diálogo del sistema.
- Si el destino de una copia deja de estar disponible, se informa del fallo y se conserva el archivo privado.
- Si falla la eliminación física durante un borrado definitivo, el sistema no debe presentar la operación como completada.
- Una colección sin documentos, una búsqueda sin resultados o un Archivo vacío muestran estados vacíos claros.
- Un documento puede no tener etiquetas, fecha del documento ni caducidad.
- Las etiquetas duplicadas dentro del mismo documento se consideran una sola etiqueta.

## Privacidad y restricciones

- Los PDFs y sus datos se almacenan únicamente en el equipo local.
- No se envían documentos, metadatos ni contenido a servicios externos.
- El almacenamiento no está cifrado en esta versión. Otros usuarios o programas con acceso a la sesión y a los archivos del equipo podrían leer los documentos.
- La interfaz no presenta un PIN ni mensajes que impliquen una protección criptográfica inexistente.
- La aplicación no debe registrar en logs el contenido de los PDFs ni rutas privadas completas en mensajes destinados al usuario.
- Los documentos personales, la base de datos local y la carpeta privada nunca forman parte del repositorio Git.
- El comportamiento de copiar archivos al portapapeles se soporta exclusivamente en Windows 11 durante esta versión.

## Fuera de alcance

- Cifrado, contraseña, PIN o bloqueo biométrico.
- Copias de seguridad, restauración, sincronización entre equipos o almacenamiento remoto.
- OCR, extracción de texto y búsqueda dentro del contenido del PDF.
- Importación de imágenes, documentos Word u otros formatos.
- Importación múltiple y edición masiva.
- Historial de versiones o recuperación del PDF sustituido.
- Notas libres asociadas a documentos.
- Carpetas visuales, subcarpetas y categorías personalizadas.
- Notificaciones de Windows sobre caducidades.
- Relaciones entre documentos, expedientes y listas de documentación requerida.
- Detección automática de duplicados por contenido.
- Edición, firma, anotación, combinación o división de PDFs.
- Compartir directamente mediante APIs de WhatsApp, correo u otros servicios.
- Exportación o importación completa de la colección de Documentos.

## Criterios de aceptación

- [ ] Se puede importar individualmente un PDF válido y continúa disponible después de mover o borrar el original.
- [ ] Una importación fallida no crea un documento incompleto ni una copia administrada huérfana.
- [ ] Se pueden editar nombre, categoría, etiquetas y fechas opcionales sin modificar el PDF.
- [ ] La lista compacta permite buscar, filtrar y ordenar documentos activos.
- [ ] Los favoritos activos aparecen como accesos rápidos y los archivados no.
- [ ] Los documentos se clasifican correctamente como vigentes, próximos a caducar, caducados o sin caducidad.
- [ ] Se puede filtrar por caducados, próximos 30 días, este año y sin caducidad, y ordenar por los que caducan antes o después.
- [ ] Se puede previsualizar un PDF de varias páginas dentro de NubeOS.
- [ ] Se puede abrir el PDF con la aplicación predeterminada de Windows 11.
- [ ] Se puede copiar el PDF como archivo y pegarlo en una aplicación compatible de Windows 11.
- [ ] Se puede guardar una copia en una ubicación elegida sin alterar el documento administrado.
- [ ] Se puede reemplazar el PDF conservando sus datos; un fallo mantiene intacta la versión anterior.
- [ ] Archivar conserva el documento y permite restaurarlo.
- [ ] Eliminar definitivamente un documento archivado borra sus datos y su PDF privado tras una confirmación explícita.
- [ ] NubeOS nunca elimina el PDF original ni una copia exportada por el usuario.
- [ ] Los documentos y metadatos pueden utilizarse sin conexión y no se envían fuera del equipo.
