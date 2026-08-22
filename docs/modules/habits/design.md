# Diseño — Hábitos y rutinas

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-08-22

## Alcance del diseño

Este diseño cubre el primer vertical completo definido en la spec. Aplica ADR-001 a ADR-005 y no introduce una decisión arquitectónica transversal nueva. Las reglas de calendario, rachas y presentación de hábitos frente a rutinas pertenecen únicamente a este módulo.

## Entidades

### Activity

Representa la identidad estable de una actividad:

- `ActivityId`: UUID validado.
- `name`: nombre visible no vacío.
- `kind`: `habit` o `routine`.
- `category`: conjunto cerrado aprobado.
- `icon`: identificador de un conjunto cerrado que React traduce a Lucide.
- `status`: `active`, `paused` o `archived`.
- `position`: orden manual dentro del catálogo.
- `starts_on`: lunes de la semana de creación y primera fecha civil que puede generar una obligación.
- fechas de creación y actualización.

El tipo modifica la prioridad visual y las métricas destacadas, pero no crea dos motores de recurrencia.

### ScheduleRevision

Describe una frecuencia válida desde una fecha civil:

- `daily`.
- `specificWeekdays`, con uno o más días estrictos.
- `weeklyTarget`, con objetivo y días habituales opcionales.
- `monthlyTarget`, con objetivo y una colección ordenada de días orientativos opcionales.

Cada edición de frecuencia crea una revisión con `effective_from`. Al resolver una fecha se elige la revisión más reciente aplicable. Los periodos finalizados anteriores a la revisión conservan su interpretación; el periodo que contiene la fecha de cambio puede recalcularse.

### ActivityLog

Registro único por actividad y fecha:

- `completed`.
- `skipped`.

La ausencia de fila significa pendiente cuando la frecuencia y el estado hacen aplicable esa fecha. Cambiar estado sustituye la fila y desmarcar la elimina.

### PauseInterval

Intervalo con inicio inclusivo y final exclusivo. Una pausa abierta no tiene final. Los días pausados no generan objetivos ni afectan estadísticas. Archivar abre o conserva una pausa; restaurar cierra la interrupción desde el día actual.

## Servicios de dominio

### ScheduleEvaluator

Recibe actividad, revisiones, pausas, registros y fecha de referencia. Decide:

- si una fecha es estrictamente aplicable;
- si pertenece a un objetivo flexible vigente;
- objetivo nominal y efectivo del periodo;
- progreso, estado pendiente y próxima fecha;
- oportunidades incluidas en porcentajes;
- racha actual y mejor racha.

Los objetivos semanales usan semanas de lunes a domingo. Los mensuales usan meses naturales. Una omisión estricta retira esa oportunidad del denominador. En objetivos flexibles, cada omisión reduce el objetivo efectivo en una unidad; un objetivo efectivo cero vuelve neutral el periodo.

### StatisticsCalculator

Calcula datos por actividad dentro de un `StatisticsWindow` validado y un resumen global. La ventana puede representar la semana, mes o año actual, todo el historial o un intervalo personalizado. Nunca empieza antes de `starts_on` ni termina después del día actual de Madrid. La comparación usa tasa de cumplimiento y exige una muestra mínima. No persiste agregados: SQLite guarda hechos y Rust deriva estadísticas para evitar desincronización.

## Persistencia SQLite

La migración del módulo crea tablas propias:

- `habits`: identidad, clasificación, estado y orden.
- `habit_schedule_revisions`: revisiones fechadas y parámetros.
- `habit_schedule_weekdays`: días concretos o habituales de una revisión.
- `habit_schedule_month_days`: días orientativos de un objetivo mensual.
- `habit_logs`: estado binario por actividad y fecha.
- `habit_pause_intervals`: pausas históricas.

La segunda migración de Hábitos añade `starts_on`, inicializándolo con la fecha de creación de cada actividad existente, y transforma el antiguo día mensual único en una fila de `habit_schedule_month_days`. Las claves foráneas usan cascada solo para el borrado definitivo aprobado. Archivar nunca elimina filas. Fechas civiles se guardan como `YYYY-MM-DD`; timestamps técnicos, como UTC RFC 3339.

El repositorio del módulo no consulta tablas de Comidas ni Documentos. Comparte únicamente la conexión SQLite gestionada por la infraestructura existente.

## Casos de uso y comandos Tauri

Los comandos son adaptadores pequeños:

| Comando                           | Entrada                                     | Salida                                  |
| --------------------------------- | ------------------------------------------- | --------------------------------------- |
| `list_habits`                     | estado y filtros opcionales                 | actividades con frecuencia actual       |
| `create_habit`                    | formulario de actividad                     | actividad creada                        |
| `update_habit`                    | identificador y formulario                  | actividad actualizada                   |
| `set_habit_log`                   | identificador, fecha y estado opcional      | sin contenido                           |
| `pause_habit` / `resume_habit`    | identificador                               | sin contenido                           |
| `archive_habit` / `restore_habit` | identificador                               | sin contenido                           |
| `delete_habit`                    | identificador archivado                     | sin contenido                           |
| `reorder_habits`                  | identificadores activos ordenados           | sin contenido                           |
| `get_habits_overview`             | vista y fecha de referencia                 | filas y resumen ya calculados           |
| `get_habit_statistics`            | periodo predefinido o fechas personalizadas | métricas por actividad y resumen global |

Las entradas usan `camelCase`, identificadores y fechas, nunca SQL. Los comandos toman el día actual de `MadridClock` para impedir escritura futura y no confían en el reloj de React para reglas.

## Contratos de presentación

`HabitDto` contiene identidad, clasificación, estado, posición, fecha de inicio y `ScheduleDto` discriminado.

`OverviewDto` contiene el intervalo solicitado, la fecha local actual, filas de actividad, celdas por fecha con aplicabilidad y estado, progreso nominal y efectivo, última realización y próxima fecha cuando proceda.

`HabitStatisticsDto` contiene completadas, oportunidades efectivas, porcentaje, racha actual, mejor racha, progreso vigente y límites efectivos de la consulta. React selecciona el filtro y formatea fechas y porcentajes, pero no resuelve el intervalo ni vuelve a calcular métricas.

## Interfaz React

El módulo vive en `src/habits/` y se carga de forma diferida desde `App.tsx`.

Vistas:

1. **Hoy:** dos columnas adaptables para hábitos y tareas recurrentes. Checkbox de un clic y acción secundaria `CircleMinus` para omitir; editar y omitir aparecen mediante puntero o foco para reducir ruido y permanecen visibles en dispositivos sin `hover`.
2. **Semana:** matriz compacta de actividades y siete fechas, con progreso al final, navegación semanal y aviso al editar una semana anterior. La estrella es el único distintivo de un día orientativo: su checkbox conserva exactamente el mismo estado pendiente y completado que el resto.
3. **Mes:** progreso agregado y tareas mensuales del mes seleccionado.
4. **Estadísticas:** resumen global, tarjetas comparables por porcentaje y filtros de periodo.
5. **Catálogo:** búsqueda, filtros alineados, creación, edición, pausa, archivo y orden por arrastre. Sus acciones secundarias siguen el mismo patrón de aparición por puntero o foco.

Crear y editar usan `Modal`; los selectores usan `SelectControl`; Archivo reutiliza la etiqueta y jerarquía visual común. El formulario no expone la fecha de inicio: el comando de creación utiliza el lunes de la semana actual. También representa «todos excepto» mediante la selección semanal existente y administra los días orientativos mensuales sin desplegar un número variable de campos. Los formularios no aparecen debajo de la colección.

## Flujo de actualización

1. React solicita una vista con fecha ISO.
2. El comando valida la fecha y obtiene el día de Madrid.
3. El repositorio carga actividades, revisiones, pausas y registros necesarios.
4. Rust evalúa frecuencia, progreso y métricas.
5. React representa el DTO.
6. Al marcar, omitir o corregir, React invoca `set_habit_log` y refresca silenciosamente la vista y las estadísticas.

Las solicitudes de filtros conservan el resultado previo y descartan respuestas obsoletas, siguiendo el patrón corregido en Documentos.

## Errores y seguridad

- Identificador, fecha, frecuencia, días y objetivos inválidos producen mensajes recuperables.
- Crear fija internamente `starts_on` al lunes de la semana actual; actualizar conserva siempre ese valor.
- El intervalo estadístico personalizado exige `desde <= hasta` y se recorta al día actual.
- Modificar el futuro se rechaza en Rust.
- Solo una actividad archivada puede eliminarse definitivamente.
- Reordenar exige exactamente el conjunto de actividades activas para no perder posiciones bajo filtros.
- No se registran nombres de hábitos ni contenido personal en logs técnicos.

## Pruebas

- Unitarias Rust para frecuencias, límites, omisiones, pausas, periodos y rachas.
- Unitarias Rust para fecha de inicio, desbloqueo mensual por hitos y ventanas estadísticas.
- SQLite temporal para migración, conversión del día mensual anterior, revisiones, registros, archivo y reapertura.
- Comandos con fecha fija para impedir futuro y comprobar contratos.
- Build TypeScript y comprobación manual de modales, arrastre, navegación y actualización reactiva.

## Decisiones aplazadas

- Recordatorios y programación horaria.
- Exportación o sincronización.
- Cantidades, notas y varias realizaciones diarias.
- Pausas con fecha final.
- Pruebas end-to-end de interfaz.
