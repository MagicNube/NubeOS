import { BarChart3, CalendarDays, ChartNoAxesColumnIncreasing, Compass, ListFilter, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ScoreTile from "./ScoreTile";
import SelectControl from "./SelectControl";
import "./ui.css";

export type MediaStatItem = {
  id: string;
  name: string;
  detail?: string;
  status: string;
  statusLabel: string;
  score: number | null;
  favorite: boolean;
  genres: string[];
  startedOn?: string | null;
  finishedOn?: string | null;
};

export type MediaStatSession = {
  id: string;
  itemId: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  activityOn?: string | null;
  completed?: boolean;
  units?: number;
};

type StatsView = "summary" | "rankings" | "explore" | "evolution" | "calendar";
type RankingMode = "best" | "worst" | "favorites" | "repeated" | "sessions";
type DateBasis = "start" | "finish";
type CalendarMode = "activity" | "periods" | "both";

type PersistedFilters = {
  genre: string;
  status: string;
  score: string;
  from: string;
  to: string;
  dateBasis: DateBasis;
  sessionCompletion: string;
};

const defaultFilters: PersistedFilters = { genre: "", status: "", score: "", from: "", to: "", dateBasis: "finish", sessionCompletion: "all" };

function loadFilters(key: string): PersistedFilters {
  try { return { ...defaultFilters, ...JSON.parse(localStorage.getItem(`${key}.filters`) ?? "{}") }; }
  catch { return defaultFilters; }
}

function scoreText(score: number | null) { return score === null ? "—" : score.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function dateYear(value?: string | null) { return value ? value.slice(0, 4) : ""; }
function sessionDate(session: MediaStatSession, basis: DateBasis) { return basis === "start" ? session.startedOn ?? session.activityOn : session.finishedOn ?? session.activityOn; }
function itemDate(item: MediaStatItem, basis: DateBasis) { return basis === "start" ? item.startedOn : item.finishedOn; }

export default function MediaStatisticsDashboard({
  storageKey,
  noun,
  items,
  sessions,
  repeatable = true,
  unitLabel = "sesiones",
  openItem,
  showUnscored,
  calendarPeriods = false,
  extraFilters,
}: {
  storageKey: string;
  noun: string;
  items: MediaStatItem[];
  sessions: MediaStatSession[];
  repeatable?: boolean;
  unitLabel?: string;
  openItem?: (id: string) => void;
  showUnscored?: () => void;
  calendarPeriods?: boolean;
  extraFilters?: ReactNode;
}) {
  const [view, setView] = useState<StatsView>("summary");
  const [filters, setFiltersState] = useState<PersistedFilters>(() => loadFilters(storageKey));
  const [rankingMode, setRankingMode] = useState<RankingMode>("best");
  const [limit, setLimit] = useState<string>(() => {
    const stored = localStorage.getItem(`${storageKey}.topLimit`);
    return stored && ["5", "10", "15", "25", "all"].includes(stored) ? stored : "5";
  });
  const availableYears = useMemo(() => [...new Set([
    ...items.flatMap((item) => [dateYear(item.startedOn), dateYear(item.finishedOn)]),
    ...sessions.flatMap((session) => [dateYear(session.startedOn), dateYear(session.finishedOn), dateYear(session.activityOn)]),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a)), [items, sessions]);
  const [calendarYear, setCalendarYear] = useState(() => availableYears[0] ?? String(new Date().getFullYear()));
  const [compareYear, setCompareYear] = useState("");
  const [calendarMode, setCalendarModeState] = useState<CalendarMode>(() => {
    if (!calendarPeriods) return "activity";
    const stored = localStorage.getItem(`${storageKey}.calendarMode`);
    return stored === "periods" || stored === "both" ? stored : "activity";
  });

  useEffect(() => {
    if (!availableYears.length) return;
    setCalendarYear((current) => availableYears.includes(current) ? current : availableYears[0]);
    setCompareYear((current) => current && !availableYears.includes(current) ? "" : current);
  }, [availableYears]);

  function setCalendarMode(mode: CalendarMode) {
    setCalendarModeState(mode);
    localStorage.setItem(`${storageKey}.calendarMode`, mode);
  }

  function setFilters(next: Partial<PersistedFilters>) {
    setFiltersState((current) => {
      const value = { ...current, ...next };
      localStorage.setItem(`${storageKey}.filters`, JSON.stringify(value));
      return value;
    });
  }

  const genres = useMemo(() => [...new Set(items.flatMap((item) => item.genres))].sort((a, b) => a.localeCompare(b, "es")), [items]);
  const statuses = useMemo(() => [...new Map(items.map((item) => [item.status, item.statusLabel])).entries()], [items]);
  const filteredSessions = useMemo(() => sessions.filter((session) => filters.sessionCompletion === "all"
    || (filters.sessionCompletion === "completed" && session.completed !== false && Boolean(session.finishedOn ?? session.activityOn))
    || (filters.sessionCompletion === "incomplete" && session.completed === false && Boolean(session.finishedOn))
    || (filters.sessionCompletion === "open" && !session.finishedOn && !session.activityOn)), [filters.sessionCompletion, sessions]);
  const filteredItems = useMemo(() => items.filter((item) => {
    if (filters.genre && !item.genres.includes(filters.genre)) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.score === "scored" && item.score === null) return false;
    if (filters.score === "unscored" && item.score !== null) return false;
    if (filters.score.startsWith("min:") && (item.score === null || item.score < Number(filters.score.slice(4)))) return false;
    const year = dateYear(itemDate(item, filters.dateBasis));
    if (filters.from && (!year || year < filters.from)) return false;
    if (filters.to && (!year || year > filters.to)) return false;
    return true;
  }), [filters, items]);
  const filteredIds = useMemo(() => new Set(filteredItems.map((item) => item.id)), [filteredItems]);
  const scopedSessions = useMemo(() => filteredSessions.filter((session) => filteredIds.has(session.itemId)), [filteredIds, filteredSessions]);
  const sessionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scopedSessions.forEach((session) => counts.set(session.itemId, (counts.get(session.itemId) ?? 0) + 1));
    return counts;
  }, [scopedSessions]);
  const scored = filteredItems.filter((item) => item.score !== null);
  const unscored = filteredItems.length - scored.length;
  const repeated = filteredItems.filter((item) => (sessionCounts.get(item.id) ?? 0) >= 2).length;
  const statusGroups = useMemo(() => groupItems(filteredItems, (item) => item.statusLabel), [filteredItems]);
  const genreGroups = useMemo(() => groupGenres(filteredItems, sessionCounts), [filteredItems, sessionCounts]);
  const yearGroups = useMemo(() => groupYears(filteredItems, scopedSessions, filters.dateBasis), [filteredItems, scopedSessions, filters.dateBasis]);
  const favoriteCount = filteredItems.filter((item) => item.favorite).length;
  const averageScore = average(scored.map((item) => item.score!));
  const completionCount = scopedSessions.filter((session) => session.completed !== false && Boolean(session.finishedOn ?? session.activityOn)).length;

  const ranked = useMemo(() => {
    let source = [...filteredItems];
    if (rankingMode === "favorites") source = source.filter((item) => item.favorite);
    if (rankingMode === "best" || rankingMode === "worst") source = source.filter((item) => item.score !== null);
    if (rankingMode === "repeated") source = source.filter((item) => (sessionCounts.get(item.id) ?? 0) >= 2);
    source.sort((left, right) => {
      if (rankingMode === "worst") return (left.score ?? 11) - (right.score ?? 11) || tieBreak(left, right, sessionCounts);
      if (rankingMode === "repeated" || rankingMode === "sessions") return (sessionCounts.get(right.id) ?? 0) - (sessionCounts.get(left.id) ?? 0) || tieBreak(left, right, sessionCounts);
      return (right.score ?? -1) - (left.score ?? -1) || tieBreak(left, right, sessionCounts);
    });
    return limit === "all" ? source : source.slice(0, Number(limit));
  }, [filteredItems, limit, rankingMode, sessionCounts]);

  const activity = useMemo(() => monthlyActivity(scopedSessions, calendarYear, filters.dateBasis), [calendarYear, filters.dateBasis, scopedSessions]);
  const comparison = useMemo(() => compareYear ? monthlyActivity(scopedSessions, compareYear, filters.dateBasis) : null, [compareYear, filters.dateBasis, scopedSessions]);

  return <section className="media-stats-dashboard">
    <nav aria-label="Secciones de estadísticas" className="media-stats-tabs">
      <StatsTab active={view === "summary"} icon={BarChart3} label="Resumen" onClick={() => setView("summary")} />
      <StatsTab active={view === "rankings"} icon={Trophy} label="Rankings" onClick={() => setView("rankings")} />
      <StatsTab active={view === "explore"} icon={Compass} label="Explorar" onClick={() => setView("explore")} />
      <StatsTab active={view === "evolution"} icon={ChartNoAxesColumnIncreasing} label="Evolución" onClick={() => setView("evolution")} />
      <StatsTab active={view === "calendar"} icon={CalendarDays} label="Calendario" onClick={() => setView("calendar")} />
    </nav>

    <div className="media-stats-filters">
      {extraFilters}
      <SelectControl><select aria-label="Filtrar por género" onChange={(event) => setFilters({ genre: event.target.value })} value={filters.genre}><option value="">Todos los géneros</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select></SelectControl>
      <SelectControl><select aria-label="Filtrar por estado" onChange={(event) => setFilters({ status: event.target.value })} value={filters.status}><option value="">Todos los estados</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></SelectControl>
      <SelectControl><select aria-label="Filtrar por puntuación" onChange={(event) => setFilters({ score: event.target.value })} value={filters.score}><option value="">Todas las puntuaciones</option><option value="scored">Solo puntuadas</option><option value="unscored">Sin puntuar</option>{[5, 6, 7, 8, 9].map((value) => <option key={value} value={`min:${value}`}>{value} o más</option>)}</select></SelectControl>
      {repeatable && <SelectControl><select aria-label="Filtrar sesiones" onChange={(event) => setFilters({ sessionCompletion: event.target.value })} value={filters.sessionCompletion}><option value="all">Todas las sesiones</option><option value="completed">Sesiones terminadas</option><option value="open">Sesiones abiertas</option><option value="incomplete">Cerradas sin terminar</option></select></SelectControl>}
    </div>

    {view === "summary" && <>
      <div className="media-stats-hero-grid">
        <Metric label={noun} value={filteredItems.length} />
        <Metric label="Puntuación media" score={averageScore} value={scoreText(averageScore)} />
        <Metric label={unitLabel} value={scopedSessions.length} />
        <Metric label="Terminaciones" value={completionCount} />
        <Metric label="Repetidas" value={repeatable ? repeated : "—"} />
        <Metric label="Favoritas" value={favoriteCount} />
      </div>
      {unscored > 0 && <DataNote count={unscored} onClick={showUnscored} prefix="Tienes" suffix="en esta selección." />}
      <div className="media-stats-summary-grid">
        <Distribution title="Por estado" groups={statusGroups} total={filteredItems.length} />
        <ScoreDistribution items={filteredItems} />
        <Distribution title="Géneros principales" groups={genreGroups.slice(0, 8).map((group) => ({ label: group.label, count: group.count }))} total={filteredItems.length} />
        <CompactRanking items={filteredItems.filter((item) => item.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5)} openItem={openItem} sessionCounts={sessionCounts} title="Tu Top 5" />
      </div>
    </>}

    {view === "rankings" && <>
      <div className="media-stats-ranking-toolbar">
        <div className="media-stats-segmented">
          {(["best", "worst", "favorites", ...(repeatable ? ["repeated", "sessions"] : [])] as RankingMode[]).map((mode) => <button className={rankingMode === mode ? "active" : ""} key={mode} onClick={() => setRankingMode(mode)} type="button">{{ best: "Mejor puntuación", worst: "Peor puntuación", favorites: "Favoritas", repeated: "Más repetidas", sessions: "Más sesiones" }[mode]}</button>)}
        </div>
        <SelectControl><select aria-label="Cantidad del ranking" onChange={(event) => { setLimit(event.target.value); localStorage.setItem(`${storageKey}.topLimit`, event.target.value); }} value={limit}>{[5, 10, 15, 25].map((value) => <option key={value} value={value}>Top {value}</option>)}<option value="all">Todas</option></select></SelectControl>
      </div>
      {unscored > 0 && (rankingMode === "best" || rankingMode === "worst") && <DataNote count={unscored} onClick={showUnscored} prefix="Fuera del ranking:" />}
      <CompactRanking items={ranked} openItem={openItem} sessionCounts={sessionCounts} showSessions={rankingMode === "repeated" || rankingMode === "sessions"} title={`${rankingMode === "best" ? "Mejor puntuación" : rankingMode === "worst" ? "Peor puntuación" : rankingMode === "favorites" ? "Favoritas" : rankingMode === "repeated" ? "Más repetidas" : "Más sesiones"}`} />
    </>}

    {view === "explore" && <>
      <div className="media-stats-date-controls"><span>Calcular años por</span><div className="media-stats-segmented"><button className={filters.dateBasis === "start" ? "active" : ""} onClick={() => setFilters({ dateBasis: "start" })} type="button">Inicio</button><button className={filters.dateBasis === "finish" ? "active" : ""} onClick={() => setFilters({ dateBasis: "finish" })} type="button">Finalización</button></div><label><span>Desde</span><SelectControl><select onChange={(event) => setFilters({ from: event.target.value })} value={filters.from}><option value="">Siempre</option>{availableYears.map((year) => <option key={year}>{year}</option>)}</select></SelectControl></label><label><span>Hasta</span><SelectControl><select onChange={(event) => setFilters({ to: event.target.value })} value={filters.to}><option value="">Ahora</option>{availableYears.map((year) => <option key={year}>{year}</option>)}</select></SelectControl></label></div>
      <div className="media-stats-explore-grid">
        <StatsTable title="Por género" rows={genreGroups} onSelect={(value) => setFilters({ genre: value })} />
        <StatsTable title={`Por año de ${filters.dateBasis === "start" ? "inicio" : "finalización"}`} rows={yearGroups} />
        <StatsTable title="Por estado" rows={statusGroups.map((group) => ({ ...group, average: average(filteredItems.filter((item) => item.statusLabel === group.label && item.score !== null).map((item) => item.score!)), sessions: filteredItems.filter((item) => item.statusLabel === group.label).reduce((sum, item) => sum + (sessionCounts.get(item.id) ?? 0), 0) }))} />
      </div>
    </>}

    {view === "evolution" && <>
      <div className="media-stats-date-controls"><span>Actividad registrada por</span><div className="media-stats-segmented"><button className={filters.dateBasis === "start" ? "active" : ""} onClick={() => setFilters({ dateBasis: "start" })} type="button">Inicio</button><button className={filters.dateBasis === "finish" ? "active" : ""} onClick={() => setFilters({ dateBasis: "finish" })} type="button">Finalización</button></div><label><span>Año principal</span><SelectControl><select onChange={(event) => setCalendarYear(event.target.value)} value={calendarYear}>{availableYears.length ? availableYears.map((year) => <option key={year}>{year}</option>) : <option>{calendarYear}</option>}</select></SelectControl></label><label><span>Comparar con</span><SelectControl><select onChange={(event) => setCompareYear(event.target.value)} value={compareYear}><option value="">Sin comparación</option>{availableYears.filter((year) => year !== calendarYear).map((year) => <option key={year}>{year}</option>)}</select></SelectControl></label></div>
      <MonthlyChart primary={activity} primaryYear={calendarYear} comparison={comparison} comparisonYear={compareYear} />
      <div className="media-stats-summary-grid"><YearComparison items={filteredItems} sessions={scopedSessions} year={calendarYear} compareYear={compareYear} /><ScoreByYear items={filteredItems} /></div>
    </>}

    {view === "calendar" && <>
      <div className="media-stats-date-controls"><span>Días activos e intensidad</span>{calendarPeriods && <div aria-label="Representación del calendario" className="media-stats-segmented"><button className={calendarMode === "activity" ? "active" : ""} onClick={() => setCalendarMode("activity")} type="button">Actividad</button><button className={calendarMode === "periods" ? "active" : ""} onClick={() => setCalendarMode("periods")} type="button">Periodos</button><button className={calendarMode === "both" ? "active" : ""} onClick={() => setCalendarMode("both")} type="button">Ambas</button></div>}<label><span>Año</span><SelectControl><select onChange={(event) => setCalendarYear(event.target.value)} value={calendarYear}>{availableYears.length ? availableYears.map((year) => <option key={year}>{year}</option>) : <option>{calendarYear}</option>}</select></SelectControl></label></div>
      <ActivityCalendar items={filteredItems} mode={calendarPeriods ? calendarMode : "activity"} sessions={scopedSessions} year={calendarYear} />
    </>}
  </section>;
}

function StatsTab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Trophy; label: string; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick} type="button"><Icon size={16} />{label}</button>; }
function DataNote({ count, prefix, suffix, onClick }: { count: number; prefix: string; suffix?: string; onClick?: () => void }) {
  const content = <><ListFilter size={15} /> {prefix} <strong>{count}</strong> {count === 1 ? "obra sin puntuar" : "obras sin puntuar"}{suffix ? ` ${suffix}` : "."}</>;
  return onClick
    ? <button className="media-stats-data-note interactive" onClick={onClick} title="Ver sin puntuar en la biblioteca" type="button">{content}</button>
    : <p className="media-stats-data-note">{content}</p>;
}
function Metric({ label, value, score }: { label: string; value: number | string; score?: number | null }) { return <article><span>{label}</span>{score !== undefined ? <ScoreTile score={score} /> : <strong>{value}</strong>}</article>; }
function tieBreak(left: MediaStatItem, right: MediaStatItem, counts: Map<string, number>) { return Number(right.favorite) - Number(left.favorite) || (counts.get(right.id) ?? 0) - (counts.get(left.id) ?? 0) || left.name.localeCompare(right.name, "es"); }

function groupItems(items: MediaStatItem[], key: (item: MediaStatItem) => string) { const values = new Map<string, number>(); items.forEach((item) => values.set(key(item), (values.get(key(item)) ?? 0) + 1)); return [...values].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es")); }
function groupGenres(items: MediaStatItem[], counts: Map<string, number>) { const values = new Map<string, MediaStatItem[]>(); items.forEach((item) => item.genres.forEach((genre) => values.set(genre, [...(values.get(genre) ?? []), item]))); return [...values].map(([label, grouped]) => ({ label, count: grouped.length, average: average(grouped.filter((item) => item.score !== null).map((item) => item.score!)), sessions: grouped.reduce((sum, item) => sum + (counts.get(item.id) ?? 0), 0), warning: grouped.length < 3 })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es")); }
function groupYears(items: MediaStatItem[], sessions: MediaStatSession[], basis: DateBasis) { const values = new Map<string, MediaStatItem[]>(); items.forEach((item) => { const year = dateYear(itemDate(item, basis)); if (year) values.set(year, [...(values.get(year) ?? []), item]); }); return [...values].map(([label, grouped]) => ({ label, count: grouped.length, average: average(grouped.filter((item) => item.score !== null).map((item) => item.score!)), sessions: sessions.filter((session) => dateYear(sessionDate(session, basis)) === label).length })).sort((a, b) => b.label.localeCompare(a.label)); }

function Distribution({ title, groups, total }: { title: string; groups: { label: string; count: number }[]; total: number }) { return <section className="media-stats-panel"><h3>{title}</h3>{groups.length ? <div className="media-stats-bars">{groups.map((group) => <div key={group.label}><span>{group.label}</span><div><i style={{ width: `${total ? Math.max(4, group.count / total * 100) : 0}%` }} /></div><strong>{group.count}</strong></div>)}</div> : <p>Sin datos todavía.</p>}</section>; }
function ScoreDistribution({ items }: { items: MediaStatItem[] }) { const ranges = [{ label: "0 – 4,9", min: 0, max: 4.9 }, { label: "5 – 5,9", min: 5, max: 5.9 }, { label: "6 – 6,9", min: 6, max: 6.9 }, { label: "7 – 7,9", min: 7, max: 7.9 }, { label: "8 – 8,9", min: 8, max: 8.9 }, { label: "9 – 10", min: 9, max: 10 }]; const groups = ranges.map((range) => ({ label: range.label, count: items.filter((item) => item.score !== null && item.score >= range.min && item.score <= range.max).length })); return <Distribution groups={groups} title="Distribución de puntuaciones" total={Math.max(1, items.filter((item) => item.score !== null).length)} />; }

function CompactRanking({ title, items, sessionCounts, showSessions, openItem }: { title: string; items: MediaStatItem[]; sessionCounts: Map<string, number>; showSessions?: boolean; openItem?: (id: string) => void }) { return <section className="media-stats-panel media-stats-ranking"><h3>{title}</h3>{items.length ? <ol>{items.map((item, index) => <li key={item.id}><span>#{index + 1}</span><button disabled={!openItem} onClick={() => openItem?.(item.id)} type="button"><strong>{item.name}</strong>{item.detail && <small>{item.detail}</small>}</button>{showSessions ? <b>{sessionCounts.get(item.id) ?? 0} sesiones</b> : <ScoreTile score={item.score} />}</li>)}</ol> : <p>No hay resultados con estos filtros.</p>}</section>; }

type TableRow = { label: string; count: number; average?: number | null; sessions?: number; warning?: boolean };
function StatsTable({ title, rows, onSelect }: { title: string; rows: TableRow[]; onSelect?: (value: string) => void }) { return <section className="media-stats-panel media-stats-table"><h3>{title}</h3><div className="media-stats-table-head"><span>Grupo</span><span>Obras</span><span>Media</span><span>Sesiones</span></div>{rows.length ? rows.map((row) => <button disabled={!onSelect} key={row.label} onClick={() => onSelect?.(row.label)} type="button"><span>{row.label}{row.warning && <small title="Media basada en menos de tres obras">Muestra pequeña</small>}</span><strong>{row.count}</strong><ScoreTile className="media-stats-table-score" score={row.average ?? null} /><span>{row.sessions ?? "—"}</span></button>) : <p>Sin datos todavía.</p>}</section>; }

function monthlyActivity(sessions: MediaStatSession[], year: string, basis: DateBasis) { return Array.from({ length: 12 }, (_, month) => sessions.filter((session) => sessionDate(session, basis)?.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).reduce((sum, session) => sum + (session.units ?? 1), 0)); }
function MonthlyChart({ primary, primaryYear, comparison, comparisonYear }: { primary: number[]; primaryYear: string; comparison: number[] | null; comparisonYear: string }) { const max = Math.max(1, ...primary, ...(comparison ?? [])); const middle = Math.ceil(max / 2); const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]; return <section className="media-stats-panel media-stats-monthly"><header><div><i />{primaryYear}</div>{comparison && <div><i />{comparisonYear}</div>}</header><div className="media-stats-chart-body"><div className="media-stats-y-axis"><span>{max}</span><span>{middle}</span><span>0</span></div><div className="media-stats-month-grid">{months.map((month, index) => <div key={month} title={`${month} ${primaryYear}: ${primary[index]} actividades${comparison ? ` · ${comparisonYear}: ${comparison[index]}` : ""}`}><div><i style={{ height: `${primary[index] / max * 100}%` }} />{comparison && <b style={{ height: `${comparison[index] / max * 100}%` }} />}</div><span>{month}</span></div>)}</div></div></section>; }
function YearComparison({ items, sessions, year, compareYear }: { items: MediaStatItem[]; sessions: MediaStatSession[]; year: string; compareYear: string }) { const values = (target: string) => ({ starts: items.filter((item) => dateYear(item.startedOn) === target).length, finishes: items.filter((item) => dateYear(item.finishedOn) === target).length, sessions: sessions.filter((session) => [session.activityOn, session.startedOn, session.finishedOn].some((date) => dateYear(date) === target)).length }); const primary = values(year), compare = compareYear ? values(compareYear) : null; return <section className="media-stats-panel"><h3>Comparación anual</h3><div className="media-stats-year-cards">{[["Iniciadas", primary.starts, compare?.starts], ["Finalizadas", primary.finishes, compare?.finishes], ["Sesiones", primary.sessions, compare?.sessions]].map(([label, value, other]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong>{other !== undefined && <small>{compareYear}: {other}</small>}</div>)}</div></section>; }
function ScoreByYear({ items }: { items: MediaStatItem[] }) { const years = [...new Set(items.map((item) => dateYear(item.finishedOn)).filter(Boolean))].sort(); const rows = years.map((year) => ({ year, value: average(items.filter((item) => dateYear(item.finishedOn) === year && item.score !== null).map((item) => item.score!)), count: items.filter((item) => dateYear(item.finishedOn) === year && item.score !== null).length })); return <section className="media-stats-panel"><h3>Puntuación por año de finalización</h3>{rows.length ? <div className="media-stats-score-years">{rows.map((row) => <div key={row.year}><span>{row.year}</span><ScoreTile score={row.value} /><small>{row.count} notas</small></div>)}</div> : <p>Faltan fechas de finalización para dibujar esta evolución.</p>}</section>; }
type CalendarEvent = { item: string; kind: "start" | "finish" | "activity" | "period"; units: number };
function ActivityCalendar({ items, sessions, year, mode }: { items: MediaStatItem[]; sessions: MediaStatSession[]; year: string; mode: CalendarMode }) {
  const names = new Map(items.map((item) => [item.id, item.name]));
  const values = new Map<string, CalendarEvent[]>();
  const add = (date: string | null | undefined, event: CalendarEvent) => { if (date?.startsWith(year)) values.set(date, [...(values.get(date) ?? []), event]); };
  sessions.forEach((session) => {
    const item = names.get(session.itemId) ?? "Obra eliminada";
    if (session.activityOn) {
      if (mode !== "periods") add(session.activityOn, { item, kind: "activity", units: session.units ?? 1 });
    } else {
      if (mode !== "periods") {
        add(session.startedOn, { item, kind: "start", units: 1 });
        add(session.finishedOn, { item, kind: "finish", units: 1 });
      }
      if (mode !== "activity" && session.startedOn) {
        const first = session.startedOn > `${year}-01-01` ? session.startedOn : `${year}-01-01`;
        const naturalEnd = session.finishedOn ?? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
        const last = naturalEnd < `${year}-12-31` ? naturalEnd : `${year}-12-31`;
        if (first <= last) isoDateRange(first, last).forEach((date) => add(date, { item, kind: "period", units: 0 }));
      }
    }
  });
  const totals = [...values.values()].map((events) => events.reduce((sum, event) => sum + event.units, 0));
  const max = Math.max(1, ...totals);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const exactTotal = totals.reduce((sum, value) => sum + value, 0);
  const hasPointActivity = sessions.some((session) => Boolean(session.activityOn));
  const intervalSessions = sessions.filter((session) => !session.activityOn);
  const hasStarts = intervalSessions.some((session) => Boolean(session.startedOn));
  const hasFinishes = intervalSessions.some((session) => Boolean(session.finishedOn));
  const hasEstimatedPeriods = intervalSessions.some((session) => Boolean(session.startedOn));
  const hasMixedDates = [...values.values()].some((events) => new Set(events.filter((event) => event.kind !== "period").map((event) => event.kind)).size > 1);
  return <section className="media-stats-panel media-stats-calendar"><header><h3>{mode === "periods" ? "Periodos" : "Actividad"} de {year}</h3><span>{values.size} días representados{mode !== "periods" ? ` · ${exactTotal} acciones` : ""}</span></header><div className="media-stats-calendar-legend">{mode !== "periods" && <>{hasStarts && <span><i data-kind="start" /> Inicio</span>}{hasFinishes && <span><i data-kind="finish" /> Finalización</span>}{hasPointActivity && <span title="Registro con una única fecha, como un episodio o una película vistos"><i data-kind="activity" /> Actividad puntual</span>}</>}{mode !== "activity" && hasEstimatedPeriods && <span><i data-kind="period" /> Periodo estimado</span>}{mode !== "periods" && hasMixedDates && <span><i data-kind="mixed" /> Varias</span>}</div><div className="media-stats-calendar-months">{monthNames.map((name, month) => {
    const daysInMonth = new Date(Number(year), month + 1, 0).getDate();
    const firstWeekday = (new Date(Number(year), month, 1).getDay() + 6) % 7;
    return <section key={name}><h4>{name}</h4><div className="media-stats-calendar-weekdays"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div className="media-stats-calendar-month">{Array.from({ length: daysInMonth }, (_, day) => {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`;
      const events = values.get(date) ?? [];
      const count = events.reduce((sum, event) => sum + event.units, 0);
      const exactKinds = [...new Set(events.filter((event) => event.kind !== "period").map((event) => event.kind))];
      const kinds = exactKinds.length ? exactKinds : [...new Set(events.map((event) => event.kind))];
      const kind = kinds.length > 1 ? "mixed" : kinds[0] ?? "none";
      const detail = events.map((event) => `${event.item}: ${event.kind === "start" ? "inicio" : event.kind === "finish" ? "finalización" : event.kind === "period" ? "periodo de lectura estimado" : event.units === 1 ? "actividad" : `${event.units} actividades`}`).filter((value, index, all) => all.indexOf(value) === index).join("\n");
      const summary = count ? `${count} ${count === 1 ? "acción" : "acciones"}` : events.length ? "periodo estimado" : "sin actividad";
      return <i data-kind={kind} data-level={events.length ? Math.max(1, Math.ceil(count / max * 4)) : 0} key={date} style={day === 0 ? { gridColumnStart: firstWeekday + 1 } : undefined} title={`${day + 1} de ${name.toLocaleLowerCase("es")}: ${summary}${detail ? `\n${detail}` : ""}`} />;
    })}</div></section>;
  })}</div></section>;
}

function isoDateRange(first: string, last: string) {
  const dates: string[] = [];
  const cursor = new Date(`${first}T00:00:00Z`);
  const end = new Date(`${last}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
