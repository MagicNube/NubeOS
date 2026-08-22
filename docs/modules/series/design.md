# Diseño — Series

- Estado: Implementado provisionalmente; revisión funcional pendiente
- Última actualización: 2026-08-22

## Modelo

Series reutiliza `MediaTitle` con `kind = series` e `is_anime = false`. Los campos propios son `current_season`, `current_episode`, `started_on` y `finished_on`.

No crea `MediaContent`. El núcleo audiovisual compartido aporta portada, estado, puntuación, opinión, favorito y ciclo de vida.

## Flujo

1. `SeriesWorkspace` abre `SimpleMediaWorkspace(area = series)`.
2. React solicita títulos con el área explícita.
3. Rust filtra y valida que el título sea una Serie convencional.
4. Crear o editar persiste metadatos y posición en SQLite.

## Interfaz

- Una única Biblioteca enfocada, sin pestaña Todos.
- Fila superior con búsqueda, estado y favoritos.
- Tarjetas de tamaño estable con `Tn · En` cuando procede.
- Detalle simple con posición, fechas, puntuación y opinión.
- Datos jerárquicos del prototipo se muestran como contenido conservado, sin permitir crear nuevos.

## Persistencia

La migración 0013 amplía `media_titles`; no crea una tabla duplicada. Rust sigue siendo dueño de todas las invariantes.

## Decisiones aplazadas

- Evaluar si el uso real necesita historial de avance o basta con posición actual.
