# Spec — Películas

- Estado: Refactor aprobado por Nube; comprobación funcional pendiente
- Última actualización: 2026-08-22

## Objetivo

Mantener un tracker independiente y de baja fricción para películas convencionales pendientes o vistas, con fecha, puntuación y opinión.

## Funcionalidades

- Biblioteca exclusiva de Películas convencionales.
- Crear y editar título, título alternativo, estado, fecha de visionado, puntuación, opinión y favorito.
- Marcar una película como vista o devolverla a Pendiente desde su detalle.
- Registrar una sesión de visionado con la fecha elegida al marcarla como vista.
- Buscar, filtrar, archivar, restaurar y eliminar definitivamente.

## Reglas

- El progreso es binario: pendiente o vista.
- Marcar vista establece estado Terminado y fecha; desmarcar establece Pendiente.
- Volver a Pendiente retira la sesión de visionado asociada en lugar de crear un acontecimiento negativo en el historial.
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
- [ ] Películas anime no aparecen en esta Biblioteca.
- [ ] Archivo y eliminación definitiva conservan sus confirmaciones.
