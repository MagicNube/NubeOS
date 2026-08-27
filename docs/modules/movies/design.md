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
- Tarjeta horizontal 16:9 con Pendiente/Vista y puntuación; comparte altura y cuadrícula con Series y Videojuegos y no hereda la portada vertical de Anime.
- Detalle con portada horizontal y subvistas compartidas `Resumen` e `Historial`. Resumen muestra, en este orden, puntuación, visionados y estado; Historial reproduce el patrón de Lectura y Videojuegos con contador, acciones Registrar visionado/Ver hoy y filas fechadas con edición y eliminación.
- El historial general reutiliza esas mismas filas compactas y el mismo formulario modal de fecha; editar y eliminar son acciones explícitas, nunca un campo editable permanente.
- Historial presenta un bloque delimitado con encabezado, fecha etiquetada y botón principal; los controles no quedan flotando sin contexto.
- Acción `Volver a ver`, contador de visionados e Historial filtrable.
- Formulario sin campos de temporadas o contenidos y con favorito mediante estrella, no checkbox.
- El formulario principal mantiene las mismas secciones de Lectura y Videojuegos: Identificación, Seguimiento, Opinión y Portada.
- Estadísticas solicita a Rust un subconjunto por año de finalización y puntuación mínima antes de calcular sus agregados.
- Los filtros de Estadísticas reutilizan el selector oscuro común: altura, tipografía, flecha, foco y opciones no dependen del estilo nativo claro del sistema.
- La estrella de favorito es una acción independiente de la apertura de tarjeta y responde sin abrir el detalle.
- Las coordenadas porcentuales de portada pertenecen a `MediaTitle` y son compartidas con Anime y Series.
- El editor de encuadre permite arrastrar con captura de puntero y ajustar los ejes horizontal y vertical como alternativa precisa.
- El formulario compartido sustituye portadas directamente, ofrece una papelera para retirarlas y notifica a las imágenes montadas para releer el archivo confirmado.

## Persistencia

Comparte `media_titles` con el núcleo audiovisual. Cada fecha vive en `media_movie_viewings`; las sesiones antiguas de Películas se migran a esta tabla y `media_watch_sessions` continúa reservado a unidades de Anime.

## Decisiones aplazadas

- Metadatos cinematográficos, sagas y plataformas.
