# Diseño — Lectura

- Estado: Implementado provisionalmente; segunda revisión visual pendiente
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
├── started_on: Option<NaiveDate>
├── finished_on: Option<NaiveDate>
├── cover: Option<ManagedReadingCover>
└── archived: bool
```

`ReadingStatus` contiene `pending`, `reading`, `paused`, `completed` y `abandoned`. El ID técnico es UUID y no tiene significado visible. La migración `0019` convierte cualquier valor histórico `researching` a `pending` y cierra de nuevo la restricción de SQLite.

## Responsabilidades

- Rust valida entidad, fechas, puntuación, géneros y ciclo de vida.
- `ReadingRepository` persiste y consulta exclusivamente la tabla `reading_books`.
- Los comandos Tauri adaptan DTOs y delegan en el dominio y repositorio.
- React mantiene navegación, filtros, orden, modales y borradores de formulario.
- Los CSV no participan en tiempo de ejecución ni se copian al repositorio.

## Persistencia

La migración `0017_create_reading_books.sql` crea una tabla independiente con géneros serializados como JSON, nombres normalizados para búsqueda, fechas ISO y marcas de archivo/favorito. La migración `0018_add_reading_covers.sql` añade los metadatos de la portada. Los bytes viven en el directorio privado `reading/covers`, no dentro de SQLite y no comparten tablas con `media`.

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

La consulta admite archivo, texto, estado, género y favoritos. La ordenación permanece en React porque opera sobre la colección ya filtrada y no constituye una regla de negocio.

## Interfaz

- `ReadingWorkspace` contiene `Biblioteca`, `Leyendo` y `Estadísticas`, en ese orden y con los mismos iconos y medidas que Media.
- La cabecera coloca Archivo antes de Añadir libro.
- Biblioteca usa tarjetas estables en dos columnas: portada vertical completa a la izquierda y título, autor, géneros, fechas y puntuación numérica prominente a la derecha.
- Favorito se puede alternar desde la tarjeta y se filtra con `FavoriteFilter` únicamente en Biblioteca.
- El formulario usa una selección múltiple de diez géneros predefinidos.
- La tarjeta y el detalle cargan la portada local mediante `read_reading_cover`; el formulario gestiona selección provisional, sustitución y retirada.
  - El formulario es modal, avisa ante cambios sin guardar y ordena Identificación, Seguimiento, Opinión y Portada, dejando la gestión visual al final como en el módulo Anime.
- El detalle también es modal y mantiene Editar, Archivar y Cerrar en la cabecera.
- `src/ui/score.ts` concentra la escala SeriesGraph para Media y Lectura.

## Coherencia transversal

`FavoriteFilter` es un botón compacto compartido por Documentos, Anime, Series, Películas y Lectura. Usa únicamente una estrella, `aria-pressed`, tooltip y nombre accesible; la estrella se rellena al activar el filtro.

`ArchiveItemActions` unifica las acciones de los elementos archivados: restaurar con flecha circular y eliminar con papelera, ambas como botones iconográficos que aparecen al hacer hover o al navegar con teclado.

## Decisiones aplazadas

- Posible importación deliberada desde Notion.
- Progreso por páginas y sesiones de lectura.
- Relecturas, citas y notas estructuradas.
