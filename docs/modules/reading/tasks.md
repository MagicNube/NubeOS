# Tareas — Lectura

- Estado: T-R01 a T-R30 implementadas; comprobación manual pendiente
- Última actualización: 2026-08-30

## T-R01 — Auditar el modelo de Notion

- Estado: Implementada
- Alcance: revisar columnas, estados, géneros, fechas y valoraciones sin importar datos.
- Resultado: 27 filas sin títulos duplicados; cinco estados, doce géneros y valoraciones históricas de dos a cinco estrellas. Prioridad y URLs quedan excluidas.

## T-R02 — Unificar el filtro de favoritos

- Estado: Implementada; comprobación visual pendiente
- Alcance: crear un botón compartido compacto con estrella vacía/rellena y sustituir las variantes de Documentos y Media.
- Verificación: navegación por teclado, tooltip, `aria-pressed` y comparación visual.

## T-R03 — Crear dominio y migración

- Estado: Implementada
- Alcance: entidad, estados, validaciones y tabla SQLite vacía.
- Verificación: pruebas unitarias y de repositorio.

## T-R04 — Implementar casos de uso y comandos Tauri

- Estado: Implementada
- Alcance: listar, crear, editar, favorito, archivar, restaurar, borrar y estadísticas.
- Verificación: pruebas de persistencia y contratos registrados.

## T-R05 — Crear contratos TypeScript

- Estado: Implementada
- Alcance: DTOs, API y presentación de estados, fechas y puntuaciones.
- Verificación: comprobación TypeScript.

## T-R06 — Crear Biblioteca y En lectura

- Estado: Implementada; comprobación visual pendiente
- Alcance: navegación, filtros combinables, ordenación, tarjetas, estados vacíos y Archivo.
- Verificación: build y recorrido manual.

## T-R07 — Crear formulario, detalle y estadísticas

- Estado: Implementada; comprobación visual pendiente
- Alcance: modales coherentes, aviso de borrador, edición completa y resumen agregado.
- Verificación: build y recorrido manual.

## T-R08 — Revisar el módulo

- Estado: Revisión técnica completada; comprobación manual pendiente
- Alcance: duplicación, naming, accesibilidad, pruebas Rust, Clippy, formato, build y diff.
- Verificación: registrar el resultado técnico y dejar explícita la comprobación visual pendiente.

**Resultado:** biblioteca local vacía, dominio y migraciones independientes, once comandos Tauri, tres vistas, filtros, formularios, portadas privadas, Archivo, estadísticas y componentes compartidos de favorito, puntuación y acciones de Archivo. Build TypeScript/Vite, 102 pruebas Rust, Clippy estricto y formato correctos. Queda pendiente probar la interacción y ajustar la interfaz con datos reales.

## T-R09 — Refinar navegación y géneros

- Estado: Implementada; comprobación visual pendiente
- Alcance: Biblioteca inicial, pestaña Leyendo con iconos y medidas comunes, favoritos solo en Biblioteca y diez géneros seleccionables.
- Verificación: build y recorrido manual.

## T-R10 — Añadir portadas locales

- Estado: Implementada; comprobación visual pendiente
- Alcance: migración de metadatos, almacenamiento privado JPEG/PNG/WebP, selección provisional, sustitución, retirada y lectura.
- Verificación: pruebas Rust, build y recorrido manual.

## T-R11 — Unificar acciones de Archivo

- Estado: Implementada; comprobación visual pendiente
- Alcance: componente compartido con restaurar y papelera, iconográfico y visible por hover/foco en las colecciones archivadas.
- Verificación: build y revisión visual transversal.

## T-R12 — Simplificar los estados de Lectura

- Estado: Implementada; comprobación manual pendiente
- Alcance: retirar Por investigar de dominio, contratos e interfaz y migrar posibles registros existentes a Pendiente.
- Verificación: prueba de migración, pruebas Rust y build TypeScript.

## T-R13 — Reordenar el formulario de libros

- Estado: Implementada; comprobación visual pendiente
- Alcance: mover la gestión de portada después de Opinión y acercar la secuencia del formulario al patrón de Anime.
- Verificación: build TypeScript y recorrido visual de creación y edición.

**Resultado:** los datos bibliográficos y de seguimiento se completan antes de la opinión y la portada queda como último bloque opcional.

## T-R14 — Dar protagonismo a la portada en Biblioteca

- Estado: Implementada; comprobación visual pendiente
- Alcance: sustituir la cabecera horizontal recortada por una portada vertical completa y redistribuir la información en el espacio lateral.
- Criterios: todas las cubiertas ocupan un marco `2:3`, conservan su proporción sin bandas vacías, las cuatro esquinas quedan redondeadas y el marco recuerda a un libro.
- Verificación: build TypeScript y recorrido visual con portada, sin portada, fechas parciales y puntuación vacía.

**Resultado:** las tarjetas adoptan una composición lateral más compacta; `object-fit: cover` llena el marco común sin deformar la portada y un lomo con sombra corta refuerza la apariencia de libro.

## T-R15 — Modelar lecturas y relecturas

- Estado: Implementada; comprobación manual pendiente
- Alcance: entidad `ReadingRun`, invariantes y migración de fechas existentes.
- Verificación: pruebas de migración, periodo abierto único y rangos válidos.

## T-R16 — Implementar persistencia y casos de uso de relectura

- Estado: Implementada; comprobación manual pendiente
- Dependencias: T-R15
- Alcance: iniciar, finalizar, registrar, corregir, listar y retirar periodos.
- Verificación: pruebas transaccionales y sincronización del estado del libro.

## T-R17 — Exponer comandos e historial en React

- Estado: Implementada; comprobación manual pendiente
- Dependencias: T-R16
- Alcance: DTOs, comandos Tauri, API TypeScript, pestaña Historial y filtros.
- Verificación: build y recorrido con una lectura inicial y dos relecturas.

## T-R18 — Integrar relecturas en detalle y estadísticas

- Estado: Implementada; comprobación manual pendiente
- Dependencias: T-R17
- Alcance: acciones rápidas, resumen de lectura actual/última y total de relecturas.
- Verificación: estados Pendiente, Leyendo, En pausa y Terminado.

## T-R19 — Revisar y cerrar la ampliación

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-R15 a T-R18
- Verificación: pruebas Rust, Clippy, formato, build, diff y uso manual.

## T-R20 — Pegar y normalizar portadas

- Estado: Implementada; comprobación manual pendiente
- Alcance: aceptar imágenes del portapapeles en el formulario, convertirlas a JPEG y reutilizar el almacén provisional privado.
- Verificación: build, límites de 8 MB y prueba manual con PNG/WebP copiado.

## T-R21 — Unificar el detalle del tracker

- Estado: Implementada; comprobación visual pendiente
- Alcance: dividir el detalle en Resumen e Historial y aplicar la misma jerarquía de métricas que Videojuegos y Películas.
- Verificación: build y prueba manual con libro pendiente, lectura abierta y varias relecturas.

## T-R22 — Refinar detalle y estadísticas

- Estado: Implementada; comprobación visual pendiente
- Alcance: normalizar la portada vertical del detalle y filtrar estadísticas por género y puntuación mínima desde casos de uso Rust.
- Verificación: pruebas Rust, build y prueba manual con filtros combinados.

## T-R23 — Ajustar encuadre y zoom de portada

- Estado: Implementada; comprobación visual pendiente
- Alcance: persistir posición X/Y y zoom, reutilizar el editor compartido y mostrar la acción Ajustar únicamente al hover, foco o en dispositivos sin hover.
- Verificación: pruebas de dominio y repositorio, build y recorrido manual con portada vertical.

## T-R24 — Corregir el formulario de lecturas y relecturas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: aplicar al formulario de fechas los mismos campos oscuros, espaciados, estados de foco y adaptación responsive que al resto de Lectura.
- Restricciones: no modificar el historial, las fechas almacenadas ni los casos de uso de lectura.
- Verificación: abrir Registrar lectura y Editar lectura en ventanas anchas y estrechas, y ejecutar el build TypeScript/Vite.

## T-R25 — Refrescar y retirar portadas de forma coherente

- Estado: Implementada; comprobación visual pendiente.
- Alcance: mostrar el nombre de una portada recién elegida, retirarla mediante papelera y refrescar Biblioteca y detalle tras sustituirla.
- Verificación: elegir, pegar, reemplazar y eliminar la portada de un libro ya existente sin reiniciar la aplicación.

## T-R26 — Consolidar formularios, ordenación e historial

- Estado: Implementada; comprobación visual pendiente.
- Alcance: incorporar favorito al formulario, conservar la ordenación por título, puntuación y fechas, simplificar la cabecera del historial y exigir fecha inicial en todas las lecturas.
- Restricciones: una relectura no puede comenzar antes de la primera lectura; la fecha final permanece opcional.
- Verificación: crear, editar y ordenar libros; registrar lecturas válidas e intentar guardar una relectura cronológicamente inválida.

## T-R27 — Corregir contraste de fechas y retirada de portada

- Estado: Implementada; comprobación visual pendiente.
- Alcance: mantener blancos los segmentos de los selectores de fecha durante su edición y centrar la acción iconográfica de papelera en el formulario de portada.
- Verificación: escribir y corregir días, meses y años; editar un libro con portada y revisar la alineación de la papelera.

## T-R28 — Conservar los años disponibles al filtrar el historial

- Estado: Implementada; comprobación visual pendiente.
- Alcance: obtener los años a partir del historial completo del libro seleccionado, independientemente del año actualmente filtrado.
- Verificación: alternar entre varios años sin que desaparezcan las demás opciones y comprobar el filtro combinado por libro.

## T-R29 — Recordar autores y confirmar estados derivados

- Estado: Implementada; comprobación visual pendiente.
- Alcance: sugerir autores ya utilizados al escribir y pedir confirmación cuando una nueva lectura implique cambiar el estado del libro.
- Restricciones: conservar siempre el nuevo registro; rechazar la sugerencia mantiene el estado elegido por el usuario sin perder las fechas derivadas del historial.
- Verificación: crear dos libros del mismo autor, iniciar un libro Terminado y registrar una lectura histórica manteniendo su estado.

**Resultado:** el formulario reutiliza autores persistidos y el historial nunca altera silenciosamente el estado del libro.

Las etiquetas de género de tarjeta y detalle adoptan la misma geometría y tipografía de 11 px que Anime para mantener legibilidad entre ambos módulos.

## T-R30 — Aplicar la confirmación a todo el ciclo del historial

- Estado: Implementada; comprobación visual pendiente.
- Alcance: confirmar los estados derivados al crear, editar, empezar, terminar o eliminar una lectura y ordenar las acciones de la cabecera por frecuencia de uso.
- Restricciones: rechazar la sugerencia conserva las fechas registradas; `Registrar lectura` es la acción principal situada a la derecha.
- Verificación: probar los cinco tipos de mutación sobre libros Pendiente, Leyendo y Terminado.

**Resultado:** el aviso de estado ya no se limita al alta de una relectura y las acciones rápidas comparten jerarquía con Videojuegos.

## T-R31 — Separar periodo cerrado de libro terminado

- Estado: Implementada; comprobación visual pendiente.
- Alcance: persistir si cada lectura terminó realmente el libro, además de sus fechas, y mostrar `Sin terminar` en los periodos cerrados incompletos.
- Restricciones: `Terminar hoy` completa el libro; cerrar manualmente una lectura sin terminar sugiere En pausa y conserva la confirmación de estado.
- Verificación: migrar lecturas existentes, registrar una lectura cerrada completa e incompleta y comprobar historial y estado sugerido.

**Resultado:** una fecha final puede representar que dejaste de leer sin afirmar que terminaste el libro.

## T-R32 — Completar detalle y estadísticas

- Estado: Implementada; comprobación visual pendiente.
- Alcance: añadir favorito al detalle, alinear las tres métricas compartidas y ampliar Estadísticas con libros puntuados y un Top 5/10/15/25 persistente.
- Verificación: alternar favorito dentro del libro, revisar métricas con y sin nota y cambiar la longitud del ranking.

**Resultado:** el detalle ya no obliga a volver a Biblioteca para gestionar favoritos y las estadísticas permiten consultar una clasificación personal configurable.

## T-R33 — Ampliar géneros y enlazar libros sin puntuar

- Estado: Implementada; comprobación visual pendiente.
- Alcance: ampliar la lista cerrada a veinticinco géneros y convertir el recuento de obras sin puntuar en un acceso a Biblioteca con el filtro aplicado.
- Verificación: clasificar ficción contemporánea y filosofía, guardar y editar el libro, y abrir `Fuera del ranking` desde Estadísticas.

**Resultado:** la taxonomía cubre mejor títulos híbridos y el dato estadístico permite actuar sobre la colección.

## T-R34 — Representar periodos de lectura en el calendario

- Estado: Implementada; comprobación visual pendiente.
- Alcance: añadir los modos `Actividad`, `Periodos` y `Ambas`, conservando el primero como valor inicial.
- Restricciones: los días entre inicio y fin se describen como periodo estimado, no como actividad diaria confirmada; las lecturas abiertas terminan visualmente en el día actual.
- Verificación: revisar lecturas cerradas, abiertas, relecturas y periodos que cruzan de año, además del detalle al pasar el cursor.

**Resultado:** el calendario puede mostrar continuidad sin inventar días concretos de lectura.

## T-R35 — Completar géneros y normalizar controles Media

- Estado: Implementada; comprobación visual pendiente.
- Alcance: asignar géneros a los libros existentes sin clasificación, corregir clasificaciones heredadas evidentes, aceptar años de dos cifras en las fechas de historial y adoptar la barra común de búsqueda y filtros.
- Restricciones: no importar libros nuevos ni modificar lecturas, estados o puntuaciones.
- Verificación: ejecutar la migración sobre datos existentes, introducir `26` y `19` como años y revisar búsqueda, filtros y ordenación sin textos recortados.

**Resultado:** la colección existente recibe géneros reproducibles, las fechas aceptan `dd/mm/aa` y los controles se adaptan al ancho disponible sin ocultar su texto.

## T-R36 — Reforzar integridad temporal

- Estado: Implementada; comprobación visual pendiente.
- Alcance: rechazar también en Rust cualquier fecha futura recibida al crear o editar una lectura.
- Verificación: enviar fechas pasada y futura directamente al comando, sin depender de la validación del formulario.

**Resultado:** el historial conserva su contrato aunque el dato no proceda de la interfaz actual.
