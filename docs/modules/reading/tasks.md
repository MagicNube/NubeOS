# Tareas — Lectura

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-09
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## T-R01 — Auditar el modelo de Notion

- Estado: Implementada y aprobada por Nube.
- Alcance: revisar columnas, estados, géneros, fechas y valoraciones sin importar datos.
- Resultado: 27 filas sin títulos duplicados; cinco estados, doce géneros y valoraciones históricas de dos a cinco estrellas. Prioridad y URLs quedan excluidas.

## T-R02 — Unificar el filtro de favoritos

- Estado: Implementada y aprobada por Nube.
- Alcance: crear un botón compartido compacto con estrella vacía/rellena y sustituir las variantes de Documentos y Media.
- Verificación: navegación por teclado, tooltip, `aria-pressed` y comparación visual.

## T-R03 — Crear dominio y migración

- Estado: Implementada y aprobada por Nube.
- Alcance: entidad, estados, validaciones y tabla SQLite vacía.
- Verificación: pruebas unitarias y de repositorio.

## T-R04 — Implementar casos de uso y comandos Tauri

- Estado: Implementada y aprobada por Nube.
- Alcance: listar, crear, editar, favorito, archivar, restaurar, borrar y estadísticas.
- Verificación: pruebas de persistencia y contratos registrados.

## T-R05 — Crear contratos TypeScript

- Estado: Implementada y aprobada por Nube.
- Alcance: DTOs, API y presentación de estados, fechas y puntuaciones.
- Verificación: comprobación TypeScript.

## T-R06 — Crear Biblioteca y En lectura

- Estado: Implementada y aprobada por Nube.
- Alcance: navegación, filtros combinables, ordenación, tarjetas, estados vacíos y Archivo.
- Verificación: build y recorrido manual.

## T-R07 — Crear formulario, detalle y estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: modales coherentes, aviso de borrador, edición completa y resumen agregado.
- Verificación: build y recorrido manual.

## T-R08 — Revisar el módulo

- Estado: Revisión técnica completada; comprobación manual pendiente
- Alcance: duplicación, naming, accesibilidad, pruebas Rust, Clippy, formato, build y diff.
- Verificación: registrar el resultado técnico y dejar explícita la comprobación visual pendiente.

**Resultado:** biblioteca local vacía, dominio y migraciones independientes, once comandos Tauri, tres vistas, filtros, formularios, portadas privadas, Archivo, estadísticas y componentes compartidos de favorito, puntuación y acciones de Archivo. Build TypeScript/Vite, 102 pruebas Rust, Clippy estricto y formato correctos. Queda pendiente probar la interacción y ajustar la interfaz con datos reales.

## T-R09 — Refinar navegación y géneros

- Estado: Implementada y aprobada por Nube.
- Alcance: Biblioteca inicial, pestaña Leyendo con iconos y medidas comunes, favoritos solo en Biblioteca y diez géneros seleccionables.
- Verificación: build y recorrido manual.

## T-R10 — Añadir portadas locales

- Estado: Implementada y aprobada por Nube.
- Alcance: migración de metadatos, almacenamiento privado JPEG/PNG/WebP, selección provisional, sustitución, retirada y lectura.
- Verificación: pruebas Rust, build y recorrido manual.

## T-R11 — Unificar acciones de Archivo

- Estado: Implementada y aprobada por Nube.
- Alcance: componente compartido con restaurar y papelera, iconográfico y visible por hover/foco en las colecciones archivadas.
- Verificación: build y revisión visual transversal.

## T-R12 — Simplificar los estados de Lectura

- Estado: Implementada y aprobada por Nube.
- Alcance: retirar Por investigar de dominio, contratos e interfaz y migrar posibles registros existentes a Pendiente.
- Verificación: prueba de migración, pruebas Rust y build TypeScript.

## T-R13 — Reordenar el formulario de libros

- Estado: Implementada y aprobada por Nube.
- Alcance: mover la gestión de portada después de Opinión y acercar la secuencia del formulario al patrón de Anime.
- Verificación: build TypeScript y recorrido visual de creación y edición.

**Resultado:** los datos bibliográficos y de seguimiento se completan antes de la opinión y la portada queda como último bloque opcional.

## T-R14 — Dar protagonismo a la portada en Biblioteca

- Estado: Implementada y aprobada por Nube.
- Alcance: sustituir la cabecera horizontal recortada por una portada vertical completa y redistribuir la información en el espacio lateral.
- Criterios: todas las cubiertas ocupan un marco `2:3`, conservan su proporción sin bandas vacías, las cuatro esquinas quedan redondeadas y el marco recuerda a un libro.
- Verificación: build TypeScript y recorrido visual con portada, sin portada, fechas parciales y puntuación vacía.

**Resultado:** las tarjetas adoptan una composición lateral más compacta; `object-fit: cover` llena el marco común sin deformar la portada y un lomo con sombra corta refuerza la apariencia de libro.

## T-R15 — Modelar lecturas y relecturas

- Estado: Implementada y aprobada por Nube.
- Alcance: entidad `ReadingRun`, invariantes y migración de fechas existentes.
- Verificación: pruebas de migración, periodo abierto único y rangos válidos.

## T-R16 — Implementar persistencia y casos de uso de relectura

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-R15
- Alcance: iniciar, finalizar, registrar, corregir, listar y retirar periodos.
- Verificación: pruebas transaccionales y sincronización del estado del libro.

## T-R17 — Exponer comandos e historial en React

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-R16
- Alcance: DTOs, comandos Tauri, API TypeScript, pestaña Historial y filtros.
- Verificación: build y recorrido con una lectura inicial y dos relecturas.

## T-R18 — Integrar relecturas en detalle y estadísticas

- Estado: Implementada y aprobada por Nube.
- Dependencias: T-R17
- Alcance: acciones rápidas, resumen de lectura actual/última y total de relecturas.
- Verificación: estados Pendiente, Leyendo, En pausa y Terminado.

## T-R19 — Revisar y cerrar la ampliación

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-R15 a T-R18
- Verificación: pruebas Rust, Clippy, formato, build, diff y uso manual.

## T-R20 — Pegar y normalizar portadas

- Estado: Implementada y aprobada por Nube.
- Alcance: aceptar imágenes del portapapeles en el formulario, convertirlas a JPEG y reutilizar el almacén provisional privado.
- Verificación: build, límites de 8 MB y prueba manual con PNG/WebP copiado.

## T-R21 — Unificar el detalle del tracker

- Estado: Implementada y aprobada por Nube.
- Alcance: dividir el detalle en Resumen e Historial y aplicar la misma jerarquía de métricas que Videojuegos y Películas.
- Verificación: build y prueba manual con libro pendiente, lectura abierta y varias relecturas.

## T-R22 — Refinar detalle y estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: normalizar la portada vertical del detalle y filtrar estadísticas por género y puntuación mínima desde casos de uso Rust.
- Verificación: pruebas Rust, build y prueba manual con filtros combinados.

## T-R23 — Ajustar encuadre y zoom de portada

- Estado: Implementada y aprobada por Nube.
- Alcance: persistir posición X/Y y zoom, reutilizar el editor compartido y mostrar la acción Ajustar únicamente al hover, foco o en dispositivos sin hover.
- Verificación: pruebas de dominio y repositorio, build y recorrido manual con portada vertical.

## T-R24 — Corregir el formulario de lecturas y relecturas

- Estado: Implementada y aprobada por Nube.
- Alcance: aplicar al formulario de fechas los mismos campos oscuros, espaciados, estados de foco y adaptación responsive que al resto de Lectura.
- Restricciones: no modificar el historial, las fechas almacenadas ni los casos de uso de lectura.
- Verificación: abrir Registrar lectura y Editar lectura en ventanas anchas y estrechas, y ejecutar el build TypeScript/Vite.

## T-R25 — Refrescar y retirar portadas de forma coherente

- Estado: Implementada y aprobada por Nube.
- Alcance: mostrar el nombre de una portada recién elegida, retirarla mediante papelera y refrescar Biblioteca y detalle tras sustituirla.
- Verificación: elegir, pegar, reemplazar y eliminar la portada de un libro ya existente sin reiniciar la aplicación.

## T-R26 — Consolidar formularios, ordenación e historial

- Estado: Implementada y aprobada por Nube.
- Alcance: incorporar favorito al formulario, conservar la ordenación por título, puntuación y fechas, simplificar la cabecera del historial y exigir fecha inicial en todas las lecturas.
- Restricciones: una relectura no puede comenzar antes de la primera lectura; la fecha final permanece opcional.
- Verificación: crear, editar y ordenar libros; registrar lecturas válidas e intentar guardar una relectura cronológicamente inválida.

## T-R27 — Corregir contraste de fechas y retirada de portada

- Estado: Implementada y aprobada por Nube.
- Alcance: mantener blancos los segmentos de los selectores de fecha durante su edición y centrar la acción iconográfica de papelera en el formulario de portada.
- Verificación: escribir y corregir días, meses y años; editar un libro con portada y revisar la alineación de la papelera.

## T-R28 — Conservar los años disponibles al filtrar el historial

- Estado: Implementada y aprobada por Nube.
- Alcance: obtener los años a partir del historial completo del libro seleccionado, independientemente del año actualmente filtrado.
- Verificación: alternar entre varios años sin que desaparezcan las demás opciones y comprobar el filtro combinado por libro.

## T-R29 — Recordar autores y confirmar estados derivados

- Estado: Implementada y aprobada por Nube.
- Alcance: sugerir autores ya utilizados al escribir y pedir confirmación cuando una nueva lectura implique cambiar el estado del libro.
- Restricciones: conservar siempre el nuevo registro; rechazar la sugerencia mantiene el estado elegido por el usuario sin perder las fechas derivadas del historial.
- Verificación: crear dos libros del mismo autor, iniciar un libro Terminado y registrar una lectura histórica manteniendo su estado.

**Resultado:** el formulario reutiliza autores persistidos y el historial nunca altera silenciosamente el estado del libro.

Las etiquetas de género de tarjeta y detalle adoptan la misma geometría y tipografía de 11 px que Anime para mantener legibilidad entre ambos módulos.

## T-R30 — Aplicar la confirmación a todo el ciclo del historial

- Estado: Implementada y aprobada por Nube.
- Alcance: confirmar los estados derivados al crear, editar, empezar, terminar o eliminar una lectura y ordenar las acciones de la cabecera por frecuencia de uso.
- Restricciones: rechazar la sugerencia conserva las fechas registradas; `Registrar lectura` es la acción principal situada a la derecha.
- Verificación: probar los cinco tipos de mutación sobre libros Pendiente, Leyendo y Terminado.

**Resultado:** el aviso de estado ya no se limita al alta de una relectura y las acciones rápidas comparten jerarquía con Videojuegos.

## T-R31 — Separar periodo cerrado de libro terminado

- Estado: Implementada y aprobada por Nube.
- Alcance: persistir si cada lectura terminó realmente el libro, además de sus fechas, y mostrar `Sin terminar` en los periodos cerrados incompletos.
- Restricciones: `Terminar hoy` completa el libro; cerrar manualmente una lectura sin terminar sugiere En pausa y conserva la confirmación de estado.
- Verificación: migrar lecturas existentes, registrar una lectura cerrada completa e incompleta y comprobar historial y estado sugerido.

**Resultado:** una fecha final puede representar que dejaste de leer sin afirmar que terminaste el libro.

## T-R32 — Completar detalle y estadísticas

- Estado: Implementada y aprobada por Nube.
- Alcance: añadir favorito al detalle, alinear las tres métricas compartidas y ampliar Estadísticas con libros puntuados y un Top 5/10/15/25 persistente.
- Verificación: alternar favorito dentro del libro, revisar métricas con y sin nota y cambiar la longitud del ranking.

**Resultado:** el detalle ya no obliga a volver a Biblioteca para gestionar favoritos y las estadísticas permiten consultar una clasificación personal configurable.

## T-R33 — Ampliar géneros y enlazar libros sin puntuar

- Estado: Implementada y aprobada por Nube.
- Alcance: ampliar la lista cerrada a veinticinco géneros y convertir el recuento de obras sin puntuar en un acceso a Biblioteca con el filtro aplicado.
- Verificación: clasificar ficción contemporánea y filosofía, guardar y editar el libro, y abrir `Fuera del ranking` desde Estadísticas.

**Resultado:** la taxonomía cubre mejor títulos híbridos y el dato estadístico permite actuar sobre la colección.

## T-R34 — Representar periodos de lectura en el calendario

- Estado: Implementada y aprobada por Nube.
- Alcance: añadir los modos `Actividad`, `Periodos` y `Ambas`, conservando el primero como valor inicial.
- Restricciones: los días entre inicio y fin se describen como periodo estimado, no como actividad diaria confirmada; las lecturas abiertas terminan visualmente en el día actual.
- Verificación: revisar lecturas cerradas, abiertas, relecturas y periodos que cruzan de año, además del detalle al pasar el cursor.

**Resultado:** el calendario puede mostrar continuidad sin inventar días concretos de lectura.

## T-R35 — Completar géneros y normalizar controles Media

- Estado: Implementada y aprobada por Nube.
- Alcance: asignar géneros a los libros existentes sin clasificación, corregir clasificaciones heredadas evidentes, aceptar años de dos cifras en las fechas de historial y adoptar la barra común de búsqueda y filtros.
- Restricciones: no importar libros nuevos ni modificar lecturas, estados o puntuaciones.
- Verificación: ejecutar la migración sobre datos existentes, introducir `26` y `19` como años y revisar búsqueda, filtros y ordenación sin textos recortados.

**Resultado:** la colección existente recibe géneros reproducibles, las fechas aceptan `dd/mm/aa` y los controles se adaptan al ancho disponible sin ocultar su texto.

## T-R36 — Reforzar integridad temporal

- Estado: Implementada y aprobada por Nube.
- Alcance: rechazar también en Rust cualquier fecha futura recibida al crear o editar una lectura.
- Verificación: enviar fechas pasada y futura directamente al comando, sin depender de la validación del formulario.

**Resultado:** el historial conserva su contrato aunque el dato no proceda de la interfaz actual.

## T-R37 — Pilotar la navegación contextual

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: compactar la barra lateral, mostrar una ruta fija `NubeOS › Entretenimiento › Lectura`, nombrar cada pantalla por su vista actual y situar sus pestañas bajo el título. El patrón aprobado se extiende a Anime, Videojuegos, Películas y Series.
- Coherencia: los cinco módulos de entretenimiento abren su colección con el título `Biblioteca`; la ruta superior identifica el módulo y evita repetirlo dentro de la página.
- Accesibilidad: un único `h1`, estados activos semánticos, foco visible, salto al contenido y respeto por movimiento reducido.
- Restricciones: se unifican la carcasa y la navegación; las tarjetas y vistas de datos conservan su composición específica.
- Verificación: comprobación TypeScript y revisión de whitespace superadas; falta la aprobación visual en ejecución y no se genera una build instalable en esta tarea.

**Resultado:** la jerarquía pilotada en Lectura pasa a ser el patrón común de los cinco módulos de entretenimiento.

## T-R38 — Reducir duplicidad visual y filtros visibles

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: cabecera reducida a Lectura, ruta dinámica con Biblioteca/Leyendo/Historial/Estadísticas y filtros secundarios plegables con contador.
- Verificación: TypeScript correcto; Biblioteca, Leyendo, foco del buscador y despliegue de filtros revisados visualmente. Sin build instalable.

## T-R39 — Limpiar cabecera y contador de filtros

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: usar un título plano, colocar Archivo y Añadir libro junto a las vistas y excluir la ordenación del contador de filtros.
- Verificación: TypeScript correcto y comprobación visual de la cabecera compartida; sin build instalable.

## T-R40 — Ampliar filtros y unificar acciones de historial

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: añadir autor, género, puntuación, años y número de lecturas mediante un constructor progresivo con ordenación separada; usar título alfabético como valor neutro, señalar en morado cualquier alternativa y mostrar editar y eliminar al pasar el cursor o enfocar la fila.

## T-R41 — Permitir varios estados y ordenar con estabilidad

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: convertir Estado en una condición multiselección, colocar Título primero como orden neutro y resolver alfabéticamente los empates de autor, puntuación, fechas y actualización.
- Verificación: combinar estados y comprobar órdenes con valores repetidos. Build TypeScript/Vite correcta; sin build instalable.

## T-R42 — Guardar una ordenación predeterminada explícita

- Estado: Implementada; revisión visual pendiente de Nube.
- Alcance: separar el orden temporal del predeterminado, mantener Título A–Z como inicio neutro y ofrecer Guardar como predeterminado dentro del panel de ordenación compartido.
- Verificación: elegir, guardar y sustituir una preferencia; TypeScript/Vite correcto.

## T-R43 — Corregir cierres y confirmaciones accesibles

- Estado: Implementada el 2026-09-08.
- Alcance: nombrar el cierre del formulario de lecturas y usar el diálogo compartido para descartes y eliminaciones.
- Restricciones: no modificar periodos, estados derivados ni persistencia.
- Verificación: build, pruebas de interfaz y recorrido por teclado de formularios e historial.

**Resultado:** el cierre del formulario tiene nombre accesible y descartes, eliminaciones e historial comparten el mismo diálogo con foco seguro.

## T-R44 — Delimitar las tarjetas de Historial

- Estado: Implementada el 2026-09-09 por petición directa de Nube.
- Alcance: aplicar el contorno estructural compartido a las lecturas del detalle y de la vista Historial.
- Restricciones: conservar contenido, acciones en hover o foco y geometría existente; el borde permanece neutro.
- Verificación: revisar reposo, hover, foco y adaptación estrecha; ejecutar pruebas de interfaz y build TypeScript/Vite.

**Resultado:** cada periodo de lectura se percibe como una tarjeta independiente y coherente con el resto de Media.

## T-R45 — Corregir la atomicidad del historial (R-01)

- Estado: Implementada por petición directa de Nube el 2026-09-09; comprobaciones técnicas superadas.
- Alcance: guardar alta, edición o eliminación y sincronización del libro en una transacción.
- Verificación: fallos inducidos entre escrituras no conservan cambios parciales; pruebas Rust y Clippy.


**Resultado T-R45:** implementada. Alta, edición y borrado del historial son atómicos; el fallo inducido de sincronización revierte registros y conserva el libro. Pasan 157 pruebas Rust y Clippy estricto.
