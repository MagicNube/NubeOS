# Diseño — Lectura

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-05
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## Modelo

```text
Book
├── id: BookId
├── title: String
├── author: String
├── genres: Vec<String>
├── status: ReadingStatus
├── score: Option<f64>
├── opinion: Option<String>
├── favorite: bool
├── cover: Option<ManagedReadingCover>
├── cover_position_x: f64
├── cover_position_y: f64
├── cover_zoom: f64
└── archived: bool

ReadingRun
├── id: ReadingRunId
├── book_id: BookId
├── started_on: Option<NaiveDate>
├── finished_on: Option<NaiveDate>
└── created_at: DateTime
```

`ReadingStatus` contiene `pending`, `reading`, `paused`, `completed` y `abandoned`. `ReadingRun` representa una lectura completa o en curso. Solo puede existir un periodo abierto por libro.

## Responsabilidades

- Rust valida entidad, fechas, puntuación, géneros y ciclo de vida.
- `ReadingRepository` persiste y consulta exclusivamente la tabla `reading_books`.
- Los comandos Tauri adaptan DTOs y delegan en el dominio y repositorio.
- React mantiene navegación, filtros, orden, modales y borradores de formulario.
- Los CSV no participan en tiempo de ejecución ni se copian al repositorio.

## Persistencia

La ampliación crea `reading_runs` y migra `started_on`/`finished_on` a un primer periodo cuando alguno existe. Las columnas históricas de `reading_books` se conservan por compatibilidad y se sincronizan como proyección; `reading_runs` es la autoridad. Los bytes de portada continúan en `reading/covers` y el módulo no comparte tablas con Media ni Videojuegos.

## Contratos Tauri

- `list_reading_books(input) -> Vec<BookDto>`
- `create_reading_book(input) -> BookDto`
- `update_reading_book(book_id, input) -> BookDto`
- `set_reading_book_favorite(book_id, favorite) -> BookDto`
- `archive_reading_book(book_id) -> ()`
- `restore_reading_book(book_id) -> ()`
- `delete_reading_book(book_id) -> ()`
- `get_reading_statistics() -> ReadingStatisticsDto`
- `select_reading_cover() -> Option<PendingReadingCoverDto>`
- `discard_reading_cover(token) -> ()`
- `read_reading_cover(book_id) -> bytes`
- `start_reading_run(book_id, started_on) -> BookDetailDto`
- `finish_reading_run(run_id, finished_on) -> BookDetailDto`
- `create_reading_run(book_id, input) -> BookDetailDto`
- `update_reading_run(run_id, input) -> BookDetailDto`
- `delete_reading_run(run_id) -> BookDetailDto`
- `list_reading_history(input) -> Vec<ReadingHistoryEntryDto>`

La consulta admite archivo, texto, estado, género y favoritos. La ordenación permanece en React porque opera sobre la colección ya filtrada y no constituye una regla de negocio.

## Interfaz

- Lectura usa la navegación contextual compartida: la barra superior muestra `NubeOS › Lectura › Biblioteca` y actualiza el último segmento al cambiar de vista. La cabecera conserva únicamente la identidad `Lectura`; las pestañas aparecen inmediatamente debajo.
- `Archivo` y `Añadir libro` ocupan la zona de acciones de la barra superior; el contenido puede desplazarse sin perder la ruta ni las acciones principales.
- La navegación lateral usa filas compactas completas, un fondo morado tenue para la selección y estados de hover coherentes con el lenguaje oscuro de la aplicación.
- `ReadingWorkspace` contiene `Biblioteca`, `Leyendo` y `Estadísticas`, en ese orden y con los mismos iconos y medidas que Media.
- La ampliación añade `Historial` entre Leyendo y Estadísticas.
- La cabecera coloca Archivo antes de Añadir libro.
- Biblioteca usa tarjetas estables en dos columnas: portada vertical `2:3` a la izquierda y título, autor, géneros, fechas y puntuación numérica prominente a la derecha. La cubierta usa `object-fit: cover`: conserva su proporción y llena el marco común, aceptando recorte en imágenes con otra relación de aspecto. El marco usa cuatro esquinas redondeadas, lomo y sombra discretos.
- Favorito se puede alternar desde la tarjeta y se filtra con `FavoriteFilter` únicamente en Biblioteca.
- El formulario usa una selección múltiple de veinticinco géneros predefinidos, con categorías literarias, temáticas y de no ficción.
- La tarjeta y el detalle cargan la portada local mediante `read_reading_cover`; el formulario gestiona selección provisional, sustitución y retirada.
  - El formulario es modal, avisa ante cambios sin guardar y ordena Identificación, Seguimiento, Opinión y Portada, dejando la gestión visual al final como en el módulo Anime.
- El detalle también es modal y mantiene Editar, Archivar y Cerrar en la cabecera.
- El detalle usa las subvistas compartidas `Resumen` e `Historial`. Resumen muestra, en este orden, puntuación, número de lecturas y estado; Historial contiene la lectura abierta, lecturas anteriores y accesos rápidos para iniciar, finalizar, registrar, corregir o retirar.
- Historial filtra por año y libro y permite corregir o retirar periodos con confirmación.
- Estadísticas delega en Rust los filtros por género y puntuación mínima; todos los contadores y medias se recalculan sobre el subconjunto filtrado.
- La portada del detalle usa un marco vertical `2:3` estable y rellena dicho marco sin deformarse.
- `src/ui/score.ts` concentra la escala SeriesGraph para Media y Lectura.

## Coherencia transversal

`FavoriteFilter` es un botón compacto compartido por Documentos, Anime, Series, Películas y Lectura. Usa únicamente una estrella, `aria-pressed`, tooltip y nombre accesible; la estrella se rellena al activar el filtro.

`ArchiveItemActions` unifica las acciones de los elementos archivados: restaurar con flecha circular y eliminar con papelera, ambas como botones iconográficos que aparecen al hacer hover o al navegar con teclado.

El formulario deriva una lista normalizada de autores de la biblioteca cargada y la ofrece mediante sugerencias del campo Autor. No crea otra tabla ni restringe la escritura de autores nuevos.

Al crear un periodo, React compara el estado actual con el sugerido por las fechas. La interfaz solicita una decisión antes de persistir el cambio de estado; si se conserva el anterior, usa el detalle devuelto tras crear el periodo para mantener actualizadas sus fechas resumen.

## Decisiones aplazadas

- Posible importación deliberada desde Notion.
- Progreso por páginas y sesiones de lectura.
- Citas y notas estructuradas.
- Sesiones diarias, páginas y tiempo dedicado.
## Encuadre de portada

La portada conserva posición horizontal, posición vertical y zoom entre `1×` y `2×`. El dominio Rust valida y persiste el encuadre; React reutiliza el editor compartido de portadas y únicamente presenta la vista previa. Sustituir o retirar la imagen restablece el encuadre centrado.

### Integridad del historial — T-R45
Cada mutación y la sincronización de fechas y estado del libro forman una transacción SQLite única; un error revierte ambas escrituras.
