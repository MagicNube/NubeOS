# Diseño — Películas

- Estado: Implementado provisionalmente; revisión funcional pendiente
- Última actualización: 2026-08-22

## Modelo

Películas reutiliza `MediaTitle` con `kind = movie` e `is_anime = false`. `watched_units` vale 0 o 1; `finished_on` conserva la fecha de visionado y `WatchSession` representa la visualización fechada.

## Flujo

1. `MoviesWorkspace` abre `SimpleMediaWorkspace(area = movies)`.
2. Rust filtra películas convencionales mediante `kind` e `is_anime`.
3. Marcar vista actualiza contador, estado y fecha y crea su sesión en la misma operación de repositorio. Volver a Pendiente retira esa sesión y sincroniza los mismos campos.
4. React refresca el detalle devuelto por el comando.

## Interfaz

- Biblioteca simple con búsqueda, estado, favoritos y Archivo.
- Tarjeta con Pendiente/Vista y puntuación.
- Detalle con fecha seleccionable y una sola acción principal.
- Formulario sin campos de temporadas o contenidos.

## Persistencia

Comparte las tablas `media_titles` y `media_watch_sessions`. No accede a datos internos de otros módulos no audiovisuales.

## Decisiones aplazadas

- Decidir tras uso real si se necesitan múltiples revisualizaciones diferenciadas.
