# Spec — Anime

- Estado: Implementación completada; comprobación manual pendiente
- Última actualización: 2026-08-22

## Objetivo

Mantener una biblioteca dedicada de anime que permita seguir franquicias complejas y películas independientes sin mezclarlas con series o películas convencionales.

## Funcionalidades

- Vistas En curso, Biblioteca y Estadísticas limitadas a Anime.
- Crear una serie o franquicia Anime con contenidos ordenados.
- Crear una película anime independiente como título directo.
- Contenidos: Temporada, Película vinculada, OVA y Especial.
- Estados: Viendo, Pendiente, En pausa, Terminado, Abandonado y Esperando contenido.
- Progreso rápido `+1`, corrección manual e historial fechado por episodio o película.
- Canonicidad Canon, Recomendado, Opcional u Omitido.
- Puntuación y opinión del anime y de cada contenido.
- Número de catálogo estable y visible para saber cuántos animes forman la biblioteca.
- Géneros del anime, fecha de inicio y notas informativas de cada contenido.
- Puntuaciones entre 0 y 10 con precisión máxima de una décima, introducidas manualmente.
- Portada, favorito, búsqueda, filtros, Archivo y borrado definitivo confirmado.
- Ordenar la biblioteca por número de catálogo, valoración efectiva o título.
- Omitir un contenido mediante una acción rápida para excluirlo del progreso y de las medias.
- Consultar un historial global por año, mes, anime y contenido, con orden cronológico configurable.
- Editar la fecha de una entrada del historial y retirar únicamente el último episodio registrado de cada contenido.
- Usar portadas JPEG, PNG, WebP o GIF animado.
- Filtrar animes por estudio de animación calculado a partir de sus contenidos.
- Editar rápidamente estado y puntuación general desde el detalle, sin abrir el formulario completo.
- Mostrar una sugerencia de estado calculada a partir de los contenidos sin modificar nunca el estado manual.
- Una película vinculada permanece dentro de su franquicia; una película independiente como `Your Name` aparece directamente en Anime.
- La Biblioteca separa las franquicias y las películas anime independientes mediante dos minivistas, sin mezclarlas en la misma cuadrícula.
- La cantidad de títulos mostrada en `Mis top anime` puede elegirse entre 5, 10 y 25.
- Favorito se representa mediante una estrella accesible en la cabecera, no mediante una casilla dentro del formulario.
- La puntuación rápida se guarda automáticamente después de una breve pausa al escribir; Enter y el cambio de foco la confirman inmediatamente.
- Cambiar entre Anime y Películas anime no reordena durante un instante la colección anterior.
- Omitir y volver a incluir un contenido desde su tarjeta, sin abrir el formulario completo.
- Editar el estado de un contenido directamente en su tarjeta.
- Mostrar la confirmación manual del progreso únicamente cuando exista una corrección pendiente.
- Elegir el estado de cada contenido mediante un control segmentado de seis iconos visibles simultáneamente.
- Marcar o desmarcar un título como favorito directamente desde su tarjeta de Biblioteca.
- Elegir también el estado global del anime mediante el mismo control segmentado de iconos.
- Abrir la vista principal Historial desde la cabecera del anime o desde una tarjeta de contenido, con el anime y, cuando corresponda, el contenido ya filtrados.
- Mostrar la primera actividad registrada del ámbito consultado sin inferir fechas para progreso importado.
- Mostrar los contenidos de una franquicia en una cuadrícula de dos tarjetas por fila, con mayor altura para distribuir su información sin recuperar el formato de fila horizontal.
- Mantener visible `Guardar cambios` en cada contenido, desactivado mientras el progreso no tenga modificaciones.
- Presentar las acciones de cabecera como iconos uniformes y el estado general alineado con las puntuaciones, sin una caja anidada.
- Distribuir Tipo, Canonicidad, Estudio y Estreno a lo ancho de la cabecera de cada tarjeta, evitando concentrarlos en una columna estrecha.
- Alinear la puntuación con la parte superior de la identidad y colocar `Guardar cambios` y `Ver historial` bajo el contador y la fecha respectivamente.

## Reglas

- Solo una serie o franquicia Anime admite contenidos.
- Una película anime independiente tiene progreso binario y no admite contenidos.
- Los contenidos omitidos no reducen el progreso agregado.
- Si existen contenidos con total desconocido, el progreso conserva la suma conocida: `130 de 150 + ?`. Si ningún total es conocido, se muestra `X de ?`.
- Anime nunca lista títulos de Series o Películas convencionales.
- Los datos existentes clasificados como Anime permanecen en esta biblioteca tras la migración.
- El estado global continúa siendo manual hasta aprobar reglas automáticas específicas.
- Las sugerencias de estado son informativas: nunca guardan un cambio sin una acción explícita del usuario.
- El número de catálogo se asigna al crear un anime, no cambia al archivar o eliminar y no se reutiliza.
- El número de catálogo pertenece exclusivamente a una franquicia. Las películas anime independientes no reciben ni muestran número y nunca provocan la renumeración de franquicias existentes.
- Si el anime no tiene puntuación general manual, la interfaz y las estadísticas usan la media simple de sus contenidos puntuados.
- Las notas informativas de un contenido son independientes de su opinión personal.
- Los títulos sin valoración se colocan al final al ordenar por puntuación.
- La corrección manual del número de episodios requiere confirmación; el avance `+1` continúa siendo inmediato.
- `+1` depende del progreso real, no de que el contenido figure como Terminado. Se bloquea al alcanzar el total o si está Omitido, Abandonado o Esperando contenido.
- Aumentar el progreso crea una entrada por episodio nuevo. Reducirlo retira las entradas más recientes que excedan el nuevo progreso y no crea correcciones negativas visibles.
- El progreso existente antes de este refinamiento se conserva como punto de partida y no recibe fechas inventadas.
- Una fecha histórica puede corregirse. Solo el último episodio registrado de un contenido o la visualización de una película puede eliminarse, actualizando el progreso en la misma operación.
- El número mostrado en cada contenido representa un único orden recomendado; las rutas alternativas de visionado no se modelan todavía.
- Los estudios visibles en un anime son la unión sin duplicados de los estudios de sus contenidos.
- Omitir no elimina el contenido ni su historial. La acción inversa lo vuelve a incluir como Canon; otra canonicidad se elige desde la edición completa.
- Las fechas de inicio y fin configuradas siguen editables, pero no se muestran en la tarjeta de contenido. El estreno permanece como contexto objetivo.
- La primera actividad procede exclusivamente del historial persistido. Si el progreso importado no tiene sesiones, se indica que no existe una fecha registrada.
- El detalle del anime no contiene una copia incrustada del historial. Todos sus accesos conducen a la vista principal Historial.
- `Ver historial` desde la cabecera selecciona el anime y deja vacío el filtro de contenido. Desde una tarjeta selecciona tanto el anime como ese contenido.
- El filtro de contenido depende del anime seleccionado y solo ofrece contenidos de esa franquicia. Al cambiar de anime se limpia cualquier contenido que ya no pertenezca al nuevo anime.
- El orden visual de las tarjetas sigue el orden recomendado persistido y se lee de izquierda a derecha y de arriba abajo. Arrastrar una tarjeta continúa actualizando ese mismo orden.
- La cuadrícula usa dos columnas cuando existe anchura suficiente y una sola columna en ventanas estrechas.
- Las acciones secundarias de contenido no reservan una fila vacía: aparecen superpuestas al hacer `hover` o foco y las tarjetas reparten su altura entre información, estado y progreso.

## Importación inicial desde Notion

- La importación es una operación local y puntual, no una funcionalidad permanente de la aplicación.
- Se importan 62 animes no vacíos y sus contenidos válidos conservando su número de catálogo original.
- Los datos se normalizan antes de entrar en SQLite: espacios, caracteres de control, erratas inequívocas, tipos, estados y posiciones.
- Las continuaciones principales confirmadas pueden añadirse como contenido pendiente o esperando contenido.
- No se importan portadas, URLs de Notion ni identificadores externos.
- Antes de importar se crea una copia de seguridad de la base de datos local.

## Fuera de alcance

- APIs externas, recomendaciones, calendario de emisión y notificaciones.
- Sincronización posterior con Notion o actualización automática de datos externos.
- Episodios individuales con título o valoración propia.
- Revisualizaciones y varios periodos completos de visionado del mismo contenido.
- Rutas alternativas de visionado.
- Mezclar Anime, Series y Películas en una vista Todos.

## Criterios de aceptación

- [x] Una franquicia admite temporadas, películas, OVA y especiales ordenados.
- [x] Una película anime independiente puede marcarse vista sin crear contenido hijo.
- [x] Una película vinculada se muestra dentro de su anime de origen.
- [x] En curso, Biblioteca y Estadísticas contienen únicamente Anime.
- [x] Archivo, restauración y borrado mantienen el comportamiento seguro existente.
- [x] Los animes muestran un número de catálogo estable y permiten guardar géneros.
- [x] Los contenidos permiten guardar fecha de inicio y notas separadas de la opinión.
- [x] Las puntuaciones admiten décimas y la puntuación general cae en la media de contenidos cuando no existe una manual.
- [x] La importación local queda respaldada y no incluye enlaces ni portadas de Notion.
- [x] La biblioteca puede ordenarse por catálogo, valoración y título.
- [x] Un contenido puede omitirse rápidamente y deja de afectar al progreso y a la media.
- [x] El historial muestra episodios y películas con texto comprensible, no deltas numéricos.
- [x] La edición y retirada de historial mantienen sincronizado el progreso persistido.
- [x] Estado, puntuación, estudios, GIF y controles compartidos cumplen el refinamiento aprobado.
- [x] El formulario agrupa inicio y final en la misma fila y coloca el estreno en la siguiente.
- [x] La puntuación es un control visual principal, no un campo ordinario ni un selector con botón de confirmación.
- [x] La biblioteca separa franquicias y películas anime independientes y muestra `#n` sobre la portada de cada franquicia.
- [x] Las tarjetas de contenido priorizan visualmente puntuación, estado, tipo, canonicidad y fechas, en ese orden.
- [x] El Top permite mostrar 5, 10 o 25 franquicias y excluye películas independientes.
- [x] Archivo aparece antes de Añadir título y Favorito usa una estrella en la cabecera.
- [x] El progreso agregado distingue la suma conocida de la parte desconocida mediante `+ ?`.
- [x] La puntuación rápida se guarda sin exigir un clic fuera del control.
- [x] Cambiar de minivista oculta la colección anterior antes de aplicar el nuevo orden.
- [x] Las tarjetas separan puntuación, información, estado/progreso y acciones, reduciendo píldoras y ruido permanente.
- [x] El formulario de contenido recupera una cuadrícula compacta, agrupa campos y presenta las tres fechas en una sola fila.
- [x] Un contenido omitido puede volver a incluirse desde la misma acción rápida.
- [x] Estado, puntuación y progreso mantienen una jerarquía alineada y sin superficies anidadas.
- [ ] Guardar progreso permanece visible y solo se habilita cuando la corrección manual difiere del valor persistido.
- [x] Los seis estados pueden elegirse con un clic y muestran nombre accesible mediante ayuda contextual.
- [x] Un contenido Terminado con progreso incompleto admite `+1` y registra el episodio en el historial.
- [x] Favorito puede alternarse desde Biblioteca sin abrir el detalle.
- [x] Los estados activos se distinguen en los seis casos y todos muestran ayuda contextual al pasar el ratón.
- [x] Anime y contenido reutilizan el mismo selector segmentado controlado.
- [x] `+1` aparece inmediatamente a la derecha de la fecha.
- [x] La tarjeta separa título, clasificación y estreno y no muestra fechas de inicio o fin.
- [x] El historial puede abrirse completo o filtrado por contenido y comunica la primera actividad registrada.
- [ ] El detalle no incrusta el historial y sus accesos abren la vista principal Historial con los filtros de anime y contenido adecuados.
- [ ] El filtro de contenido permanece vacío o inactivo hasta elegir un anime y nunca muestra contenidos de otra franquicia.
- [ ] Los contenidos se presentan en dos tarjetas por fila, conservan su orden y pasan a una columna cuando falta anchura.
- [ ] Las tarjetas pueden seguir reordenándose mediante arrastre dentro de la nueva cuadrícula.
- [ ] Editar usa el mismo formato de icono que las demás acciones de la cabecera.
- [ ] Estado, Tu puntuación y Media comparten altura y Estado no contiene una segunda caja visible.
- [ ] Las tarjetas no conservan una fila inferior vacía cuando sus acciones secundarias están ocultas.
- [ ] Los metadatos superiores aprovechan el ancho de la tarjeta y se reorganizan sin solaparse cuando alguno falta.
- [ ] La puntuación comienza arriba y las acciones Guardar e Historial forman una segunda fila alineada con contador y fecha.
