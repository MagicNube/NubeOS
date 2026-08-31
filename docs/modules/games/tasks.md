# Tareas — Videojuegos

- Estado: Implementación completada; comprobación visual pendiente
- Última actualización: 2026-08-30

## Cómo usar este documento

Las tareas se realizan de una en una después de aprobar spec y diseño. Cada tarea debe producir un cambio pequeño, verificable y revisable.

## T-G12 — Añadir géneros y estadísticas MEDIA 1.0

- Estado: Implementada; revisión visual pendiente
- Alcance: géneros persistentes y conexión con Resumen, Rankings, Explorar, Evolución y Calendario.
- Verificación: migración SQLite, compilación frontend y suite Rust.

## T-G01 — Crear dominio y migración

- Estado: Implementada
- Alcance: `Game`, `GameRun`, estados, invariantes, tablas e índices.
- Verificación: pruebas unitarias y migración sobre una base vacía.

## T-G02 — Implementar repositorio

- Estado: Implementada
- Dependencias: T-G01
- Alcance: CRUD, Archivo, favoritos, partidas, consultas y transacciones.
- Verificación: pruebas de persistencia, restricciones y borrado en cascada.

## T-G03 — Implementar portadas administradas

- Estado: Implementada
- Dependencias: T-G01
- Alcance: selección provisional, promoción, sustitución, retirada y lectura binaria.
- Verificación: pruebas del almacén y compensación ante errores.

## T-G04 — Crear comandos Tauri

- Estado: Implementada
- Dependencias: T-G02, T-G03
- Alcance: adaptar todos los casos de uso aprobados mediante comandos pequeños.
- Verificación: contratos registrados y errores de frontera comprensibles.

## T-G05 — Crear contratos TypeScript

- Estado: Implementada
- Dependencias: T-G04
- Alcance: DTOs, API, presentación de estados, fechas y errores.
- Verificación: TypeScript sin errores.

## T-G06 — Crear Biblioteca y Jugando

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-G05
- Alcance: navegación, búsqueda, filtros, ordenación, tarjetas, favoritos y Archivo.
- Verificación: build y recorrido manual con datos reales.

## T-G07 — Crear formulario y detalle

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-G05
- Alcance: crear/editar, portada, puntuación, opinión y acciones de seguimiento.
- Verificación: aviso de cambios sin guardar y recorrido de estados.

## T-G08 — Crear Historial y Estadísticas

- Estado: Implementada; comprobación visual pendiente
- Dependencias: T-G06, T-G07
- Alcance: filtros, corrección y retirada de partidas; agregados calculados en Rust.
- Verificación: primera partida, rejugada, partida abierta y correcciones.

## T-G09 — Integrar navegación y revisar

- Estado: Revisión técnica completada; comprobación manual pendiente
- Dependencias: T-G01 a T-G08
- Alcance: barra lateral, carga diferida, coherencia visual, accesibilidad y revisión técnica.
- Verificación: pruebas Rust, formato, Clippy estricto, build TypeScript, `git diff --check` y prueba en Tauri.

## T-G10 — Refinar portadas y acceso a Jugando

- Estado: Implementada; comprobación visual pendiente
- Alcance: mostrar completa la ilustración horizontal, usar un mando en Jugando y aceptar portadas pegadas normalizadas a JPEG.
- Verificación: build y prueba manual con carátulas horizontales y WebP copiado.

## T-G11 — Unificar el detalle del tracker

- Estado: Implementada; comprobación visual pendiente
- Alcance: dividir el detalle en Resumen e Historial, aplicar las métricas compartidas y usar una portada horizontal completa también dentro del videojuego.
- Verificación: build y prueba manual con título sin partidas, partida abierta y varias rejugadas.

## T-G12 — Corregir geometría horizontal de portadas

- Estado: Implementada; comprobación visual pendiente
- Alcance: usar un marco 16:9 común en tarjeta y detalle y mostrar la imagen completa mediante `object-fit: contain`.
- Verificación: build y prueba manual con imágenes horizontales, verticales y cuadradas.

## T-G13 — Ajustar encuadre y zoom de portada

- Estado: Implementada; comprobación visual pendiente
- Alcance: persistir posición X/Y y zoom, reutilizar el editor compartido y mostrar Ajustar únicamente al hover, foco o en dispositivos sin hover.
- Verificación: pruebas de dominio y repositorio, build y recorrido manual con portadas horizontales de proporciones distintas.

## T-G14 — Unificar sustitución y retirada de portada

- Estado: Implementada; comprobación visual pendiente.
- Alcance: mostrar la nueva imagen seleccionada, sustituir la anterior directamente, retirarla con una papelera y refrescar todas las vistas abiertas.
- Verificación: reemplazar y eliminar la portada de un videojuego existente, comprobando Biblioteca y detalle sin reiniciar.

## T-G15 — Consolidar formularios, ordenación e historial

- Estado: Implementada; comprobación visual pendiente.
- Alcance: incorporar favorito al formulario, persistir la ordenación por título, puntuación y fechas y normalizar la cabecera de partidas y rejugadas.
- Restricciones: toda partida exige fecha inicial y ninguna rejugada puede preceder a la primera partida registrada.
- Verificación: crear y ordenar videojuegos, registrar partidas válidas y comprobar el rechazo de periodos anteriores al primero.

## T-G16 — Mostrar la última partida y normalizar acciones de portada

- Estado: Implementada; comprobación visual pendiente.
- Alcance: mostrar inicio y fin de la última partida en cada tarjeta, conservar la paleta común de estados y ocultar Ajustar hasta interactuar con la portada.
- Verificación: revisar videojuegos sin partidas, partidas en curso y finalizadas; abrir detalles de los cinco trackers y comprobar hover y foco por teclado.

## T-G17 — Igualar el resumen temporal con Lectura

- Estado: Implementada; comprobación visual pendiente.
- Alcance: presentar Inicio y Fin en dos columnas equivalentes, con las mismas etiquetas, tamaños y tratamiento de valores vacíos que las tarjetas de Lectura.
- Verificación: revisar videojuegos sin partidas, con partida abierta y con última partida terminada en distintas anchuras.

**Resultado:** Videojuegos deja de mostrar las fechas como líneas independientes y adopta la misma jerarquía temporal que Lectura.

La valoración de la tarjeta adopta también el contenedor compartido de `58 × 48 px`, conservando el texto a 17 px y la escala cromática común.

## T-G18 — Confirmar estados derivados del historial

- Estado: Implementada; comprobación visual pendiente.
- Alcance: avisar cuando crear, editar, terminar o eliminar una partida sugiera otro estado y permitir conservar el estado manual sin perder el registro.
- Restricciones: `Empezar hoy` y `Terminar hoy` son acciones secundarias; `Registrar partida` permanece como acción principal.
- Verificación: registrar una partida histórica abierta sobre un juego Terminado, aceptar y rechazar la sugerencia, y repetir el flujo al editar y eliminar.

**Resultado:** ninguna mutación del historial cambia silenciosamente el estado del videojuego y la cabecera prioriza el registro manual de partidas.

## T-G19 — Separar periodo cerrado de videojuego terminado

- Estado: Implementada; comprobación visual pendiente.
- Alcance: persistir si cada partida terminó realmente el videojuego, además de sus fechas, y mostrar `Sin terminar` en los periodos cerrados incompletos.
- Restricciones: `Terminar hoy` completa el videojuego; cerrar manualmente una partida sin terminar sugiere En pausa y conserva la confirmación de estado.
- Verificación: migrar partidas existentes, registrar una partida cerrada completa e incompleta y comprobar historial, estado sugerido y estadísticas.

**Resultado:** una fecha final deja de comunicar por sí sola que el videojuego fue completado.

## T-G20 — Compactar periodos y completar el detalle

- Estado: Implementada; comprobación visual pendiente.
- Alcance: convertir la opción `Sin terminar` en una fila compacta, añadir favorito al detalle y ampliar Estadísticas con puntuados y Top 5/10/15/25 persistente.
- Verificación: cerrar una partida completa e incompleta, alternar favorito y cambiar la longitud del ranking.

**Resultado:** el formulario conserva la distinción de dominio sin dominar visualmente el modal, y Biblioteca y detalle ofrecen las mismas acciones rápidas.

## T-G21 — Completar géneros y normalizar controles Media

- Estado: Implementada; comprobación visual pendiente.
- Alcance: asignar géneros a todos los videojuegos existentes, aceptar años de dos cifras en las fechas de partidas y adoptar la barra común de búsqueda y filtros.
- Restricciones: reutilizar la taxonomía ya aprobada y no modificar partidas, estados o puntuaciones.
- Verificación: ejecutar la migración, revisar títulos de distintos géneros, introducir fechas abreviadas y comprobar favoritos y ordenación en varias anchuras.

**Resultado:** los videojuegos existentes quedan clasificados con la taxonomía aprobada y comparten fechas inteligentes y barra adaptable con el resto de Media.

## T-G22 — Reforzar integridad temporal

- Estado: Implementada; comprobación visual pendiente.
- Alcance: rechazar también en Rust cualquier fecha futura recibida al crear o editar una partida.
- Verificación: enviar fechas pasada y futura directamente al comando, sin depender de la validación del formulario.

**Resultado:** una llamada externa o una interfaz desactualizada no puede persistir historial futuro.
