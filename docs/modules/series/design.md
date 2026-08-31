# Diseño — Series

- Estado: Ampliación de revisionados implementada; revisión visual pendiente
- Última actualización: 2026-08-22

## Modelo

Series reutiliza `MediaTitle` con `kind = series` e `is_anime = false`. `current_season` y `current_episode` representan la posición actual. `SeriesRun` conserva los periodos completos o en curso.

No crea `MediaContent`. El núcleo audiovisual compartido aporta portada, estado, puntuación, opinión, favorito y ciclo de vida.

## Flujo

1. `SeriesWorkspace` abre `SimpleMediaWorkspace(area = series)`.
2. React solicita títulos con el área explícita.
3. Rust filtra y valida que el título sea una Serie convencional.
4. Crear o editar persiste metadatos y posición en SQLite.
5. Registrar, corregir o retirar un visionado actualiza `media_series_runs` y sugiere el estado derivado sin imponerlo silenciosamente.

## Interfaz

- Navegación compacta mediante `Biblioteca` y `Estadísticas`, sin pestaña Todos ni historial global.
- Fila superior con búsqueda, estado y favoritos.
- Tarjetas de tamaño estable con `Tn · En` cuando procede.
- Detalle simple con posición, fechas, puntuación y opinión.
- El formulario agrupa identificación, seguimiento, opinión y portada igual que los demás trackers, pero omite fechas porque `media_series_runs` es su única fuente temporal.
- Estadísticas reutiliza el resumen audiovisual compartido y presenta series totales, terminadas y puntuación media; permite filtrar por puntuación mínima.
- Historial por serie y año, con corrección de fechas y retirada segura.
- Acción `Volver a ver` que crea un periodo y reinicia la posición actual.
- Datos jerárquicos del prototipo se muestran como contenido conservado, sin permitir crear nuevos.
- La portada horizontal comparte con Anime y Películas un encuadre porcentual editable y persistente.
- La cabecera reserva a la portada horizontal su anchura real para evitar cualquier solapamiento con título, estado y acciones.

## Persistencia

La ampliación crea `media_series_runs` y migra las fechas actuales de Series a un primer periodo. Películas conserva `media_movie_viewings` y Anime mantiene `media_watch_sessions` para su historial por episodios.

## Decisiones aplazadas

- Seguimiento histórico episodio por episodio.
