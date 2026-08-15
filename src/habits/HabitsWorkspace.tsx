import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { habitErrorMessage, habitsApi } from "./api";
import type {
  HabitCategory,
  HabitKind,
  HabitLogState,
  HabitOverview,
  HabitOverviewCell,
  HabitRecord,
  HabitStatisticsPeriod,
  HabitStatisticsOverview,
} from "./api";
import CatalogView from "./HabitCatalog";
import HabitForm from "./HabitForm";
import StatisticsView from "./StatisticsView";
import { DayView, HabitsEmpty, MonthView, WeekView } from "./TrackingViews";
import { addDays, addMonths, todayIso } from "./presentation";
import "./habits.css";

type View = "today" | "week" | "month" | "statistics" | "catalog";

export default function HabitsWorkspace() {
  const [view, setView] = useState<View>("today");
  const [anchor, setAnchor] = useState(todayIso());
  const [overview, setOverview] = useState<HabitOverview | null>(null);
  const [statistics, setStatistics] = useState<HabitStatisticsOverview | null>(
    null,
  );
  const [statisticsPeriod, setStatisticsPeriod] =
    useState<HabitStatisticsPeriod>("month");
  const [statisticsFrom, setStatisticsFrom] = useState(
    `${todayIso().slice(0, 8)}01`,
  );
  const [statisticsTo, setStatisticsTo] = useState(todayIso());
  const [catalog, setCatalog] = useState<HabitRecord[]>([]);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<HabitCategory | "">("");
  const [kind, setKind] = useState<HabitKind | "">("");
  const [editing, setEditing] = useState<HabitRecord | "new" | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (showInitial = false) => {
      const id = ++requestId.current;
      if (showInitial) setInitialLoading(true);
      try {
        if (view === "catalog") {
          const items = await habitsApi.list({
            archived,
            search: search || null,
            category: category || null,
            kind: kind || null,
          });
          if (id === requestId.current) setCatalog(items);
        } else if (view === "statistics") {
          const data = await habitsApi.statistics({
            period: statisticsPeriod,
            fromDate: statisticsPeriod === "custom" ? statisticsFrom : null,
            toDate: statisticsPeriod === "custom" ? statisticsTo : null,
          });
          if (id === requestId.current) setStatistics(data);
        } else {
          const date = view === "today" ? todayIso() : anchor;
          const data = await habitsApi.overview(
            view === "week" ? "week" : view === "month" ? "month" : "day",
            date,
          );
          if (id === requestId.current) {
            setOverview(data);
            if (view === "today") setAnchor(data.today);
          }
        }
        if (id === requestId.current) setError(null);
      } catch (reason) {
        if (id === requestId.current) setError(habitErrorMessage(reason));
      } finally {
        if (id === requestId.current) setInitialLoading(false);
      }
    },
    [
      view,
      anchor,
      archived,
      search,
      category,
      kind,
      statisticsPeriod,
      statisticsFrom,
      statisticsTo,
    ],
  );

  useEffect(() => {
    const delay = view === "catalog" ? 160 : 0;
    const timeout = window.setTimeout(
      () =>
        void load(
          overview === null && statistics === null && catalog.length === 0,
        ),
      delay,
    );
    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (view !== "today") return;
    let knownDay = todayIso();
    const interval = window.setInterval(() => {
      const currentDay = todayIso();
      if (currentDay !== knownDay) {
        knownDay = currentDay;
        setAnchor(currentDay);
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [view]);

  async function run(operation: () => Promise<unknown>) {
    setBusy(true);
    try {
      await operation();
      setError(null);
      await load(false);
      return true;
    } catch (reason) {
      setError(habitErrorMessage(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setLog(
    habitId: string,
    cell: HabitOverviewCell,
    state: HabitLogState | null,
  ) {
    if (!cell.canEdit || busy) return;
    await run(() => habitsApi.setLog(habitId, cell.date, state));
  }

  function changeView(next: View) {
    setView(next);
    if (next === "today" || next === "week" || next === "month")
      setAnchor(todayIso());
    if (next !== "catalog") setArchived(false);
  }

  return (
    <section className="habits-workspace">
      <div className="habits-primary-toolbar">
        <div className="habits-tabs" role="tablist">
          {(
            [
              "today",
              "week",
              "month",
              "statistics",
              "catalog",
            ] as View[]
          ).map((item) => (
            <button
              className={view === item ? "active" : ""}
              key={item}
              onClick={() => changeView(item)}
              role="tab"
              type="button"
            >
              {viewLabel(item)}
            </button>
          ))}
        </div>
        <button
          className="primary-button"
          onClick={() => setEditing("new")}
          type="button"
        >
          <Plus size={17} /> Añadir actividad
        </button>
      </div>
      {error && (
        <div className="habits-error" role="alert">
          {error}
          <button onClick={() => setError(null)} type="button">
            <X size={16} />
          </button>
        </div>
      )}
      {initialLoading ? (
        <HabitsEmpty loading />
      ) : (
        <>
          {view === "today" && overview && (
            <DayView
              edit={setEditing}
              overview={overview}
              setLog={setLog}
            />
          )}
          {view === "week" && overview && (
            <WeekView
              overview={overview}
              busy={busy}
              move={(days) => setAnchor(addDays(anchor, days))}
              setToday={() => setAnchor(todayIso())}
              setLog={setLog}
            />
          )}
          {view === "month" && overview && (
            <MonthView
              overview={overview}
              anchor={anchor}
              move={(months) => setAnchor(addMonths(anchor, months))}
              setToday={() => setAnchor(todayIso())}
            />
          )}
          {view === "statistics" && statistics && (
            <StatisticsView
              from={statisticsFrom}
              period={statisticsPeriod}
              setFrom={setStatisticsFrom}
              setPeriod={setStatisticsPeriod}
              setTo={setStatisticsTo}
              statistics={statistics}
              to={statisticsTo}
            />
          )}
          {view === "catalog" && (
            <CatalogView
              archived={archived}
              setArchived={setArchived}
              items={catalog}
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              kind={kind}
              setKind={setKind}
              edit={setEditing}
              run={run}
              reload={load}
            />
          )}
        </>
      )}
      {editing && (
        <HabitForm
          habit={editing === "new" ? null : editing}
          busy={busy}
          close={() => setEditing(null)}
          save={async (input) => {
            const ok = await run(() =>
              editing === "new"
                ? habitsApi.create(input)
                : habitsApi.update(editing.id, input),
            );
            if (ok) {
              setEditing(null);
            }
          }}
        />
      )}
    </section>
  );
}

function viewLabel(view: View) {
  return (
    {
      today: "Hoy",
      week: "Semana",
      month: "Mes",
      statistics: "Estadísticas",
      catalog: "Actividades",
    } as Record<View, string>
  )[view];
}
