# Diseño — Videojuegos

- Estado: Aprobado por Nube; implementado
- Última actualización: 2026-08-24

## Modelo

```text
Game
├── id: GameId
├── name: String
├── status: GameStatus
├── score: Option<f64>
├── opinion: Option<String>
├── favorite: bool
├── cover: Option<ManagedGameCover>
├── cover_position_x: f64
├── cover_position_y: f64
├── cover_zoom: f64
├── archived: bool
├── created_at: DateTime
└── updated_at: DateTime

GameRun
├── id: GameRunId
├── game_id: GameId
├── started_on: Option<NaiveDate>
├── finished_on: Option<NaiveDate>
└── created_at: DateTime
```

`GameStatus` contiene `pending`, `playing`, `paused`, `completed` y `abandoned`. `GameRun` representa una partida completa o en curso, no una sesión diaria.

## Invariantes

- Rust valida nombre, puntuación, fechas y el máximo de una partida abierta.
- Una partida debe tener al menos una fecha.
- `started_on <= finished_on` cuando ambas existen.
- Iniciar y finalizar partidas actualiza estado e historial en una misma transacción.
- Las estadísticas y el número de rejugadas se calculan desde `game_runs`.

## Persistencia

- `games` guarda metadatos y referencias de portada.
- `game_runs` pertenece exclusivamente a Videojuegos y usa borrado en cascada al eliminar definitivamente el título.
- Un índice parcial impide más de una partida sin finalizar por videojuego.
- Las portadas viven en `<app-data>/games/covers`; SQLite conserva únicamente sus metadatos.
- El módulo no comparte tablas con Lectura ni Media aunque sus recorridos sean conceptualmente parecidos.

## Contratos Tauri propuestos

- `list_games(input) -> Vec<GameDto>`
- `get_game(game_id) -> GameDetailDto`
- `create_game(input) -> GameDto`
- `update_game(game_id, input) -> GameDto`
- `set_game_favorite(game_id, favorite) -> GameDto`
- `archive_game(game_id) -> ()`
- `restore_game(game_id) -> ()`
- `delete_game(game_id) -> ()`
- `start_game_run(game_id, started_on) -> GameDetailDto`
- `finish_game_run(run_id, finished_on) -> GameDetailDto`
- `create_game_run(game_id, input) -> GameDetailDto`
- `update_game_run(run_id, input) -> GameDetailDto`
- `delete_game_run(run_id) -> GameDetailDto`
- `list_game_history(input) -> Vec<GameHistoryEntryDto>`
- `get_game_statistics() -> GameStatisticsDto`
- `select_game_cover() -> Option<PendingGameCoverDto>`
- `discard_pending_game_cover(token) -> ()`
- `read_game_cover(game_id) -> bytes`

Los comandos adaptan DTOs y delegan en dominio y repositorio. React no calcula estados derivados ni modifica SQLite.

## Interfaz

- Entrada independiente `Videojuegos` en la barra lateral.
- Pestañas Biblioteca, Jugando, Historial y Estadísticas.
- Biblioteca usa tarjetas con portada, estado, nombre, puntuación y número de partidas terminadas.
- El detalle usa las subvistas compartidas `Resumen` e `Historial`. Resumen muestra, en este orden, puntuación, número de partidas y estado; Historial contiene la partida actual, partidas anteriores y sus acciones.
- La portada usa un marco horizontal estándar con `object-fit: contain` tanto en Biblioteca como en el detalle, porque las imágenes habituales de videojuegos son apaisadas o carátulas cuya ilustración no debe recortarse.
- `Nueva partida` y `Finalizar partida` son las acciones principales del seguimiento.
- Historial permite filtrar por año y videojuego, editar fechas y retirar una entrada con confirmación.
- Formularios, favoritos, puntuaciones, Archivo, buscadores y selectores reutilizan los componentes visuales comunes.

## Flujo de datos

1. React solicita una acción mediante un comando pequeño.
2. Rust carga el videojuego y sus partidas.
3. El dominio valida la transición y las fechas.
4. El repositorio persiste la operación dentro de una transacción.
5. React recibe el detalle actualizado y refresca la vista afectada.

## Decisiones aplazadas

- Plataformas y ediciones.
- DLC y relaciones entre videojuegos.
- Progreso porcentual, horas y sesiones.
- Importaciones o integraciones externas.
## Encuadre de portada

La portada horizontal conserva posición X/Y y zoom entre `1×` y `2×`. Rust valida y guarda esos valores; React utiliza el editor compartido y aplica el mismo encuadre en Biblioteca y detalle. Sustituir o retirar la imagen restablece los valores centrales.
