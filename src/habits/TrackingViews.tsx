import {
  Archive,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  MoreHorizontal,
  Pencil,
  Star,
} from "lucide-react";
import type {
  HabitLogState,
  HabitOverview,
  HabitOverviewCell,
  HabitOverviewRow,
} from "./api";
import {
  between,
  categoryLabel,
  completionText,
  dayNumber,
  formatLongDate,
  formatMonth,
  formatShortDate,
  iconById,
  isFlexible,
  progressPeriodLabel,
  sameMonth,
  scheduleLabel,
  weekdayShort,
} from "./presentation";

type SetLog = (
  id: string,
  cell: HabitOverviewCell,
  state: HabitLogState | null,
) => void;

export function DayView({
  edit,
  overview,
  setLog,
}: {
  edit: (habit: HabitOverviewRow["habit"]) => void;
  overview: HabitOverview;
  setLog: SetLog;
}) {
  const habits = overview.rows.filter((row) => row.habit.kind === "habit");
  const routines = overview.rows.filter((row) => row.habit.kind === "routine");
  return (
    <div className="habit-day-view">
      <div className="habit-view-heading">
        <div>
          <p className="section-kicker">TU DÍA</p>
          <h2>Hoy</h2>
          <p>{formatLongDate(overview.start)}</p>
        </div>
        <span>
          {
            overview.rows.filter((row) => row.cells[0]?.state === "completed")
              .length
          }{" "}
          de {overview.rows.length} completadas
        </span>
      </div>
      {overview.rows.length === 0 ? (
        <HabitsEmpty />
      ) : (
        <div className="habit-today-columns">
          <DayColumn
            emptyText="No tienes hábitos pendientes."
            edit={edit}
            label="Hábitos"
            rows={habits}
            setLog={setLog}
          />
          <DayColumn
            emptyText="No tienes tareas recurrentes pendientes."
            edit={edit}
            label="Tareas recurrentes"
            rows={routines}
            setLog={setLog}
          />
        </div>
      )}
    </div>
  );
}

function DayColumn({
  label,
  emptyText,
  edit,
  rows,
  setLog,
}: {
  label: string;
  emptyText: string;
  edit: (habit: HabitOverviewRow["habit"]) => void;
  rows: HabitOverviewRow[];
  setLog: SetLog;
}) {
  const completed = rows.filter(
    (row) => row.cells[0]?.state === "completed",
  ).length;
  return (
    <section className="habit-day-column">
      <div className="habit-day-column-heading">
        <h3>{label}</h3>
        <span title={`${completed} de ${rows.length} completadas`}>
          {completed} de {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="habit-day-column-empty">{emptyText}</p>
      ) : (
        <div className="habit-today-list">
          {rows.map((row) => {
            const cell = row.cells[0];
            const Icon = iconById[row.habit.icon];
            const complete = cell.state === "completed";
            const skipped = cell.state === "skipped";
            return (
              <article
                className={`habit-today-row ${complete ? "completed" : ""} ${skipped ? "skipped" : ""}`}
                key={row.habit.id}
              >
                <button
                  aria-label={
                    complete
                      ? `Desmarcar ${row.habit.name}`
                      : `Completar ${row.habit.name}`
                  }
                  className="habit-check"
                  disabled={!cell.canEdit}
                  onClick={() =>
                    setLog(row.habit.id, cell, complete ? null : "completed")
                  }
                  type="button"
                >
                  {complete && <Check size={17} />}
                </button>
                <div className="habit-row-icon">
                  <Icon size={19} />
                </div>
                <div className="habit-row-copy">
                  <strong>{row.habit.name}</strong>
                  <span>
                    {categoryLabel[row.habit.category]}{" "}
                    <i>({scheduleLabel(row.habit.schedule)})</i>
                  </span>
                </div>
                <div className="habit-day-meta">
                  {(isFlexible(row.habit.schedule) ||
                    row.habit.kind === "routine") && (
                    <>
                      {isFlexible(row.habit.schedule) && (
                        <strong>
                          {row.progress.completed} de{" "}
                          {row.progress.effectiveTarget}{" "}
                          <span>
                            (
                            {progressPeriodLabel(row.habit.schedule)}
                            )
                          </span>
                        </strong>
                      )}
                    </>
                  )}
                </div>
                <div className="habit-row-actions">
                  <button
                    aria-label={`Editar ${row.habit.name}`}
                    className="habit-edit-action"
                    onClick={() => edit(row.habit)}
                    title="Editar actividad"
                    type="button"
                  >
                    <Pencil size={16} />
                  </button>
                  {cell.canEdit && (
                    <button
                      aria-label={
                        skipped
                          ? `Volver ${row.habit.name} a pendiente`
                          : `Omitir ${row.habit.name} hoy`
                      }
                      className="habit-skip-action"
                      onClick={() =>
                        setLog(row.habit.id, cell, skipped ? null : "skipped")
                      }
                      title={skipped ? "Volver a pendiente" : "Omitir hoy"}
                      type="button"
                    >
                      <CircleMinus size={17} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function WeekView({
  overview,
  busy,
  move,
  setToday,
  setLog,
}: {
  overview: HabitOverview;
  busy: boolean;
  move: (days: number) => void;
  setToday: () => void;
  setLog: SetLog;
}) {
  const isPastWeek = overview.end < overview.today;
  return (
    <div className="habit-period-view">
      <PeriodNavigation
        kicker="SEMANA"
        title={`${formatShortDate(overview.start)} – ${formatShortDate(overview.end)}`}
        back={() => move(-7)}
        next={() => move(7)}
        today={setToday}
        isCurrent={between(overview.today, overview.start, overview.end)}
      />
      {isPastWeek && (
        <div className="habit-history-warning" role="status">
          Estás viendo y editando una semana pasada. Los cambios actualizarán
          sus estadísticas.
        </div>
      )}
      {overview.rows.length === 0 ? (
        <HabitsEmpty />
      ) : (
        <div className="habit-week-card">
          <div className="habit-week-grid habit-week-header">
            <span>Actividad</span>
            {overview.rows[0]?.cells.map((cell) => (
              <span
                className={cell.date === overview.today ? "today" : ""}
                key={cell.date}
              >
                <small>{weekdayShort(cell.date)}</small>
                <strong>{dayNumber(cell.date)}</strong>
              </span>
            ))}
            <span>Progreso</span>
          </div>
          {overview.rows.map((row) => {
            const Icon = iconById[row.habit.icon];
            return (
              <div
                className="habit-week-grid habit-week-row"
                key={row.habit.id}
              >
                <div className="habit-week-name">
                  <Icon size={17} />
                  <span>
                    <strong>{row.habit.name}</strong>
                    <small>{scheduleLabel(row.habit.schedule)}</small>
                  </span>
                </div>
                {row.cells.map((cell) => (
                  <HabitWeekCell
                    key={cell.date}
                    cell={cell}
                    disabled={busy}
                    change={(state) => setLog(row.habit.id, cell, state)}
                  />
                ))}
                <div className="habit-week-progress">
                  <strong>
                    {row.progress.completed}/{row.progress.effectiveTarget}
                  </strong>
                  <span>
                    {row.progress.neutral
                      ? "Omitida"
                      : completionText(
                          row.progress.completed,
                          row.progress.effectiveTarget,
                        )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="habit-week-help">
        Pulsa una celda para completar. El icono secundario permite omitir una
        ocasión sin romper la racha. La estrella señala un día orientativo.
      </p>
    </div>
  );
}

function HabitWeekCell({
  cell,
  disabled,
  change,
}: {
  cell: HabitOverviewCell;
  disabled: boolean;
  change: (state: HabitLogState | null) => void;
}) {
  if (!cell.applicable) return <div className="habit-week-cell unavailable" />;
  const complete = cell.state === "completed";
  const skipped = cell.state === "skipped";
  return (
    <div
      className={`habit-week-cell ${cell.preferred ? "preferred" : ""} ${complete ? "completed" : ""} ${skipped ? "skipped" : ""}`}
    >
      {cell.preferred && (
        <Star
          aria-label="Día orientativo"
          className="habit-preferred-marker"
          size={10}
        />
      )}
      <button
        aria-label={complete ? "Desmarcar" : "Completar"}
        className="habit-week-check"
        disabled={!cell.canEdit || disabled}
        onClick={() => change(complete ? null : "completed")}
        type="button"
      >
        {complete && <Check size={15} />}
      </button>
      {cell.canEdit && (
        <button
          aria-label={skipped ? "Deshacer omisión" : "Omitir"}
          className="habit-cell-skip"
          disabled={disabled}
          onClick={() => change(skipped ? null : "skipped")}
          type="button"
        >
          <CircleMinus size={13} />
        </button>
      )}
    </div>
  );
}

export function MonthView({
  overview,
  anchor,
  move,
  setToday,
}: {
  overview: HabitOverview;
  anchor: string;
  move: (months: number) => void;
  setToday: () => void;
}) {
  return (
    <div className="habit-period-view">
      <PeriodNavigation
        kicker="MES"
        title={formatMonth(anchor)}
        back={() => move(-1)}
        next={() => move(1)}
        today={setToday}
        isCurrent={sameMonth(anchor, overview.today)}
      />
      {overview.rows.length === 0 ? (
        <HabitsEmpty />
      ) : (
        <div className="habit-month-grid">
          {overview.rows.map((row) => {
            const Icon = iconById[row.habit.icon];
            const percentage = row.progress.effectiveTarget
              ? Math.min(
                  100,
                  (row.progress.completed * 100) / row.progress.effectiveTarget,
                )
              : 0;
            return (
              <article className="habit-month-card" key={row.habit.id}>
                <div className="habit-month-title">
                  <div className="habit-row-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <strong>{row.habit.name}</strong>
                    <span>{scheduleLabel(row.habit.schedule)}</span>
                  </div>
                  <b>
                    {row.progress.completed}/{row.progress.effectiveTarget}
                  </b>
                </div>
                <div className="habit-progress-track">
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <div className="habit-month-meta">
                  <span>
                    {row.habit.kind === "routine"
                      ? `Próxima: ${row.nextDueOn ? formatShortDate(row.nextDueOn) : "sin pendiente"}`
                      : completionText(
                          row.progress.completed,
                          row.progress.effectiveTarget,
                        )}
                  </span>
                  <strong>{Math.round(percentage)}%</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PeriodNavigation({
  kicker,
  title,
  back,
  next,
  today,
  isCurrent,
}: {
  kicker: string;
  title: string;
  back: () => void;
  next: () => void;
  today: () => void;
  isCurrent: boolean;
}) {
  return (
    <div className="habit-period-navigation">
      <button aria-label="Periodo anterior" onClick={back} type="button">
        <ChevronLeft size={18} />
      </button>
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <button aria-label="Periodo siguiente" onClick={next} type="button">
        <ChevronRight size={18} />
      </button>
      {!isCurrent && (
        <button className="today-button" onClick={today} type="button">
          Actual
        </button>
      )}
    </div>
  );
}

export function HabitsEmpty({
  loading = false,
  archived = false,
}: {
  loading?: boolean;
  archived?: boolean;
}) {
  return (
    <div className="habits-empty">
      <div>
        {loading ? (
          <MoreHorizontal className="habit-loading" />
        ) : archived ? (
          <Archive />
        ) : (
          <CheckCircle2 />
        )}
      </div>
      <h3>
        {loading
          ? "Preparando tus hábitos…"
          : archived
            ? "El archivo está vacío"
            : "Nada pendiente aquí"}
      </h3>
      <p>
        {loading
          ? "Calculando periodos y progreso."
          : archived
            ? "Las actividades archivadas aparecerán en esta sección."
            : "Cuando crees actividades, NubeOS colocará cada una en su momento."}
      </p>
    </div>
  );
}
