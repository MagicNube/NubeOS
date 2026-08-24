# Diseño — Películas

- Estado: Ampliación de revisionados implementada; comprobación manual pendiente
- Última actualización: 2026-08-22

## Modelo

Películas reutiliza `MediaTitle` con `kind = movie` e `is_anime = false`. Cada visualización es un `MovieViewing` fechado; el total se deriva de esas entradas y deja de estar limitado a 0 o 1.

## Flujo

1. `MoviesWorkspace` abre `SimpleMediaWorkspace(area = movies)`.
2. Rust filtra películas convencionales mediante `kind` e `is_anime`.
3. Marcar vista crea un recorrido finalizado en la fecha elegida y actualiza el estado en la misma transacción.
4. `Volver a ver` crea otro recorrido sin modificar los anteriores; retirar una entrada recalcula el estado únicamente cuando desaparece el último visionado.
5. React refresca el detalle devuelto por el comando.

## Interfaz

- Biblioteca simple con búsqueda, estado, favoritos y Archivo.
- Tarjeta horizontal con Pendiente/Vista y puntuación; la imagen usa `object-fit: contain` y no hereda la portada vertical de Anime.
- Detalle con portada horizontal y subvistas compartidas `Resumen` e `Historial`. Resumen muestra, en este orden, puntuación, visionados y estado; Historial permite registrar el primer visionado o uno nuevo y corregir los existentes.
- Acción `Volver a ver`, contador de visionados e Historial filtrable.
- Formulario sin campos de temporadas o contenidos y con favorito mediante estrella, no checkbox.

## Persistencia

Comparte `media_titles` con el núcleo audiovisual. Cada fecha vive en `media_movie_viewings`; las sesiones antiguas de Películas se migran a esta tabla y `media_watch_sessions` continúa reservado a unidades de Anime.

## Decisiones aplazadas

- Metadatos cinematográficos, sagas y plataformas.
