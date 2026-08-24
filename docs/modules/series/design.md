# Diseño — Series

- Estado: Ampliación de revisionados pendiente de aprobación
- Última actualización: 2026-08-22

## Modelo

Series reutiliza `MediaTitle` con `kind = series` e `is_anime = false`. `current_season` y `current_episode` representan la posición del visionado abierto. `MediaTitleRun` conserva los periodos completos o en curso.

No crea `MediaContent`. El núcleo audiovisual compartido aporta portada, estado, puntuación, opinión, favorito y ciclo de vida.

## Flujo

1. `SeriesWorkspace` abre `SimpleMediaWorkspace(area = series)`.
2. React solicita títulos con el área explícita.
3. Rust filtra y valida que el título sea una Serie convencional.
4. Crear o editar persiste metadatos y posición en SQLite.
5. Iniciar o finalizar un visionado actualiza `media_title_runs`, estado y posición mediante una transacción.

## Interfaz

- Una única Biblioteca enfocada, sin pestaña Todos.
- Fila superior con búsqueda, estado y favoritos.
- Tarjetas de tamaño estable con `Tn · En` cuando procede.
- Detalle simple con posición, fechas, puntuación y opinión.
- Historial por serie y año, con corrección de fechas y retirada segura.
- Acción `Volver a ver` que crea un periodo y reinicia la posición actual.
- Datos jerárquicos del prototipo se muestran como contenido conservado, sin permitir crear nuevos.

## Persistencia

La ampliación crea `media_title_runs`, compartida únicamente por Series y Películas. Migra las fechas actuales de Series a un primer periodo y mantiene `media_watch_sessions` reservado al historial por unidades de Anime.

## Decisiones aplazadas

- Seguimiento histórico episodio por episodio.
