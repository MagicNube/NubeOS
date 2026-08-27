# Spec — Series

- Estado: Ampliación de revisionados pendiente de aprobación
- Última actualización: 2026-08-16

## Objetivo

Registrar series convencionales mediante un tracker sencillo que recuerde qué se está viendo, por dónde se va y la valoración personal, sin utilizar la jerarquía compleja de Anime.

## Funcionalidades

- Biblioteca exclusiva de Series con tarjetas y portadas.
- Navegación mediante dos vistas, `Biblioteca` y `Estadísticas`, alineada visualmente con los demás módulos de entretenimiento.
- Crear y editar nombre, título alternativo, estado, puntuación, opinión y favorito.
- Temporada y episodio actuales opcionales.
- Fecha de inicio y finalización opcionales para cada periodo de visionado.
- Registrar cada visionado completo como un periodo independiente y permitir volver a ver una serie.
- Consultar, corregir y retirar periodos desde Historial.
- Buscar y filtrar por estado y favoritos.
- Consultar número de series, terminadas y puntuación media, con filtro de puntuación mínima.
- Archivar, restaurar y eliminar definitivamente desde Archivo.
- Mostrar de forma compacta `T2 · E5` cuando existe posición.
- Presentar tarjeta y detalle con la misma geometría horizontal y jerarquía de métricas que Películas y Videojuegos.
- Permitir recolocar la portada dentro del marco horizontal y conservar el encuadre.
- Permitir ampliar la portada entre `1×` y `2×` y conservar el zoom.

## Reglas

- Una Serie convencional no crea temporadas ni episodios como entidades.
- Temporada y episodio son enteros positivos e independientes; ambos son opcionales.
- La fecha final no puede ser anterior a la fecha inicial.
- La tarjeta presenta el estado fuera de la portada y prioriza la fecha o el periodo del último seguimiento frente al número de episodio.
- La biblioteca conserva la ordenación elegida y permite ordenar por título, puntuación y fechas inicial y final.
- Series nunca muestra Anime ni Películas.
- Los contenidos detallados creados durante el prototipo se conservan en modo lectura para no perder datos.
- Solo puede existir un visionado abierto por serie.
- Empezar de nuevo crea otro periodo y reinicia la posición actual sin sobrescribir los anteriores.

## Fuera de alcance

- Jerarquía de temporadas, películas vinculadas, OVA o especiales.
- Seguimiento histórico de cada episodio o sesiones diarias `+1`.
- APIs externas y calendario de emisión.

## Criterios de aceptación

- [ ] Se puede guardar una serie con posición opcional y recuperarla tras reiniciar.
- [ ] Las tarjetas muestran posición, estado y puntuación sin datos de Anime.
- [ ] Editar posición o fechas no altera datos históricos ajenos.
- [ ] Archivo y borrado funcionan igual que en los demás trackers.
- [ ] Se puede registrar un segundo visionado sin alterar el primero.
- [ ] Historial permite corregir y retirar periodos completos.
