# Especificación — Estadísticas MEDIA

- Estado: Versión 1.0 implementada; revisión visual pendiente
- Ámbito: Anime, Lectura, Videojuegos, Películas y Series

## Objetivo

Ofrecer una lectura profunda y coherente de cada biblioteca sin mezclar escalas incompatibles. Cada módulo conserva sus datos y vocabulario, pero comparte navegación, filtros, rankings y representaciones.

## Navegación

Las estadísticas se abren siempre en `Resumen` y contienen cinco subvistas:

1. `Resumen`.
2. `Rankings`.
3. `Explorar`.
4. `Evolución`.
5. `Calendario`.

Los filtros se conservan localmente por módulo. La subvista activa no se conserva.

## Capacidades aprobadas

- Rankings compactos Top 5, 10, 15, 25 o todas las obras.
- Mejor y peor puntuación, favoritas, más repetidas y más sesiones.
- Las obras sin puntuar se excluyen de rankings de nota y se informa de cuántas quedan fuera.
- El aviso de obras sin puntuar permite abrir la Biblioteca con ese filtro ya aplicado.
- Los empates se desempatan por favorito, sesiones y título.
- Filtros por género, estado, puntuación y tipo de sesión.
- Exploración por género, estado y año de inicio o finalización.
- Una obra con varios géneros cuenta una vez en cada género.
- El calendario distingue inicios, finalizaciones y actividades puntuales; el detalle diario identifica las obras implicadas.
- Lectura permite alternar entre actividad exacta, periodos estimados y una representación híbrida. Los días intermedios nunca se presentan como lectura diaria confirmada.
- Un género necesita tres obras para considerarse representativo; con menos se muestra una advertencia.
- Comparación de años, intervalo desde/hasta, meses sin actividad y evolución de puntuación.
- Calendario anual con intensidad según actividad registrada.
- Sesiones abiertas, terminadas y cerradas sin completar.
- Anime separa `Anime`, `Películas` y `Contenidos`; los omitidos no cuentan.
- Lectura, Videojuegos, Películas y Series contabilizan primeras sesiones y repeticiones por separado.

## Trabajo futuro

- Resumen global de todo MEDIA estilo Wrapped.
- Exportación visual de estadísticas.
- Comparador global entre módulos.
