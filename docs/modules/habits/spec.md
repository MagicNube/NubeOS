# Spec — Hábitos y rutinas

- Estado: Aprobado por Nube (módulo cerrado)
- Última actualización: 2026-08-22

## Objetivo

Permitir que el propietario de NubeOS organice hábitos y tareas recurrentes con el mínimo de fricción, vea qué le corresponde hoy o durante el periodo actual y conserve un historial local que muestre su constancia real.

El módulo debe cubrir tanto hábitos orientados a constancia —leer, estudiar japonés o entrenar— como mantenimiento recurrente —cargar dispositivos, poner lavadoras o cambiar sábanas— sin obligar a representar ambos con métricas o mensajes idénticos.

## Vocabulario

- **Actividad:** término común para un hábito o una tarea recurrente.
- **Hábito:** actividad orientada a construir constancia. Destaca progreso, porcentaje y rachas.
- **Tarea recurrente:** mantenimiento que reaparece en cada periodo. Destaca si está pendiente, la última realización y cuándo vuelve a tocar.
- **Realización:** marca binaria que indica que una actividad se completó una fecha concreta. Una actividad solo admite una realización por día.
- **Omisión:** fecha aplicable que no cuenta como completada ni rompe la racha. Reduce en una unidad el objetivo flexible del periodo cuando corresponda.
- **Día habitual:** orientación para un objetivo semanal flexible. Prioriza la actividad, pero no limita en qué día puede completarse.
- **Día orientativo:** hito visual de un objetivo mensual. Indica cuándo pasa a estar pendiente una parte del objetivo, pero no impide completarla antes.
- **Fecha de inicio:** primer día desde el que una actividad genera obligaciones y participa en las estadísticas.
- **Periodo:** día, semana de lunes a domingo o mes natural, según la frecuencia.

## Funcionalidades

### Catálogo de actividades

- Crear y editar una actividad con nombre, tipo, categoría, icono y frecuencia.
- Categorías iniciales: Salud, Deporte, Aprendizaje, Cuidado personal, Hogar, Organización, Ocio y Otros.
- Elegir un icono de un conjunto cerrado incluido en NubeOS, con opciones específicas para mochila, planificación semanal, cuidado personal, lavadora, cama, ropa, máquina de afeitar, sábanas, toallas y ducha.
- Reordenar manualmente las actividades activas mediante arrastre.
- Pausar y reanudar una actividad. Una pausa empieza el día local actual y dura hasta que se reanuda manualmente.
- Archivar, restaurar y eliminar definitivamente desde Archivo con confirmación.
- Buscar por nombre y filtrar por categoría o tipo.

### Frecuencias

- **Todos los días:** genera una oportunidad diaria.
- **Días de la semana:** genera oportunidades únicamente los días seleccionados. Son estrictos; una marca en otro día no sustituye una oportunidad. Esta opción también representa reglas como «todos los días excepto el domingo».
- **X veces por semana:** permite completar cualquier día de la semana. Puede definir días habituales para priorizar su presentación.
- **X veces al mes:** permite completar cualquier día del mes y admite hasta tantos días orientativos diferentes como realizaciones tenga el objetivo.
- Si un objetivo mensual tiene varios días orientativos, cada día alcanzado hace exigible una realización adicional; el último día configurado hace exigible cualquier parte restante del objetivo.
- Toda actividad nueva empieza automáticamente el lunes de la semana en la que se crea, aunque se añada entre semana o en domingo.
- Los días anteriores a la creación quedan disponibles para corregirse u omitirse manualmente.
- La semana empieza el lunes y termina el domingo.
- Una tarea no completada no se arrastra al periodo siguiente.
- No se pueden registrar realizaciones ni omisiones en fechas futuras.
- Una realización pertenece siempre al periodo de su fecha; no completa anticipadamente el periodo siguiente.

### Seguimiento cotidiano

- Mostrar vistas Hoy, Semana y Mes.
- Hoy separa visualmente hábitos y tareas recurrentes en dos columnas cuando existe espacio suficiente.
- Hoy permite completar o desmarcar con un solo clic y omitir mediante una acción secundaria con icono. El estado omitido se expresa mediante el tratamiento visual de esa acción, no con una raya dentro de la casilla.
- Semana muestra cada actividad, sus siete días y el progreso del periodo; permite corregir hoy y fechas pasadas. Una semana anterior muestra un aviso antes de su matriz.
- Mes resume objetivos, cumplimiento y tareas mensuales pendientes.
- Los objetivos semanales flexibles pueden completarse en un día distinto a sus días habituales sin penalización. Sus días habituales se indican con una estrella explicada mediante texto accesible.
- Omitir una oportunidad estricta la vuelve neutral para cumplimiento y racha.
- Omitir una ocasión de un objetivo flexible reduce su objetivo efectivo en una unidad, sin bajar de cero.
- Una fecha completada, omitida o pendiente puede corregirse mientras no sea futura.

### Pausa y archivo

- Los días incluidos en una pausa no generan obligaciones, no reducen el porcentaje y no rompen rachas.
- Reanudar no rellena retroactivamente los días pausados.
- Archivar detiene nuevas obligaciones y conserva todo el historial.
- Restaurar reactiva la actividad desde el día actual.
- El borrado definitivo elimina la actividad, su configuración y su historial, y solo está disponible desde Archivo.

### Historial y estadísticas

- Mostrar por actividad realizaciones, omisiones y periodos cumplidos.
- Calcular porcentaje de cumplimiento excluyendo oportunidades omitidas o pausadas.
- Calcular racha actual y mejor racha en la unidad natural de la frecuencia: días para frecuencias diarias o estrictas, semanas para objetivos semanales y meses para objetivos mensuales.
- Mostrar progreso del periodo actual, última realización y próxima fecha relevante para tareas recurrentes.
- Comparar actividades mediante porcentaje, no por número bruto, para no favorecer automáticamente a las diarias.
- Filtrar las estadísticas por esta semana, este mes, este año, todo el historial o un intervalo personalizado con fechas desde y hasta.
- Destacar mayor consistencia y actividad que necesita atención solo cuando exista una muestra mínima de siete oportunidades o tres periodos.
- Los cambios históricos actualizan inmediatamente las métricas derivadas.

## Reglas y casos límite

- El nombre, tipo, categoría, icono y frecuencia se validan en Rust.
- Un objetivo semanal está entre 1 y 7. Sus días habituales son opcionales y no pueden repetirse.
- Un objetivo mensual está entre 1 y 31. Sus días orientativos están entre 1 y 28, no se repiten y su cantidad no supera el objetivo.
- Días de la semana exige al menos un día seleccionado.
- Completar una fecha omitida sustituye la omisión; omitir una completada sustituye la realización; desmarcar elimina ambos estados.
- Para un objetivo flexible nunca cuentan más realizaciones que su objetivo efectivo al decidir si el periodo está cumplido, aunque el historial conserva todas las fechas marcadas.
- Si todas las oportunidades de un periodo se omiten, el periodo es neutral y no aumenta ni rompe la racha.
- La fecha civil y los cambios de periodo se calculan con la zona `Europe/Madrid`.
- La fecha de inicio no se solicita en el formulario: Rust la fija en el lunes de la semana actual y React no puede alterarla.
- Editar nombre, categoría o icono no altera el historial.
- Una modificación de frecuencia se aplica desde el día local de la edición. Los periodos ya finalizados conservan la frecuencia anterior; el periodo actual puede recalcularse.
- La interfaz puede anticipar validaciones, pero Rust es la autoridad de reglas, estados y métricas.

## Fuera de alcance

- Cantidades, temporizadores, notas, diarios, fotografías o múltiples realizaciones diarias.
- Hábitos negativos, límites máximos o contadores de consumo.
- Recordatorios, notificaciones de Windows y horas concretas.
- Fechas de fin, pausas programadas o repetición cada N días.
- Integración con calendarios, móviles, sensores o servicios externos.
- Gamificación, frases motivadoras, puntuaciones diarias o funciones sociales.
- Personalización libre de colores e iconos externos.
- Copias, exportación, sincronización o cuentas remotas.

## Criterios de aceptación

- [x] Se puede crear cada una de las cuatro frecuencias y reaparece tras reiniciar la aplicación.
- [x] Un hábito diario se completa y desmarca desde Hoy con un clic.
- [x] Un objetivo de cuatro veces por semana se puede completar en días distintos a los habituales y muestra `4 de 4`.
- [x] Omitir una ocasión de ese objetivo lo convierte en `3 de 3` y mantiene neutral la racha.
- [x] Los días concretos no se sustituyen con realizaciones fuera de esos días.
- [x] Semana permite corregir realizaciones y omisiones de fechas pasadas y nunca del futuro.
- [x] Una tarea mensual aparece en Hoy desde su día orientativo y deja de estar pendiente al completarla.
- [x] Un objetivo mensual de dos veces puede usar dos días orientativos y completarse anticipadamente.
- [x] Una actividad creada entre semana empieza el lunes de esa misma semana y permite omitir manualmente los días anteriores.
- [x] Hoy separa hábitos y tareas recurrentes en escritorio y vuelve a una columna en anchuras reducidas.
- [x] Al consultar una semana anterior se avisa de que las modificaciones actualizarán sus estadísticas.
- [x] La omisión usa una acción secundaria reconocible y un estado visual diferenciado sin alterar el comportamiento del checkbox.
- [x] Las estadísticas cambian al seleccionar semana, mes, año, historial o un intervalo personalizado.
- [x] Pausar excluye los días correspondientes y reanudar no altera el pasado.
- [x] Las estadísticas actualizan porcentaje, rachas y progreso tras cada cambio.
- [x] Archivar conserva el historial; restaurar reactiva; eliminar definitivamente exige confirmación.
- [x] Todo el módulo funciona sin red y React no calcula reglas de cumplimiento.
