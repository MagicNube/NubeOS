# Spec — Videojuegos

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-09-04
- Aprobación de cierre: Nube, 2026-09-04. Cierre del alcance implementado; los trabajos futuros y las verificaciones de instalación no se consideran realizados por esta aprobación.

## Objetivo

Mantener una biblioteca personal de videojuegos que permita recordar qué se está jugando, qué se ha terminado, la valoración personal y cada partida completa o rejugada sin convertir el módulo en un registro de horas o logros.

## Funcionalidades

- Vistas `Biblioteca`, `Jugando`, `Historial` y `Estadísticas`, con Biblioteca como vista inicial.
- Crear, consultar y editar videojuegos mediante formularios modales.
- Guardar nombre, géneros, portada opcional, estado, puntuación, opinión y favorito.
- Estados: Pendiente, Jugando, En pausa, Terminado y Abandonado.
- Buscar por nombre, combinar varios estados, filtrar favoritos y ordenar por actualización, título, puntuación o fechas de inicio y finalización, conservando la opción elegida y resolviendo empates por título.
- Iniciar una partida, cerrar su periodo y registrar partidas antiguas mediante fecha de inicio y fin, indicando de forma independiente si el juego se terminó.
- Rejugar un título creando una partida nueva sin sobrescribir las anteriores.
- Consultar, corregir y eliminar partidas desde el historial.
- Archivar, restaurar y eliminar definitivamente con los patrones comunes de NubeOS.
- Mostrar estadísticas compartidas MEDIA: resumen, rankings, exploración por género/estado/año, evolución y calendario.
- Dividir el detalle en `Resumen` e `Historial`: el resumen muestra puntuación, partidas y estado; el historial concentra partidas, rejugadas y acciones.
- Mostrar en la tarjeta de Biblioteca las fechas inicial y final de la última partida, igual que Lectura; una partida abierta indica `En curso`.

## Reglas

- El nombre es obligatorio y se normaliza antes de guardar.
- La puntuación es opcional, está entre 0 y 10 y admite como máximo un decimal.
- La opinión pertenece al videojuego, no a una partida concreta.
- Una partida requiere fecha de inicio; su fecha final es opcional mientras permanece abierta.
- Ninguna fecha del historial puede estar en el futuro según la fecha local de Madrid.
- Las fechas aceptan escritura local `dd/mm/aaaa`; un año de dos cifras se interpreta en el siglo XXI antes de validarse y persistirse.
- Una nueva partida no puede comenzar antes de la primera partida registrada del videojuego.
- Una partida con fecha final no puede terminar antes de empezar; cerrar el periodo no implica por sí solo haber terminado el videojuego.
- Una partida marcada como terminada exige fecha final. Una partida cerrada sin terminar propone el estado En pausa.
- Solo puede existir una partida sin fecha final por videojuego.
- Iniciar una partida establece el estado Jugando.
- Finalizar la partida abierta establece el estado Terminado.
- Pausar o abandonar no elimina la partida abierta.
- Eliminar la única partida terminada devuelve el estado Terminado a Pendiente únicamente cuando no queda otra partida.
- La portada se copia al almacenamiento privado del módulo y admite JPEG, PNG o WebP de hasta 8 MB.
- Puede pegarse una imagen desde el portapapeles; se convierte a JPEG antes de entrar en el almacenamiento privado.
- El borrado definitivo solo está disponible desde Archivo.

## Casos límite

- Se puede registrar una partida histórica indicando siempre su fecha inicial y, opcionalmente, su fecha final.
- No se puede iniciar una rejugada mientras exista otra partida abierta.
- Corregir fechas recalcula el orden del historial, pero no modifica puntuación ni opinión.
- Archivar conserva las partidas y la portada.
- Un videojuego sin portada usa un estado vacío estable, sin depender de una imagen externa.
- Las portadas se presentan en un marco horizontal estable y admiten posición y zoom configurables, tanto en la tarjeta como en el detalle.

## Fuera de alcance

- Horas jugadas, sesiones diarias, logros, trofeos o porcentaje de completado.
- Plataformas, ediciones, DLC o desarrolladores en la primera versión.
- Biblioteca de tiendas, precios, suscripciones o listas de deseos comerciales.
- Importación desde Steam, PlayStation, Xbox, Nintendo u otras APIs.
- Puntuación u opinión distinta para cada partida.
- Multijugador, amigos, recomendaciones o sincronización.

## Criterios de aceptación

- [x] La aplicación parte con una biblioteca de videojuegos vacía.
- [x] Se puede crear, editar, archivar, restaurar y eliminar un videojuego.
- [x] Portada, puntuación y opinión son opcionales y persisten tras reiniciar.
- [x] El encuadre y el zoom de la portada persisten y se aplican de forma uniforme.
- [x] Se puede iniciar, finalizar y registrar una partida histórica.
- [x] Una partida cerrada puede quedar marcada como no terminada sin aparentar una finalización del videojuego.
- [x] Rejugar crea una partida nueva sin alterar las anteriores.
- [x] La tarjeta muestra Inicio y Fin de la última partida en dos columnas con el patrón tipográfico compartido.
- [x] El historial permite corregir y eliminar partidas de forma segura.
- [x] Biblioteca, Jugando, filtros, favoritos y ordenación funcionan conjuntamente.
- [x] Las estadísticas se calculan en Rust a partir de datos persistidos.
