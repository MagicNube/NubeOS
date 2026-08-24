# Diseño — Lectura

- Estado: Ampliación de relecturas implementada; comprobación manual pendiente
- Última actualización: 2026-08-23

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

- `ReadingWorkspace` contiene `Biblioteca`, `Leyendo` y `Estadísticas`, en ese orden y con los mismos iconos y medidas que Media.
- La ampliación añade `Historial` entre Leyendo y Estadísticas.
- La cabecera coloca Archivo antes de Añadir libro.
- Biblioteca usa tarjetas estables en dos columnas: portada vertical `2:3` a la izquierda y título, autor, géneros, fechas y puntuación numérica prominente a la derecha. La cubierta usa `object-fit: cover`: conserva su proporción y llena el marco común, aceptando recorte en imágenes con otra relación de aspecto. El marco usa cuatro esquinas redondeadas, lomo y sombra discretos.
- Favorito se puede alternar desde la tarjeta y se filtra con `FavoriteFilter` únicamente en Biblioteca.
- El formulario usa una selección múltiple de diez géneros predefinidos.
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

## Decisiones aplazadas

- Posible importación deliberada desde Notion.
- Progreso por páginas y sesiones de lectura.
- Citas y notas estructuradas.
- Sesiones diarias, páginas y tiempo dedicado.
