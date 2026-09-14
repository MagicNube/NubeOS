import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  FileClock,
  Gamepad2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Tv,
  Utensils,
  X,
} from "lucide-react";
import { documentApi, type DocumentRecord } from "../documents/api";
import { gamesApi, type Game } from "../games/api";
import { habitErrorMessage, habitsApi, type HabitOverviewRow } from "../habits/api";
import { mealsApi, type Meal, type PlannedInstance, type ShoppingList } from "../meals/api";
import { mediaApi, type MediaTitle } from "../media/api";
import { readingApi, type ReadingBook } from "../reading/api";
import "./dashboard.css";

export type DashboardDestination =
  | "comidas"
  | "documentos"
  | "habitos"
  | "anime"
  | "lectura"
  | "videojuegos"
  | "series";

type DashboardData = {
  activeHabitCount: number;
  activeDocumentCount: number;
  habits: HabitOverviewRow[];
  documents: DocumentRecord[];
  meals: Meal[];
  archivedMeals: Meal[];
  todayMeals: PlannedInstance[];
  shopping: ShoppingList | null;
  anime: MediaTitle[];
  reading: ReadingBook[];
  games: Game[];
  series: MediaTitle[];
};

const emptyData: DashboardData = {
  activeHabitCount: 0, activeDocumentCount: 0,
  habits: [], documents: [], meals: [], archivedMeals: [], todayMeals: [], shopping: null,
  anime: [], reading: [], games: [], series: [],
};

const slots = {
  breakfast: "Desayuno",
  lunch: "Comida",
  snack: "Merienda",
  dinner: "Cena",
  extra: "Extra",
} as const;

function madridDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function mondayOf(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const distance = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - distance);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function weekdayOf(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  return (new Date(year, month - 1, day, 12).getDay() + 6) % 7;
}

function greetingForMadrid() {
  const hour = Number(new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", hour12: false, timeZone: "Europe/Madrid",
  }).formatToParts(new Date()).find((part) => part.type === "hour")?.value ?? 12);
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function longMadridDate() {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid",
  }).format(new Date());
}

function formatDate(date: string | null) {
  if (!date) return "Sin fecha";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day, 12));
}

function formatMoney(cents: number | null | undefined) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);
}

function SectionButton({ destination, label, open }: { destination: DashboardDestination; label: string; open: (destination: DashboardDestination) => void }) {
  return <button className="dashboard-section-link" onClick={() => open(destination)} type="button">{label}<ChevronRight size={16} /></button>;
}

export default function DashboardWorkspace({ open }: { open: (destination: DashboardDestination) => void }) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(0);
  const [habitBusy, setHabitBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const habitLock = useRef(false);
  const requestId = useRef(0);
  const [today, setToday] = useState(madridDate);
  const weekStart = useMemo(() => mondayOf(today), [today]);
  const weekday = useMemo(() => weekdayOf(today), [today]);

  const load = useCallback(async (initial = false) => {
    const currentDay = madridDate();
    if (today !== currentDay) { setToday(currentDay); return; }
    const id = ++requestId.current;
    if (initial) setLoading(true); else setRefreshing(true);
    const queries = await Promise.allSettled([
      habitsApi.overview("day", today),
      documentApi.list({ status: "active", search: null, category: null, tags: [], favoritesOnly: false, expiry: "expired", sort: "expirySoonest" }),
      documentApi.list({ status: "active", search: null, category: null, tags: [], favoritesOnly: false, expiry: "nextThirtyDays", sort: "expirySoonest" }),
      mealsApi.listMeals("active"),
      mealsApi.listWeek(weekStart),
      mealsApi.listShoppingList(weekStart),
      mediaApi.list({ archived: false, area: "anime", status: "watching" }),
      readingApi.list({ archived: false, status: "reading" }),
      gamesApi.list({ archived: false, status: "playing" }),
      mediaApi.list({ archived: false, area: "series", status: "watching" }),
      habitsApi.list({ archived: false }),
      documentApi.list({ status: "active", search: null, category: null, tags: [], favoritesOnly: false, expiry: null, sort: "importedNewest" }),
      mealsApi.listMeals("archived"),
    ]);
    if (id !== requestId.current) return;
    if (today !== madridDate()) { setToday(madridDate()); return; }
    const value = <T,>(index: number, fallback: T): T => queries[index].status === "fulfilled" ? queries[index].value as T : fallback;
    const plan = value(4, { weekStart, instances: [], dailyMacros: [], weeklyMacros: { proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, kilocalories: 0 } });
    setData({
      activeHabitCount: value<unknown[]>(10, []).length,
      activeDocumentCount: value<unknown[]>(11, []).length,
      habits: value(0, { start: today, end: today, today, rows: [] }).rows,
      documents: [...value<DocumentRecord[]>(1, []), ...value<DocumentRecord[]>(2, [])].filter((document, index, all) => all.findIndex((candidate) => candidate.id === document.id) === index),
      meals: value<Meal[]>(3, []),
      archivedMeals: value<Meal[]>(12, []),
      todayMeals: plan.instances.filter((instance: PlannedInstance) => instance.weekday === weekday),
      shopping: value<ShoppingList | null>(5, null),
      anime: value<MediaTitle[]>(6, []),
      reading: value<ReadingBook[]>(7, []),
      games: value<Game[]>(8, []),
      series: value<MediaTitle[]>(9, []),
    });
    setUnavailable(queries.filter((query) => query.status === "rejected").length);
    setLoading(false); setRefreshing(false);
  }, [today, weekStart, weekday]);

  useEffect(() => { void load(true); return () => { requestId.current += 1; }; }, [load]);
  useEffect(() => {
    const checkDay = () => setToday(madridDate());
    const onFocus = () => { void load(false); };
    const onVisible = () => { if (document.visibilityState === "visible") onFocus(); };
    const interval = window.setInterval(checkDay, 30_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const todayHabits = data.habits.filter((row) => row.cells[0]?.applicable);
  const completedHabits = todayHabits.filter((row) => row.cells[0]?.state === "completed").length;
  const skippedHabits = todayHabits.filter((row) => row.cells[0]?.state === "skipped").length;
  const effectiveHabits = todayHabits.length - skippedHabits;
  const pendingShopping = data.shopping?.entries.filter((entry) => !entry.isChecked && entry.pendingGrams > 0) ?? [];
  const dailyMacros = data.todayMeals.reduce((total, instance) => ({
    kilocalories: total.kilocalories + instance.macros.kilocalories,
    proteinGrams: total.proteinGrams + instance.macros.proteinGrams,
  }), { kilocalories: 0, proteinGrams: 0 });
  const inProgress = [
    ...data.anime.map((item) => ({ id: item.id, title: item.name, detail: item.nextContent?.name ?? "Anime en curso", destination: "anime" as const, Icon: Sparkles })),
    ...data.reading.map((item) => ({ id: item.id, title: item.title, detail: item.author, destination: "lectura" as const, Icon: BookOpen })),
    ...data.games.map((item) => ({ id: item.id, title: item.name, detail: "Partida en curso", destination: "videojuegos" as const, Icon: Gamepad2 })),
    ...data.series.map((item) => ({ id: item.id, title: item.name, detail: item.currentEpisode ? `Episodio ${item.currentEpisode}` : "Serie en curso", destination: "series" as const, Icon: Tv })),
  ];
  const activityMetrics = [
    { value: data.activeHabitCount, label: "hábitos" },
    { value: inProgress.length, label: "en curso" },
    { value: data.meals.length, label: "recetas" },
    { value: data.activeDocumentCount, label: "documentos" },
  ];

  async function toggleHabit(row: HabitOverviewRow) {
    const cell = row.cells[0]; if (!cell?.canEdit) return;
    if (habitLock.current) return;
    if (cell.date !== madridDate()) {
      setError("Ha cambiado el día. Actualizamos Inicio; vuelve a marcar el hábito de hoy.");
      await load(false);
      return;
    }
    habitLock.current = true;
    setHabitBusy(row.habit.id);
    try {
      await habitsApi.setLog(row.habit.id, cell.date, cell.state === "completed" ? null : "completed");
      setError(null);
      await load(false);
    } catch (reason) { setError(habitErrorMessage(reason)); }
    finally { habitLock.current = false; setHabitBusy(null); }
  }

  if (loading) return <section className="dashboard-loading"><RefreshCw className="dashboard-spin" size={24} /><strong>Preparando tu día…</strong></section>;

  return <section className="dashboard-overview">
    <header className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <h1>Inicio</h1>
      </div>
      <div className="dashboard-activity">
        <div className="dashboard-activity-heading">
          <div><strong>{greetingForMadrid()}.</strong><span>{longMadridDate()}</span></div>
          <button aria-label="Actualizar Inicio" className="dashboard-refresh" disabled={refreshing} onClick={() => void load(false)} title="Actualizar" type="button"><RefreshCw className={refreshing ? "dashboard-spin" : ""} size={17} /></button>
        </div>
        <div className="dashboard-activity-metrics" aria-label="Resumen de actividad">
          {activityMetrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
        </div>
      </div>
    </header>
    {error && <div className="dashboard-warning" role="alert"><CircleAlert aria-hidden="true" size={17} />{error}<button aria-label="Cerrar aviso" onClick={() => setError(null)} type="button"><X size={16} /></button></div>}
    <div className={unavailable > 0 ? "dashboard-warning" : "sr-only"} role="status">{unavailable > 0 && <><CircleAlert aria-hidden="true" size={17} />{unavailable === 1 ? "Un bloque no ha podido actualizarse." : `${unavailable} bloques no han podido actualizarse.`}</>}</div>

    <div className="dashboard-grid">
      <article className="dashboard-panel dashboard-habits">
        <header><div><span className="dashboard-panel-icon"><Check size={18} /></span><div><h2>Hábitos de hoy</h2><p>{completedHabits} de {effectiveHabits} completados{skippedHabits ? ` · ${skippedHabits} omitidos` : ""}</p></div></div><SectionButton destination="habitos" label="Ver hábitos" open={open} /></header>
        <div className="dashboard-progress"><span style={{ width: `${effectiveHabits ? Math.min(100, completedHabits / effectiveHabits * 100) : 0}%` }} /></div>
        {todayHabits.length === 0 ? <p className="dashboard-empty-copy">No tienes actividades para hoy.</p> : <div className="dashboard-habit-list">{todayHabits.slice(0, 6).map((row) => { const state = row.cells[0]?.state; return <button className={state === "completed" ? "completed" : state === "skipped" ? "skipped" : ""} disabled={habitBusy !== null || refreshing || !row.cells[0]?.canEdit} key={row.habit.id} onClick={() => void toggleHabit(row)} type="button"><span>{state === "completed" && <Check size={15} />}{state === "skipped" && "—"}</span><strong>{row.habit.name}</strong><small>{state === "completed" ? "Hecho" : state === "skipped" ? "Omitido" : "Pendiente"}</small></button>; })}</div>}
      </article>

      <article className="dashboard-panel dashboard-today-meals">
        <header><div><span className="dashboard-panel-icon"><Utensils size={18} /></span><div><h2>Comidas de hoy</h2><p>{data.todayMeals.length} planificadas</p></div></div><SectionButton destination="comidas" label="Abrir plan" open={open} /></header>
        {data.todayMeals.length === 0 ? <p className="dashboard-empty-copy">No tienes comidas planificadas para hoy.</p> : <div className="dashboard-meal-list">{data.todayMeals.slice(0, 5).map((instance) => <div key={instance.id}><span>{slots[instance.slot]}</span><strong>{[...data.meals, ...data.archivedMeals].find((meal) => meal.id === instance.sourceMealId)?.name ?? (instance.ingredients.map((ingredient) => ingredient.productName).join(", ") || "Comida planificada")}</strong></div>)}</div>}
        <footer><div><span>Kcal</span><strong>{Math.round(dailyMacros.kilocalories)}</strong></div><div><span>Proteínas</span><strong>{Math.round(dailyMacros.proteinGrams * 10) / 10} g</strong></div></footer>
      </article>

      <article className="dashboard-panel dashboard-shopping">
        <header><div><span className="dashboard-panel-icon"><ShoppingCart size={18} /></span><div><h2>Compra semanal</h2><p>{pendingShopping.length} productos pendientes</p></div></div><SectionButton destination="comidas" label="Ver compra" open={open} /></header>
        <strong className="dashboard-big-value">{formatMoney(data.shopping?.pendingEstimatedTotalCents)}</strong>
        <span className="dashboard-big-caption">Coste pendiente estimado</span>
        <div className="dashboard-shopping-preview">{pendingShopping.slice(0, 3).map((entry) => <span key={entry.product.id}>{entry.product.name}</span>)}{pendingShopping.length > 3 && <span>+{pendingShopping.length - 3} más</span>}</div>
      </article>

      <article className="dashboard-panel dashboard-progress-media">
        <header><div><span className="dashboard-panel-icon"><Sparkles size={18} /></span><div><h2>En curso</h2><p>Lo que tienes entre manos</p></div></div></header>
        {inProgress.length === 0 ? <p className="dashboard-empty-copy">No tienes contenido marcado como en curso.</p> : <div className="dashboard-media-list">{inProgress.slice(0, 6).map(({ id, title, detail, destination, Icon }) => <button key={`${destination}-${id}`} onClick={() => open(destination)} type="button"><Icon size={17} /><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div>}
      </article>

      <article className="dashboard-panel dashboard-documents">
        <header><div><span className="dashboard-panel-icon"><FileClock size={18} /></span><div><h2>Documentos</h2><p>{data.documents.length ? "Requieren atención" : "Todo al día"}</p></div></div><SectionButton destination="documentos" label="Ver documentos" open={open} /></header>
        {data.documents.length === 0 ? <div className="dashboard-document-ok"><Check size={18} />No hay documentos próximos a caducar.</div> : <div className="dashboard-document-list">{data.documents.slice(0, 5).map((document) => <div className={document.expiryStatus === "expired" ? "expired" : ""} key={document.id}><CalendarDays size={16} /><span><strong>{document.name}</strong><small>{document.expiryStatus === "expired" ? "Caducó" : "Caduca"} {formatDate(document.expiresOn)}</small></span></div>)}</div>}
      </article>
    </div>
  </section>;
}
