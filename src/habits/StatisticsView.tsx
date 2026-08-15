import SelectControl from "../ui/SelectControl";
import type {
  HabitStatistic,
  HabitStatisticsOverview,
  HabitStatisticsPeriod,
} from "./api";
import {
  formatShortDate,
  iconById,
  scheduleLabel,
  streakUnit,
  todayIso,
} from "./presentation";
import { HabitsEmpty } from "./TrackingViews";

export default function StatisticsView({
  statistics,
  period,
  setPeriod,
  from,
  setFrom,
  to,
  setTo,
}: {
  statistics: HabitStatisticsOverview;
  period: HabitStatisticsPeriod;
  setPeriod: (value: HabitStatisticsPeriod) => void;
  from: string;
  setFrom: (value: string) => void;
  to: string;
  setTo: (value: string) => void;
}) {
  return (
    <div className="habit-statistics">
      <div className="habit-stat-filters">
        <div>
          <p className="section-kicker">PERIODO ANALIZADO</p>
          <strong>
            {formatShortDate(statistics.rangeStart)} –{" "}
            {formatShortDate(statistics.rangeEnd)}
          </strong>
        </div>
        <SelectControl>
          <select
            aria-label="Periodo de estadísticas"
            onChange={(event) =>
              setPeriod(event.target.value as HabitStatisticsPeriod)
            }
            value={period}
          >
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
            <option value="all">Todo el historial</option>
            <option value="custom">Personalizado</option>
          </select>
        </SelectControl>
        {period === "custom" && (
          <div className="habit-stat-custom-dates">
            <label>
              Desde
              <input
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                type="date"
                value={from}
              />
            </label>
            <label>
              Hasta
              <input
                max={todayIso()}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                type="date"
                value={to}
              />
            </label>
          </div>
        )}
      </div>
      <div className="habit-stats-summary">
        <div>
          <p className="section-kicker">CONSISTENCIA</p>
          <h2>{Math.round(statistics.averageCompletionRate)}%</h2>
          <span>Cumplimiento medio</span>
        </div>
        <div>
          <span>Mayor consistencia</span>
          <strong>
            {statName(statistics, statistics.mostConsistentId) ??
              "Aún sin datos"}
          </strong>
        </div>
        <div>
          <span>Necesita atención</span>
          <strong>
            {statName(statistics, statistics.needsAttentionId) ??
              "Aún sin datos"}
          </strong>
        </div>
      </div>
      {statistics.items.length === 0 ? (
        <HabitsEmpty />
      ) : (
        <div className="habit-stat-grid">
          {statistics.items.map((item) => (
            <StatisticCard
              item={item}
              highlight={
                item.habit.id === statistics.mostConsistentId
                  ? "best"
                  : item.habit.id === statistics.needsAttentionId
                    ? "attention"
                    : undefined
              }
              key={item.habit.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatisticCard({
  item,
  highlight,
}: {
  item: HabitStatistic;
  highlight?: "best" | "attention";
}) {
  const Icon = iconById[item.habit.icon];
  return (
    <article className={`habit-stat-card ${highlight ?? ""}`}>
      <div className="habit-stat-heading">
        <div className="habit-row-icon">
          <Icon size={18} />
        </div>
        <div>
          <strong>{item.habit.name}</strong>
          <span>
            {item.sampleSize < (item.streakUnit === "day" ? 7 : 3)
              ? "Recogiendo datos"
              : scheduleLabel(item.habit.schedule)}
          </span>
        </div>
        <b>{Math.round(item.completionRate)}%</b>
      </div>
      <div className="habit-progress-track">
        <span style={{ width: `${Math.min(100, item.completionRate)}%` }} />
      </div>
      <dl>
        <div>
          <dt>Racha actual</dt>
          <dd>
            {item.currentStreak}{" "}
            {streakUnit(item.streakUnit, item.currentStreak)}
          </dd>
        </div>
        <div>
          <dt>Mejor racha</dt>
          <dd>
            {item.bestStreak} {streakUnit(item.streakUnit, item.bestStreak)}
          </dd>
        </div>
        <div>
          <dt>Realizaciones</dt>
          <dd>{item.completedCount}</dd>
        </div>
        <div>
          <dt>Última vez</dt>
          <dd>
            {item.lastCompletedOn ? formatShortDate(item.lastCompletedOn) : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function statName(statistics: HabitStatisticsOverview, id: string | null) {
  return statistics.items.find((item) => item.habit.id === id)?.habit.name;
}
