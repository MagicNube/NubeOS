# Spec — Películas

- Estado: Ampliación de revisionados implementada; comprobación manual pendiente
- Última actualización: 2026-08-22

## Objetivo

Mantener un tracker independiente y de baja fricción para películas convencionales pendientes o vistas, con fecha, puntuación y opinión.

## Funcionalidades

- Biblioteca exclusiva de Películas convencionales.
- Crear y editar título, título alternativo, estado, puntuación, opinión y favorito. Las fechas se registran en cada visionado.
- Marcar una película como vista o volver a verla desde su detalle. Solo vuelve a Pendiente cuando deja de tener visionados registrados.
- Registrar una sesión de visionado con la fecha elegida al marcarla como vista.
- Registrar varios visionados de la misma película sin sobrescribir fechas anteriores.
- Consultar, corregir y retirar visionados desde Historial.
- Buscar, filtrar, archivar, restaurar y eliminar definitivamente.
- Consultar estadísticas filtradas por año de finalización y puntuación mínima.
- Mostrar portadas horizontales con encuadre y zoom configurables en Biblioteca y detalle.
- Sustituir una portada directamente o retirarla mediante una papelera, actualizando Biblioteca y detalle sin reiniciar.
- Dividir el detalle en `Resumen` e `Historial`: el resumen muestra puntuación, visionados y estado; el historial concentra las fechas y acciones de revisionado.
- Presentar el alta de visionados dentro de un bloque identificable, con fecha etiquetada y acción principal alineada.
- Elegir favorito mediante el patrón común de estrella vacía o rellena, también en el formulario.

## Reglas

- El estado visible continúa siendo pendiente o vista, pero una película puede acumular varios visionados.
- Marcar vista crea un visionado fechado y establece estado Terminado.
- Volver a verla crea otro visionado; no modifica el anterior.
- Un nuevo visionado no puede ser anterior al primer visionado registrado de la película.
- La tarjeta presenta el estado fuera de la portada y muestra la fecha del último visionado.
- La biblioteca conserva la ordenación elegida y permite ordenar por título, puntuación y fechas.
- Retirar el último visionado deja la película Pendiente únicamente cuando no queda ningún visionado.
- Una película convencional nunca admite contenidos.
- Una película anime independiente pertenece a Anime y nunca aparece aquí.
- Las películas creadas antes de la separación pueden moverse manualmente a Anime desde Editar.

## Fuera de alcance

- Reparto, dirección, plataformas, duración o géneros.
- Sagas y relaciones entre películas.
- APIs externas.

## Criterios de aceptación

- [ ] Una película puede marcarse vista con fecha y reaparece igual tras reiniciar.
- [ ] La puntuación y opinión son opcionales.
- [ ] Películas Anime no aparecen en esta Biblioteca.
- [ ] Archivo y eliminación definitiva conservan sus confirmaciones.
- [ ] Una película admite varios visionados con fechas independientes.
- [ ] Historial permite corregir o retirar un visionado sin crear entradas negativas.
- [ ] Estadísticas recalcula títulos, vistas y media al filtrar por año o puntuación mínima.
- [x] Favorito puede alternarse directamente desde una tarjeta activa de Biblioteca y desde el detalle.
- [x] La portada puede recolocarse dentro del marco horizontal y conserva la posición elegida.
- [x] La portada admite zoom persistente entre `1×` y `2×`.
