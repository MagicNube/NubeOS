# Spec — Anime

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-04
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

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
- Géneros del anime, fecha de estreno y notas informativas de cada contenido.
- Puntuaciones entre 0 y 10 con precisión máxima de dos decimales, introducidas manualmente.
- Portada, favorito, búsqueda, filtros, Archivo y borrado definitivo confirmado.
- Ordenar la biblioteca por número de catálogo, valoración efectiva o título.
- Omitir un contenido mediante una acción rápida para excluirlo del progreso y de las medias.
- Consultar un historial global por año, mes, anime y contenido, con orden cronológico configurable.
- Leer cada entrada del historial con episodio, contenido y anime en el título, la fecha del visionado debajo y el estreno como contexto secundario a la derecha.
- Editar la fecha de una entrada del historial y retirar únicamente el último episodio registrado de cada contenido.
- Registrar revisionados de contenidos ya completados como instancias independientes, editables y eliminables, sin alterar su progreso principal.
- La etiqueta visible Revisionado corresponde a episodios ya registrados en una fecha anterior del mismo contenido, no al orden de introducción. Un bloque antiguo añadido después puede ser el primer visionado; la etiqueta de los posteriores se recalcula al crear, editar o eliminar sesiones. Dos bloques de episodios distintos no implican un revisionado. En el mismo día se conserva un desempate estable, priorizando el registro base.
- Un estado manual Terminado con episodios pendientes no activa el revisionado: el registro añade progreso normal. Al abrir el formulario se prioriza un contenido que admite avanzar, frente a los ya completos.
- Crear o editar un visionado de contenido muestra su estreno junto a la fecha (o indica que se desconoce), impide fechas anteriores y presenta los fallos dentro del formulario abierto.
- Bajo Episodios vistos, Marcar todo rellena únicamente los episodios restantes; en un revisionado rellena el total. La casilla no registra nada hasta confirmar, se desactiva si el total es desconocido y permite recuperar la cantidad previa al desmarcar.
- Editar tanto la fecha como el número de episodios de una instancia, sin permitir cantidades superiores al total del contenido.
- Modificar la puntuación de un contenido desde su propia tarjeta, sin abrir el formulario completo.
- En películas Anime independientes, elegir entre registrar inmediatamente con la fecha de hoy o abrir un formulario para indicar otra fecha; cada visionado ofrece edición y eliminación desde el detalle.
- Usar portadas JPEG, PNG, WebP o GIF animado.
- Cargar inicialmente una miniatura JPEG de las portadas GIF, solicitar la animación completa al interactuar y conservar una caché limitada de las últimas animaciones reproducidas.
- Permitir pegar una portada desde el portapapeles y normalizar esa copia a JPEG.
- Mostrar todas las portadas de Anime en formato horizontal, tanto en Biblioteca como en En curso, el detalle y el editor de encuadre.
- Reutilizar en En curso las mismas tarjetas que Biblioteca y añadir como única acción específica el avance rápido `+1 episodio` o el marcado de película vista.
- Editar rápidamente estado y puntuación general desde el detalle, sin abrir el formulario completo.
- Mostrar una sugerencia de estado calculada a partir de los contenidos sin modificar nunca el estado manual.
- Una película vinculada permanece dentro de su franquicia; una película independiente como `Your Name` aparece directamente en Anime.
- La Biblioteca separa las franquicias y las películas anime independientes mediante dos minivistas, sin mezclarlas en la misma cuadrícula.
- La cantidad de títulos mostrada en `Mis top anime` puede elegirse entre 5, 10 y 25.
- Favorito se representa mediante una estrella accesible en la cabecera, no mediante una casilla dentro del formulario.
- La puntuación rápida se guarda automáticamente después de una breve pausa al escribir; Enter y el cambio de foco la confirman inmediatamente.
- Cambiar entre Anime y Películas es inmediato: ambas subsecciones comparten una única colección cargada y se filtran localmente.
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
- Distribuir Tipo, Canonicidad, Último visionado y Estreno en el resumen de cada contenido, evitando concentrarlos en una única fila.
- Alinear la puntuación con la parte superior de la identidad y colocar `Guardar cambios` y `Ver historial` bajo el contador y la fecha respectivamente.

## Reglas

- Cada contenido dispone de recorridos independientes con registros de intervalos y fechas. Continuar sugiere el primer episodio pendiente del recorrido; Nuevo recorrido permite elegir libremente el primer episodio sin reinterpretar una pausa como un reinicio. Los rangos son editables y no se solapan dentro del mismo recorrido.
- Un recorrido puede estar En curso, Terminado o Interrumpido. Sus cambios no modifican el estado global del anime. Terminado exige todos los episodios si el total se conoce. El progreso principal se conserva separado de los revisionados.
- Los registros heredados mantienen sus fechas, episodios y permisos: el progreso original forma un recorrido base y cada bloque adicional forma uno independiente. No se unen recorridos automáticamente por proximidad de fechas.

- Variante seleccionada para revisión: porcentaje principal en morado y contador de episodios secundario en gris a su derecha, siempre anclados en la esquina inferior izquierda. El contenido por salir aparece a la derecha del estado sobre el título, como texto gris sin cápsula, solo cuando existe. Los avisos de total desconocido quedan encima del progreso. Sin barra, círculo ni cápsula. Conserva el cálculo y el tratamiento de totales desconocidos.

- Biblioteca y En curso muestran porcentaje destacado junto al contador y puntuación separada a la derecha. Sin total conocido se muestra `—` en lugar de un porcentaje inventado.
- Ante totales parciales, el porcentaje se calcula únicamente sobre los contenidos de total conocido y se etiqueta `del total conocido`; no significa que la franquicia esté completa. Omitidos, Por salir y revisionados no incrementan el porcentaje.
- Estreno significa primera disponibilidad legal en España, en cine, televisión, edición doméstica o plataforma, también subtitulada. Se usa la fecha civil de España peninsular; no se sustituye por el estreno japonés ni por una fecha de doblaje posterior.

- Solo una serie o franquicia Anime admite contenidos.
- Una película anime independiente no admite contenidos y conserva cada visionado o revisionado como una entrada histórica independiente.
- El estado de una película anime independiente es manual y nunca crea por sí solo un visionado. Su fecha de visionado se registra únicamente desde Historial.
- Los contenidos omitidos no reducen el progreso agregado.
- El estado Esperando contenido se presenta como `Por salir` en los contenidos. Estos no suman episodios al progreso disponible ni bloquean su finalización; se muestra su cantidad por separado. Pendiente sigue contando aunque no tenga fecha de estreno.
- Al completar todo lo disponible y quedar contenidos Por salir, el aviso permite elegir Esperando contenido (recomendado), Terminado o Mantener el estado del anime. Ninguna opción altera el historial ni los contenidos futuros. Sin contenidos disponibles no se considera que se haya terminado el anime.
- La disponibilidad se cambia manualmente: pasar de Por salir a Pendiente vuelve a incluir sus episodios. No se deduce de la fecha ni se programa un cambio automático.
- Si existen contenidos con total desconocido, el progreso conserva la suma conocida: `130 de 150 + ?`. Si ningún total es conocido, se muestra `X de ?`.
- Anime nunca lista títulos de Series o Películas convencionales.
- Los datos existentes clasificados como Anime permanecen en esta biblioteca tras la migración.
- El estado global continúa siendo manual hasta aprobar reglas automáticas específicas.
- Las sugerencias de estado son informativas: nunca guardan un cambio sin una acción explícita del usuario.
- El último contenido marcado se determina por el orden recomendado, excluyendo Omitidos, Pendientes y Por salir. Si está Abandonado o En pausa, se sugiere ese estado antes de inferir Viendo por episodios antiguos. Si hay actividad en un contenido posterior, prevalece esa nueva actividad.
- Todos los contenidos disponibles Pendientes y sin progreso sugieren Pendiente; tener únicamente contenidos Por salir sugiere Esperando contenido. Si aún hay contenido disponible en curso, los futuros no ocultan esa actividad. Se mantienen las reglas de cierre completo y Por retomar.
- Cambiar el estado, inclusión, orden o conjunto de contenidos muestra la propuesta con Mantener/Cambiar. Editar solo nombres, notas, fechas o puntuaciones no repite el aviso. Mantener conserva el contenido modificado sin cambiar el estado del anime.
- Un anime Pendiente con progreso disponible registrado sugiere Viendo aunque los episodios registrados pertenezcan solo a temporadas ya completas y queden otras sin empezar. Al aumentar episodios se pide confirmar también el estado del anime; Mantener conserva el historial. Si ya está visto todo lo disponible, prevalecen las sugerencias Terminado o Esperando contenido. La nueva comprobación no obliga a cambiar otros estados manuales ni cuenta contenidos Omitidos o Por salir.
- Añadir episodios sin completar un contenido propone Viendo si su estado es distinto. Mantener conserva el estado y el nuevo historial; corregir solo una fecha o reducir progreso no dispara esta propuesta.
- Las tarjetas abrevian únicamente los marcadores importados redundantes, reconociendo guiones y el nombre alternativo; conservan los títulos oficiales y el texto completo en la ayuda contextual.
- `Temporada 2 — Anime: Subtítulo` se presenta como `Temporada 2 — Subtítulo` cuando Anime coincide exactamente con el título principal o alternativo. Sin marcador de temporada se conserva el título oficial, por ejemplo `No Game No Life: Zero`. El nombre persistido nunca cambia.
- El número de catálogo se asigna al crear un anime, no cambia al archivar o eliminar y no se reutiliza.
- El número de catálogo pertenece exclusivamente a una franquicia. Las películas anime independientes no reciben ni muestran número y nunca provocan la renumeración de franquicias existentes.
- Si el anime no tiene puntuación general manual, la interfaz y las estadísticas usan la media simple de sus contenidos puntuados.
- Las notas informativas de un contenido son independientes de su opinión personal.
- Los títulos sin valoración se colocan al final al ordenar por puntuación. Estado admite varias selecciones y Anime también puede ordenarse por porcentaje visto; cualquier empate se resuelve por título.
- La corrección manual del número de episodios requiere confirmación; el avance `+1` continúa siendo inmediato.
- `+1` depende del progreso real, no de que el contenido figure como Terminado. Se bloquea al alcanzar el total o si está Omitido, Abandonado o Esperando contenido.
- Aumentar el progreso crea una entrada por episodio nuevo. Reducirlo retira las entradas más recientes que excedan el nuevo progreso y no crea correcciones negativas visibles.
- El progreso existente antes de este refinamiento se conserva como punto de partida y no recibe fechas inventadas.
- Una fecha histórica puede corregirse. Solo el último episodio registrado de un contenido o la visualización de una película puede eliminarse, actualizando el progreso en la misma operación.
- El número mostrado en cada contenido representa un único orden recomendado; las rutas alternativas de visionado no se modelan todavía.
- El estudio de animación no forma parte de los campos visibles, formularios, filtros ni estadísticas del módulo.
- El último visionado de cada contenido procede exclusivamente de su historial registrado; si no hay entradas, se muestra `Sin registros`.
- Las fechas de estreno españolas solo se incorporan cuando una fuente fiable permite verificarlas; una fecha desconocida nunca se deduce del estreno japonés.
- Omitir no elimina el contenido ni su historial. La acción inversa lo vuelve a incluir como Canon; otra canonicidad se elige desde la edición completa.
- Las fechas manuales de inicio y fin no se solicitan en contenidos; la actividad se obtiene del historial y el estreno permanece como contexto objetivo.
- La primera actividad procede exclusivamente del historial persistido. Si el progreso importado no tiene sesiones, se indica que no existe una fecha registrada.
- El detalle ofrece un resumen agrupado del historial para el uso cotidiano. La vista Historial completa continúa disponible en la navegación principal y desde el acceso iconográfico de la cabecera, sin repetir un botón textual dentro de cada tarjeta.
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
- Rutas alternativas de visionado.
- Mezclar Anime, Series y Películas en una vista Todos.

## Criterios de aceptación

- [x] Una franquicia admite temporadas, películas, OVA y especiales ordenados.
- [x] Una película anime independiente puede marcarse vista sin crear contenido hijo.
- [x] Una película anime independiente terminada pero sin historial continúa ofreciendo `Registrar visionado` y no muestra una fecha duplicada en su formulario principal.
- [x] El historial de una película independiente permite registrar hoy, registrar otra fecha y editar o eliminar su entrada con las mismas convenciones de Lectura.
- [x] Un contenido completado puede revisionarse varias veces; cada instancia conserva su fecha y puede editarse o eliminarse sin descontar episodios del progreso original.
- [x] Los campos de episodios se limitan mientras se escribe y la validación de Rust vuelve a impedir cualquier exceso.
- [x] La nota de un contenido dispone de edición rápida y autoguardado desde la vista Información.
- [x] Una película vinculada se muestra dentro de su anime de origen.
- [x] En curso, Biblioteca y Estadísticas contienen únicamente Anime.
- [x] Archivo, restauración y borrado mantienen el comportamiento seguro existente.
- [x] Los animes muestran un número de catálogo estable y permiten guardar géneros.
- [x] Los contenidos permiten guardar su estreno y notas separadas de la opinión.
- [x] Las puntuaciones admiten hasta dos decimales y la puntuación general cae en la media de contenidos cuando no existe una manual.
- [x] La importación local queda respaldada y no incluye enlaces ni portadas de Notion.
- [x] La biblioteca puede ordenarse por catálogo, valoración y título.
- [x] Un contenido puede omitirse rápidamente y deja de afectar al progreso y a la media.
- [x] El historial muestra episodios y películas con texto comprensible, no deltas numéricos.
- [x] La edición y retirada de historial mantienen sincronizado el progreso persistido.
- [x] Estado, puntuación, GIF y controles compartidos cumplen el refinamiento aprobado.
- [x] Las portadas de las franquicias y películas Anime usan siempre un encuadre horizontal.
- [x] Las estadísticas pueden filtrarse por puntuación mínima antes de calcular la media.
- [x] El resumen del contenido muestra su último visionado real y no ofrece campos ni filtros de estudio.
- [x] Cambiar entre Anime y Películas no muestra ni reordena fugazmente los resultados de la sección anterior.
- [x] El detalle separa una cuadrícula de contenidos puramente informativa de un historial global para toda la franquicia.
- [x] La portada puede recolocarse dentro de su marco y conserva la posición elegida tras reiniciar.
- [x] El formulario solicita únicamente el estreno como fecha manual del contenido.
- [x] La puntuación es un control visual principal, no un campo ordinario ni un selector con botón de confirmación.
- [x] La biblioteca separa franquicias y películas anime independientes y muestra `#n` sobre la portada de cada franquicia.
- [x] Las tarjetas de contenido priorizan visualmente puntuación, estado, tipo, canonicidad y fechas, en ese orden.
- [x] El Top permite mostrar 5, 10 o 25 franquicias y excluye películas independientes.
- [x] Archivo aparece antes de Añadir título y Favorito usa una estrella en la cabecera.
- [x] El progreso agregado distingue la suma conocida de la parte desconocida mediante `+ ?`.
- [x] Las portadas GIF pegadas conservan su animación y solo se reproducen al pasar el cursor sobre la tarjeta; las demás imágenes pegadas se convierten a JPEG.
- [x] La minivista de películas independientes se denomina `Películas`, el estado aparece fuera de la portada y la ordenación seleccionada se conserva.
- [x] La puntuación rápida se guarda sin exigir un clic fuera del control.
- [x] Los géneros se eligen mediante opciones visuales y se muestran como etiquetas, sin escribir listas separadas por comas.
- [x] Una única selección `Contenidos / Historial` alterna entre la colección ordenada y la actividad global de la franquicia.
- [x] Las portadas GIF indican su formato mientras están detenidas y reproducen la animación únicamente al interactuar con la tarjeta.
- [x] El editor presenta la imagen completa junto al encuadre final y permite ajustar punto focal y zoom.
- [x] Las estadísticas pueden incluir toda la colección o limitarse a Anime o Películas.
- [x] Las películas independientes omiten el progreso redundante `1 de 1` y muestran un resumen de puntuación, visionados y estado.
- [x] Cambiar de minivista oculta la colección anterior antes de aplicar el nuevo orden.
- [x] Las tarjetas separan puntuación, información, estado/progreso y acciones, reduciendo píldoras y ruido permanente.
- [x] El formulario de contenido recupera una cuadrícula compacta, agrupa campos y evita fechas de seguimiento redundantes con el historial.
- [x] Un contenido omitido puede volver a incluirse desde la misma acción rápida.
- [x] Estado, puntuación y progreso mantienen una jerarquía alineada y sin superficies anidadas.
- [x] Registrar visionado permite elegir contenido, fecha y número de episodios, mostrando de antemano el rango que se añadirá.
- [x] Los seis estados pueden elegirse con un clic y muestran nombre accesible mediante ayuda contextual.
- [x] Un contenido Terminado con progreso incompleto admite `+1` y registra el episodio en el historial.
- [x] Favorito puede alternarse desde Biblioteca sin abrir el detalle.
- [x] Los estados activos se distinguen en los seis casos y todos muestran ayuda contextual al pasar el ratón.
- [x] Anime y contenido reutilizan el mismo selector segmentado controlado.
- [x] `+1` aparece inmediatamente a la derecha de la fecha.
- [x] La tarjeta separa título, clasificación y estreno y no muestra fechas de inicio o fin.
- [x] El historial puede abrirse completo o filtrado por contenido y comunica la primera actividad registrada.
- [x] El detalle presenta un historial resumido por fecha y contenido y conserva el acceso a la vista completa ya filtrada por anime.
- [x] El filtro de contenido permanece vacío o inactivo hasta elegir un anime y nunca muestra contenidos de otra franquicia.
- [x] Los contenidos se presentan en dos tarjetas por fila, conservan su orden y pasan a una columna cuando falta anchura.
- [x] Las tarjetas pueden seguir reordenándose mediante arrastre dentro de la nueva cuadrícula.
- [x] Editar usa el mismo formato de icono que las demás acciones de la cabecera.
- [x] Tu puntuación y Media comparten tamaño y alineación; el estado textual aparece junto a Progreso y Contenidos sin selector de iconos.
- [x] Las tarjetas no conservan una fila inferior vacía cuando sus acciones secundarias están ocultas.
- [x] Los metadatos superiores aprovechan el ancho de la tarjeta y se reorganizan sin solaparse cuando alguno falta.
- [x] La puntuación utiliza una celda SeriesGraph con texto blanco y color derivado de la nota.
- [x] Historial permite avanzar `+1 episodio` sobre el siguiente contenido disponible y registrar varios episodios, sin mostrar `Añadir contenido` ni duplicar el acceso a la vista completa.
- [x] Al completar todos los episodios conocidos de un contenido, se propone marcarlo como Terminado y se permite conservar su estado actual; si es el último contenido pendiente, un checkbox permite decidir si la misma confirmación termina también el anime.
- [x] Una fecha de visionado nueva o editada nunca puede ser anterior al estreno conocido de su contenido.

### Por retomar — aprobado el 2026-09-03

- Estado manual exclusivo de títulos Anime: ya estabas al día y tienes nuevo contenido disponible que todavía no has empezado. No sustituye En pausa ni se aplica a contenidos o películas independientes.
- Figura en edición, tarjetas, filtros y estadísticas, con ayuda explicativa.
- Al pasar contenido no omitido de Por salir a Pendiente, si el anime estaba Esperando contenido y no hay otro contenido a medias, se propone Por retomar. Mantener no altera su estado; aceptar solo cambia el estado del anime.
- Las fechas no activan disponibilidad automáticamente. Historial, puntuaciones y episodios se conservan.
