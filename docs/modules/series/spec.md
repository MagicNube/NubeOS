# Spec — Series

- Estado: Refactor aprobado por Nube; comprobación funcional pendiente
- Última actualización: 2026-08-16

## Objetivo

Registrar series convencionales mediante un tracker sencillo que recuerde qué se está viendo, por dónde se va y la valoración personal, sin utilizar la jerarquía compleja de Anime.

## Funcionalidades

- Biblioteca exclusiva de Series con tarjetas y portadas.
- Crear y editar nombre, título alternativo, estado, puntuación, opinión y favorito.
- Temporada y episodio actuales opcionales.
- Fecha de inicio y finalización opcionales.
- Buscar y filtrar por estado y favoritos.
- Archivar, restaurar y eliminar definitivamente desde Archivo.
- Mostrar de forma compacta `T2 · E5` cuando existe posición.

## Reglas

- Una Serie convencional no crea temporadas ni episodios como entidades.
- Temporada y episodio son enteros positivos e independientes; ambos son opcionales.
- La fecha final no puede ser anterior a la fecha inicial.
- Series nunca muestra Anime ni Películas.
- Los contenidos detallados creados durante el prototipo se conservan en modo lectura para no perder datos.

## Fuera de alcance

- Jerarquía de temporadas, películas vinculadas, OVA o especiales.
- Seguimiento de cada episodio e historial `+1`.
- APIs externas y calendario de emisión.

## Criterios de aceptación

- [ ] Se puede guardar una serie con posición opcional y recuperarla tras reiniciar.
- [ ] Las tarjetas muestran posición, estado y puntuación sin datos de Anime.
- [ ] Editar posición o fechas no altera datos históricos ajenos.
- [ ] Archivo y borrado funcionan igual que en los demás trackers.
