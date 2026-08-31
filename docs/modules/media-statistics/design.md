# Diseño — Estadísticas MEDIA

## Fuente de datos

La interfaz normaliza en memoria las entidades de cada módulo y sus historiales. No crea una segunda base estadística ni duplica información derivada.

- Anime: `media_titles`, `media_contents` y `watch_sessions`.
- Películas: `media_titles` y `movie_viewings`.
- Series: `media_titles` y `media_series_runs`.
- Lectura: `reading_books` y `reading_runs`.
- Videojuegos: `games` y `game_runs`.

`MediaStatisticsDashboard` recibe obras y sesiones normalizadas. Cada módulo adapta nombres, estados, géneros y fechas antes de renderizarlo.

## Reglas visuales

- Color SeriesGraph para puntuaciones y evolución.
- Las medias se representan siempre con una celda SeriesGraph; no se usa longitud de barra para expresar una nota.
- Rankings en lista compacta, no en tarjetas.
- Gráficos construidos con HTML y CSS, sin dependencia gráfica externa.
- Las barras temporales incluyen escala vertical y el calendario anual se agrupa por meses. Evolución permite elegir si agrupa por inicio o finalización. Cada sesión aporta por separado su inicio y su finalización al calendario; las actividades puntuales conservan su tipo propio y el `title` accesible de cada celda enumera obra y evento.
- El modo de periodos es una capacidad optativa del dashboard compartido, habilitada inicialmente solo por Lectura. Una sesión abierta se extiende hasta el día actual en Madrid y una cerrada hasta su fecha final. El periodo estimado usa ámbar para distinguir lo inferido de los eventos confirmados y su leyenda no muestra `Varias`, ya que esa combinación solo describe la coincidencia de eventos puntuales exactos.
- `Actividad puntual` identifica registros que solo tienen una fecha —como episodios o películas vistos— y no afirma continuidad diaria. Su leyenda solo aparece cuando el módulo contiene ese tipo de registro; por tanto, Lectura muestra únicamente inicio, finalización, periodos y coincidencias. Los días intermedios pertenecen exclusivamente al modo de periodos estimados.
- La leyenda se deriva de la forma real de las sesiones filtradas: Películas y Anime muestran actividad puntual; Lectura muestra inicio, finalización y, según el modo, periodos; Series y Videojuegos muestran los extremos de sus sesiones. `Varias` solo aparece cuando al menos dos clases exactas de evento coinciden realmente en un mismo día.
- Toda barra o celda conserva detalle mediante `hover`.
- Los grupos sin datos permanecen visibles cuando forman parte de la estructura.
- Las filas de género con menos de tres obras muestran `Muestra pequeña`.

## Persistencia

Los filtros y el tamaño del Top se guardan en `localStorage` con una clave independiente por módulo y, en Anime, por ámbito. La vista siempre vuelve a `Resumen`.

Los agregados de terminaciones, comparación anual y puntuación por año se calculan sobre el mismo conjunto filtrado que el resto del panel. Un valor persistido no reconocido se descarta y vuelve al Top 5 seguro.
Cuando los datos llegan de forma asíncrona, el año activo se reconcilia con los años disponibles para evitar un selector vacío o un periodo inexistente.
