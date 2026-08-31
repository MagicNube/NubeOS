import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Edit3,
  Film,
  History,
  Library,
  Move,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import Modal from "../ui/Modal";
import FavoriteFilter from "../ui/FavoriteFilter";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import ScoreTile from "../ui/ScoreTile";
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import MediaStatisticsDashboard from "../ui/MediaStatisticsDashboard";
import type {
  MediaArea,
  MediaDetail,
  MediaTitle,
  MediaTitleInput,
  MovieViewing,
  SeriesRun,
  TrackingStatus,
} from "./api";
import { mediaApi, mediaErrorMessage } from "./api";
import CoverImage from "./CoverImage";
import CoverPositionEditor from "./CoverPositionEditor";
import { MediaTitleForm } from "./MediaForms";
import { resolveInferredMediaStatus } from "./statusChoice";
import {
  formatDate,
  formatScore,
  statusLabel,
  todayMadrid,
  trackingStatuses,
} from "./presentation";
import "./media.css";

type SimpleArea = Extract<MediaArea, "series" | "movies">;
type SimpleSort = "updated" | "title" | "score" | "startAsc" | "startDesc" | "finishAsc" | "finishDesc";

export default function SimpleMediaWorkspace({ area }: { area: SimpleArea }) {
  const copy = area === "series"
    ? {
        singular: "serie",
        plural: "series",
        empty: "Todavía no has añadido ninguna serie.",
        icon: Tv,
      }
    : {
        singular: "película",
        plural: "películas",
        empty: "Todavía no has añadido ninguna película.",
        icon: Film,
      };
  const [items, setItems] = useState<MediaTitle[]>([]);
  const [view, setView] = useState<"library" | "history" | "statistics">("library");
  const [allViewings, setAllViewings] = useState<MovieViewing[]>([]);
  const [allSeriesRuns, setAllSeriesRuns] = useState<SeriesRun[]>([]);
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [viewings, setViewings] = useState<MovieViewing[]>([]);
  const [seriesRuns, setSeriesRuns] = useState<SeriesRun[]>([]);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingStatus | "">("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<"" | "unscored">("");
  const [sort, setSort] = useState<SimpleSort>(() => (localStorage.getItem(`nubeos.${area}.sort`) as SimpleSort) || "updated");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => { localStorage.setItem(`nubeos.${area}.sort`, sort); }, [area, sort]);

  const sortedItems = useMemo(() => items.filter((item) => !scoreFilter || item.score === null).sort((left, right) => {
    if (sort === "updated") return 0;
    if (sort === "title") return left.name.localeCompare(right.name, "es");
    if (sort === "score") return (right.score ?? -1) - (left.score ?? -1) || left.name.localeCompare(right.name, "es");
    const first = sort.startsWith("start") ? left.startedOn : left.finishedOn;
    const second = sort.startsWith("start") ? right.startedOn : right.finishedOn;
    if (!first) return second ? 1 : 0;
    if (!second) return -1;
    return sort.endsWith("Asc") ? first.localeCompare(second) : second.localeCompare(first);
  }), [items, scoreFilter, sort]);

  const load = useCallback(async (showLoading = false) => {
    const id = ++requestId.current;
    if (showLoading) setLoading(true);
    try {
      const data = await mediaApi.list({
        archived: view === "statistics" ? false : archived,
        area,
        search: view === "library" ? search || null : null,
        status: view === "library" ? status || null : null,
        favoritesOnly: view === "library" && favoritesOnly,
      });
      const [viewingData, seriesRunData] = await Promise.all([
        area === "movies" ? mediaApi.movieViewings() : Promise.resolve([]),
        area === "series" && view === "statistics" ? mediaApi.seriesRuns() : Promise.resolve([]),
      ]);
      if (requestId.current === id) {
        setItems(data);
        setAllViewings(viewingData);
        setAllSeriesRuns(seriesRunData);
        setError(null);
      }
    } catch (reason) {
      if (requestId.current === id) setError(mediaErrorMessage(reason));
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [archived, area, favoritesOnly, search, status, view]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(loading), 150);
    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [load]);

  async function run<T>(operation: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    try {
      const result = await operation();
      setError(null);
      return result;
    } catch (reason) {
      setError(mediaErrorMessage(reason));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function runAction(operation: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    try {
      await operation();
      setError(null);
      return true;
    } catch (reason) {
      setError(mediaErrorMessage(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function showArchive() {
    setArchived((current) => !current);
    setView("library");
    setDetail(null);
  }

  async function open(id: string) {
    const result = await run(async () => {
      const [media, movieViewings, runs] = await Promise.all([mediaApi.get(id), area === "movies" ? mediaApi.movieViewings(id) : Promise.resolve([]), area === "series" ? mediaApi.seriesRuns(id) : Promise.resolve([])]);
      setViewings(movieViewings); setSeriesRuns(runs); return media;
    });
    if (result) setDetail(result);
  }

  async function updateDetail(operation: () => Promise<MediaDetail>) {
    const result = await run(operation);
    if (!result) return false;
    setDetail(result);
    await load(false);
    return true;
  }

  async function mutateViewingKeepingChoice(
    before: MediaDetail,
    operation: () => Promise<MovieViewing[]>,
  ) {
    const nextViewings = await operation();
    const inferred = await mediaApi.get(before.title.id);
    const nextDetail = await resolveInferredMediaStatus(before, inferred);
    return { detail: nextDetail, viewings: nextViewings };
  }

  async function mutateSeriesRunKeepingChoice(
    before: MediaDetail,
    operation: () => Promise<SeriesRun[]>,
  ) {
    const runs = await operation();
    const inferred = await mediaApi.get(before.title.id);
    const nextDetail = await resolveInferredMediaStatus(before, inferred);
    return { detail: nextDetail, runs };
  }

  const Icon = copy.icon;
  return (
    <section className="media-workspace simple-media-workspace">
      <nav aria-label={`Vistas de ${area === "movies" ? "Películas" : "Series"}`} className="media-tabs simple-media-tabs">
        <button className={view === "library" ? "active" : ""} onClick={() => setView("library")} type="button"><Library size={16} /> Biblioteca</button>
        {area === "movies" && <button className={view === "history" ? "active" : ""} onClick={() => { setView("history"); setArchived(false); setDetail(null); setSearch(""); setStatus(""); setFavoritesOnly(false); }} type="button"><History size={16} /> Historial</button>}
        <button className={view === "statistics" ? "active" : ""} onClick={() => { setView("statistics"); setArchived(false); setDetail(null); }} type="button"><BarChart3 size={16} /> Estadísticas</button>
      </nav>
      <div className="library-heading-row simple-media-heading">
        <header className="media-view-heading">
          <span>{view === "history" ? "TU HISTORIAL" : view === "statistics" ? "TU COLECCIÓN" : archived ? "ARCHIVO" : "TU COLECCIÓN"}</span>
          <h2>{view === "history" ? "Visionados" : view === "statistics" ? "Estadísticas" : archived ? `${copy.plural[0].toUpperCase()}${copy.plural.slice(1)} archivadas` : `Tus ${copy.plural}`}</h2>
          <p>{view === "history" ? "Primeros visionados y revisiones, conservados por separado." : archived ? "Restaura o elimina definitivamente." : area === "series" ? "Un seguimiento sencillo de lo que ves y por dónde vas." : "Pendientes, vistas y valoraciones sin mezclarlas con el anime."}</p>
        </header>
        <div className="simple-media-heading-actions">
          <button className="text-action" onClick={showArchive} type="button">
            {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
            {archived ? "Volver" : "Archivo"}
          </button>
          {!archived && (
            <button className="primary-button" onClick={() => setForm("new")} type="button">
              <Plus size={17} /> Añadir {copy.singular}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="media-error" role="alert">
          {error}
          <button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={16} /></button>
        </div>
      )}

      {view === "statistics" ? <SimpleMediaStatistics area={area} entries={allViewings} items={items} open={open} runs={allSeriesRuns} showUnscored={() => { setScoreFilter("unscored"); setView("library"); setArchived(false); }} /> : view === "history" && area === "movies" ? <MovieHistory entries={allViewings} titles={items} edit={async (entry, date) => { const result = await run(async () => { const before = await mediaApi.get(entry.titleId); return mutateViewingKeepingChoice(before, () => mediaApi.updateMovieViewing(entry.id, date)); }); if (result) await load(false); }} remove={async (entry) => { if (!window.confirm("¿Eliminar este visionado del historial?")) return; const result = await run(async () => { const before = await mediaApi.get(entry.titleId); return mutateViewingKeepingChoice(before, () => mediaApi.deleteMovieViewing(entry.id)); }); if (result) await load(false); }} /> : <><div className="media-filters">
        <label className="media-search">
          <Search size={17} />
          <input onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${copy.plural}`} value={search} />
        </label>
        <SelectControl>
          <select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as TrackingStatus | "")} value={status}>
            <option value="">Todos los estados</option>
            {trackingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </SelectControl>
        <SelectControl><select aria-label="Filtrar por puntuación" onChange={(event) => setScoreFilter(event.target.value as "" | "unscored")} value={scoreFilter}><option value="">Todas las puntuaciones</option><option value="unscored">Sin puntuar</option></select></SelectControl>
        <SelectControl>
          <select aria-label="Ordenar colección" onChange={(event) => setSort(event.target.value as SimpleSort)} value={sort}>
            <option value="updated">Actualizados recientemente</option>
            <option value="title">Título</option>
            <option value="score">Puntuación</option>
            <option value="startAsc">Inicio (más antiguos)</option>
            <option value="startDesc">Inicio (más recientes)</option>
            <option value="finishAsc">Fin (más antiguos)</option>
            <option value="finishDesc">Fin (más recientes)</option>
          </select>
        </SelectControl>
        {!archived && <FavoriteFilter active={favoritesOnly} onChange={setFavoritesOnly} />}
      </div>

      {loading ? (
        <div className="media-empty"><Icon size={28} /><strong>Cargando {copy.plural}…</strong></div>
      ) : sortedItems.length === 0 ? (
        <div className="media-empty"><Icon size={28} /><strong>{archived ? "El Archivo está vacío." : copy.empty}</strong></div>
      ) : (
        <div className="library-grid">
          {sortedItems.map((item) => (
            <article className="library-card" key={item.id}>
              <button className="library-card-open" onClick={() => void open(item.id)} type="button">
                <div className="library-cover-wrap">
                  <CoverImage alt={`Portada de ${item.name}`} animated={item.animatedCover} hasCover={item.hasCover} positionX={item.coverPositionX} positionY={item.coverPositionY} titleId={item.id} zoom={item.coverZoom} />
                </div>
                <div className="library-card-copy">
                  <span className={`media-status status-${item.status}`}>{statusLabel(item.status)}</span>
                  <h3>{item.name}</h3>
                  <div>
                    <div className={`simple-media-card-dates${area === "movies" ? " single" : ""}`}>
                      {area === "movies" ? <div><small>Último visionado</small><strong>{item.finishedOn ? formatDate(item.finishedOn) : "Sin visionados"}</strong></div> : <><div><small>Inicio</small><strong>{item.startedOn ? formatDate(item.startedOn) : "Sin indicar"}</strong></div><div><small>Fin</small><strong>{item.finishedOn ? formatDate(item.finishedOn) : item.startedOn ? "En curso" : simpleProgress(item, area)}</strong></div></>}
                    </div>
                    <ScoreTile className="media-score-badge" score={item.score} />
                  </div>
                </div>
              </button>
              {!archived && <button aria-label={item.favorite ? `Quitar ${item.name} de favoritos` : `Añadir ${item.name} a favoritos`} className={`library-favorite-toggle${item.favorite ? " active" : ""}`} disabled={busy} onClick={() => void (async () => { if (await runAction(() => mediaApi.setTitleFavorite(item.id, !item.favorite))) await load(false); })()} title={item.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={item.favorite ? "currentColor" : "none"} size={17} /></button>}
              {archived && <ArchiveItemActions busy={busy} itemLabel={item.name}
                restore={() => void (async () => { if (await runAction(() => mediaApi.restore(item.id))) await load(false); })()}
                remove={() => void (async () => { if (!window.confirm(`¿Eliminar definitivamente “${item.name}” y todo su historial?`)) return; if (await runAction(() => mediaApi.delete(item.id))) await load(false); })()}
              />}
            </article>
          ))}
        </div>
      )}</>}

      {detail && (
        <SimpleMediaDetail
          area={area}
          busy={busy}
          close={() => setDetail(null)}
          detail={detail}
          viewings={viewings}
          seriesRuns={seriesRuns}
          edit={() => setForm("edit")}
          setFavorite={async (favorite) => updateDetail(() => mediaApi.setTitleFavorite(detail.title.id, favorite))}
          setCoverPosition={async (x, y, zoom) => updateDetail(() => mediaApi.setCoverPosition(detail.title.id, x, y, zoom))}
          archive={async () => {
            if (await runAction(() => mediaApi.archive(detail.title.id))) {
              setDetail(null);
              await load(false);
            }
          }}
          restore={async () => {
            if (await runAction(() => mediaApi.restore(detail.title.id))) {
              setDetail(null);
              await load(false);
            }
          }}
          remove={async () => {
            if (!window.confirm(`¿Eliminar definitivamente “${detail.title.name}” y todo su historial?`)) return;
            if (await runAction(() => mediaApi.delete(detail.title.id))) {
              setDetail(null);
              await load(false);
            }
          }}
          addViewing={async (date) => { const result = await run(() => mutateViewingKeepingChoice(detail, () => mediaApi.createMovieViewing(detail.title.id, date))); if (!result) return false; setViewings(result.viewings); setDetail(result.detail); await load(false); return true; }}
          editViewing={async (id, date) => { const result = await run(() => mutateViewingKeepingChoice(detail, () => mediaApi.updateMovieViewing(id, date))); if (!result) return; setViewings(result.viewings); setDetail(result.detail); await load(false); }}
          deleteViewing={async (id) => { const result = await run(() => mutateViewingKeepingChoice(detail, () => mediaApi.deleteMovieViewing(id))); if (!result) return; setViewings(result.viewings); setDetail(result.detail); await load(false); }}
          addSeriesRun={async (startedOn, finishedOn) => { const result = await run(() => mutateSeriesRunKeepingChoice(detail, () => mediaApi.createSeriesRun(detail.title.id, startedOn, finishedOn))); if (!result) return false; setSeriesRuns(result.runs); setDetail(result.detail); await load(false); return true; }}
          editSeriesRun={async (id, startedOn, finishedOn) => { const result = await run(() => mutateSeriesRunKeepingChoice(detail, () => mediaApi.updateSeriesRun(id, startedOn, finishedOn))); if (!result) return; setSeriesRuns(result.runs); setDetail(result.detail); await load(false); }}
          deleteSeriesRun={async (id) => { const result = await run(() => mutateSeriesRunKeepingChoice(detail, () => mediaApi.deleteSeriesRun(id))); if (!result) return; setSeriesRuns(result.runs); setDetail(result.detail); await load(false); }}
        />
      )}

      {form && (
        <MediaTitleForm
          area={area}
          busy={busy}
          close={() => setForm(null)}
          detail={form === "edit" ? detail : null}
          save={async (input: MediaTitleInput) => {
            const result = await run(() => form === "edit" && detail
              ? mediaApi.updateTitle(detail.title.id, input)
              : mediaApi.createTitle(input));
            if (!result) return false;
            if (form === "edit") {
              const stillInArea = area === "series"
                ? result.title.kind === "series" && !result.title.isAnime
                : result.title.kind === "movie" && !result.title.isAnime;
              setDetail(stillInArea ? result : null);
            }
            await load(false);
            return true;
          }}
        />
      )}
    </section>
  );
}

function SimpleMediaDetail({
  detail,
  area,
  busy,
  close,
  edit,
  setFavorite,
  setCoverPosition,
  archive,
  restore,
  remove,
  viewings,
  seriesRuns,
  addViewing,
  editViewing,
  deleteViewing,
  addSeriesRun,
  editSeriesRun,
  deleteSeriesRun,
}: {
  detail: MediaDetail;
  area: SimpleArea;
  busy: boolean;
  close: () => void;
  edit: () => void;
  setFavorite: (favorite: boolean) => Promise<boolean>;
  setCoverPosition: (x: number, y: number, zoom: number) => Promise<boolean>;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  remove: () => Promise<void>;
  viewings: MovieViewing[];
  seriesRuns: SeriesRun[];
  addViewing: (date: string) => Promise<boolean>;
  editViewing: (id: string, date: string) => Promise<void>;
  deleteViewing: (id: string) => Promise<void>;
  addSeriesRun: (startedOn: string, finishedOn: string | null) => Promise<boolean>;
  editSeriesRun: (id: string, startedOn: string, finishedOn: string | null) => Promise<void>;
  deleteSeriesRun: (id: string) => Promise<void>;
}) {
  const { title } = detail;
  const [detailView, setDetailView] = useState<"summary" | "history">("summary");
  const [positioningCover, setPositioningCover] = useState(false);
  const [viewingForm, setViewingForm] = useState<MovieViewing | "new" | null>(null);
  const [viewingDate, setViewingDate] = useState(todayMadrid());
  const [seriesRunForm, setSeriesRunForm] = useState<SeriesRun | "new" | null>(null);
  return (
    <>
    <Modal className="media-detail-dialog simple-media-detail-dialog" labelledBy="simple-media-detail-title" onClose={close}>
      <article className={`media-detail simple-media-detail simple-${area}-detail`}>
        <header className="media-detail-header">
          <div className="simple-media-detail-cover-wrap ui-cover-adjust-host">
            <CoverImage alt={`Portada de ${title.name}`} animated={title.animatedCover} className="media-detail-cover" hasCover={title.hasCover} positionX={title.coverPositionX} positionY={title.coverPositionY} titleId={title.id} zoom={title.coverZoom} />
            {!title.archived && title.hasCover && <button aria-label="Ajustar encuadre de portada" className="ui-cover-adjust-button" onClick={() => setPositioningCover(true)} type="button"><Move size={14} /> Ajustar</button>}
          </div>
          <div className="media-detail-heading">
            <div className="media-detail-kickers">
              <span>{area === "series" ? "Serie" : "Película"}</span>
            </div>
            <h2 id="simple-media-detail-title">{title.name}</h2>
            {title.alternativeTitle && <p>{title.alternativeTitle}</p>}
          </div>
          <div className="media-detail-actions">
            {!title.archived ? (
              <>
                <button aria-label={title.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`media-icon-button media-favorite-button${title.favorite ? " active" : ""}`} disabled={busy} onClick={() => void setFavorite(!title.favorite)} title={title.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={title.favorite ? "currentColor" : "none"} size={17} /></button>
                <button aria-label={`Editar ${area === "series" ? "serie" : "película"}`} className="media-icon-button" onClick={edit} title="Editar" type="button"><Edit3 size={17} /></button>
                <button className="media-icon-button" disabled={busy} onClick={() => void archive()} title="Archivar" type="button"><Archive size={17} /></button>
              </>
            ) : (
              <>
                <button className="secondary-button" disabled={busy} onClick={() => void restore()} type="button"><RotateCcw size={16} /> Restaurar</button>
                <button className="danger-button" disabled={busy} onClick={() => void remove()} type="button"><Trash2 size={16} /> Eliminar</button>
              </>
            )}
            <button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={19} /></button>
          </div>
        </header>

        <TrackerDetailTabs onChange={setDetailView} value={detailView} />

        {area === "series" && detailView === "summary" && <><TrackerMetricGrid metrics={[
          { label: "Puntuación", value: formatScore(title.score), score: title.score },
          { label: "Visionados", value: seriesRuns.length },
          { label: "Estado", value: statusLabel(title.status) },
        ]} /><section className="simple-series-dates">
          <Fact label="Empezada" value={title.startedOn ? formatDate(title.startedOn) : "Sin indicar"} />
          <Fact label="Finalizada" value={title.finishedOn ? formatDate(title.finishedOn) : "Sin indicar"} />
        </section></>}

        {area === "series" && detailView === "history" && (
          <section className="media-detail-section simple-watch-control">
            <header className="simple-watch-history-header">
              <strong className="tracker-history-count"><History size={17} /> {seriesRuns.length} {seriesRuns.length === 1 ? "visionado registrado" : "visionados registrados"}</strong>
              {!title.archived && <div className="simple-watch-history-actions"><button className="primary-button" disabled={busy} onClick={() => setSeriesRunForm("new")} type="button"><Plus size={16} /> Registrar visionado</button></div>}
            </header>
            {seriesRuns.length === 0 ? <p className="simple-watch-empty">No hay visionados registrados.</p> : <div className="simple-movie-history">{seriesRuns.map((run, index) => <article key={run.id}><div><strong>{seriesRuns.length - index === 1 ? "Primer visionado" : `Visionado ${seriesRuns.length - index}`}</strong><span>{formatDate(run.startedOn)} → {run.finishedOn ? formatDate(run.finishedOn) : "En curso"}</span></div>{!title.archived && <div className="simple-movie-history-actions"><button aria-label="Editar visionado" className="media-icon-button" disabled={busy} onClick={() => setSeriesRunForm(run)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar visionado" className="media-icon-button danger" disabled={busy} onClick={() => { if (window.confirm("¿Eliminar este visionado del historial?")) void deleteSeriesRun(run.id); }} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
          </section>
        )}

        {area === "movies" && detailView === "summary" && <><TrackerMetricGrid metrics={[{ label: "Puntuación", value: formatScore(title.score), score: title.score }, { label: "Visionados", value: viewings.length }, { label: "Estado", value: statusLabel(title.status) }]} />{title.opinion && <section className="media-opinion"><span>Opinión</span><p>{title.opinion}</p></section>}</>}

        {area === "movies" && detailView === "history" && (
          <section className="media-detail-section simple-watch-control">
            <header className="simple-watch-history-header">
              <strong className="tracker-history-count"><History size={17} /> {viewings.length} {viewings.length === 1 ? "visionado registrado" : "visionados registrados"}</strong>
              {!title.archived && <div className="simple-watch-history-actions">
                <button className="secondary-button" disabled={busy} onClick={() => void addViewing(todayMadrid())} type="button"><Film size={16} /> Ver hoy</button>
                <button className="primary-button" disabled={busy} onClick={() => { setViewingDate(todayMadrid()); setViewingForm("new"); }} type="button"><Plus size={16} /> Registrar visionado</button>
              </div>}
            </header>
            {viewings.length === 0 ? <p className="simple-watch-empty">No hay visionados registrados.</p> : <div className="simple-movie-history">{viewings.map((viewing, index) => <article key={viewing.id}><div><strong>{index === viewings.length - 1 ? "Primer visionado" : `Visionado ${viewings.length - index}`}</strong><span>{formatDate(viewing.watchedOn)}</span></div>{!title.archived && <div className="simple-movie-history-actions"><button aria-label="Editar visionado" className="media-icon-button" disabled={busy} onClick={() => { setViewingDate(viewing.watchedOn); setViewingForm(viewing); }} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar visionado" className="media-icon-button danger" disabled={busy} onClick={() => { if (window.confirm("¿Eliminar este visionado del historial?")) void deleteViewing(viewing.id); }} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
          </section>
        )}

        {area === "series" && detailView === "summary" && title.opinion && <section className="media-opinion"><span>Opinión</span><p>{title.opinion}</p></section>}

        {area === "series" && detailView === "summary" && detail.contents.length > 0 && (
          <section className="media-detail-section">
            <h3>Contenido conservado</h3>
            <p className="media-muted">Esta serie tenía contenido detallado antes de separar los módulos. No se ha eliminado.</p>
            <div className="simple-legacy-content">
              {detail.contents.map((content) => <span key={content.id}><strong>{content.name}</strong><small>{content.watchedEpisodes} de {content.effectiveTotal ?? "?"}</small></span>)}
            </div>
          </section>
        )}
      </article>
    </Modal>
    {viewingForm && <ViewingDateForm busy={busy} close={() => setViewingForm(null)} initialDate={viewingDate} save={async (date) => { if (viewingForm === "new") return addViewing(date); await editViewing(viewingForm.id, date); return true; }} title={viewingForm === "new" ? "Registrar visionado" : "Editar visionado"} />}
    {seriesRunForm && <SeriesRunForm busy={busy} close={() => setSeriesRunForm(null)} run={seriesRunForm === "new" ? null : seriesRunForm} save={async (startedOn, finishedOn) => { if (seriesRunForm === "new") return addSeriesRun(startedOn, finishedOn); await editSeriesRun(seriesRunForm.id, startedOn, finishedOn); return true; }} />}
    {positioningCover && <CoverPositionEditor busy={busy} close={() => setPositioningCover(false)} landscape save={setCoverPosition} title={title} />}
    </>
  );
}

function SimpleMediaStatistics({ area, entries, items, runs, open, showUnscored }: { area: SimpleArea; entries: MovieViewing[]; items: MediaTitle[]; runs: SeriesRun[]; open: (id: string) => Promise<void>; showUnscored: () => void }) {
  return <section className="simple-media-statistics"><MediaStatisticsDashboard
    items={items.map((item) => ({ id: item.id, name: item.name, status: item.status, statusLabel: statusLabel(item.status), score: item.score, favorite: item.favorite, genres: item.genres, startedOn: item.startedOn, finishedOn: item.finishedOn }))}
    noun={area === "movies" ? "Películas" : "Series"}
    openItem={(id) => void open(id)}
    showUnscored={showUnscored}
    sessions={area === "movies" ? entries.map((entry) => ({ id: entry.id, itemId: entry.titleId, activityOn: entry.watchedOn, completed: true })) : runs.map((run) => ({ id: run.id, itemId: run.titleId, startedOn: run.startedOn, finishedOn: run.finishedOn, completed: Boolean(run.finishedOn) }))}
    storageKey={`nubeos.${area}.statistics`}
    unitLabel="Visionados"
  /></section>;
}

function MovieHistory({
  entries,
  titles,
  edit,
  remove,
}: {
  entries: MovieViewing[];
  titles: MediaTitle[];
  edit: (entry: MovieViewing, date: string) => Promise<void>;
  remove: (entry: MovieViewing) => Promise<void>;
}) {
  const [titleId, setTitleId] = useState("");
  const [year, setYear] = useState("");
  const [editing, setEditing] = useState<MovieViewing | null>(null);
  const titleNames = new Map(titles.map((title) => [title.id, title.name]));
  const visibleEntries = entries.filter((entry) => titleNames.has(entry.titleId));
  const years = [...new Set(visibleEntries.map((entry) => entry.watchedOn.slice(0, 4)))].sort((left, right) => right.localeCompare(left));
  const filtered = visibleEntries.filter((entry) => (!titleId || entry.titleId === titleId) && (!year || entry.watchedOn.startsWith(year)));

  return (
    <section className="simple-movie-history-view">
      <div className="simple-movie-history-filters">
        <SelectControl>
          <select aria-label="Filtrar historial por película" onChange={(event) => setTitleId(event.target.value)} value={titleId}>
            <option value="">Todas las películas</option>
            {titles.map((title) => <option key={title.id} value={title.id}>{title.name}</option>)}
          </select>
        </SelectControl>
        <SelectControl>
          <select aria-label="Filtrar historial por año" onChange={(event) => setYear(event.target.value)} value={year}>
            <option value="">Todos los años</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </SelectControl>
      </div>
      {filtered.length === 0 ? (
        <div className="media-empty"><History size={28} /><strong>Todavía no hay visionados con estos filtros.</strong></div>
      ) : (
        <div className="simple-movie-history-list">
          {filtered.map((entry) => (
            <article key={entry.id}>
              <CalendarDays size={18} />
              <div><strong>{titleNames.get(entry.titleId)}</strong><span>{formatDate(entry.watchedOn)}</span></div>
              <div className="simple-movie-history-actions">
                <button aria-label={`Editar visionado de ${titleNames.get(entry.titleId)}`} className="media-icon-button" onClick={() => setEditing(entry)} title="Editar visionado" type="button"><Edit3 size={15} /></button>
                <button aria-label={`Eliminar visionado de ${titleNames.get(entry.titleId)}`} className="media-icon-button danger" onClick={() => void remove(entry)} title="Eliminar visionado" type="button"><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <ViewingDateForm close={() => setEditing(null)} initialDate={editing.watchedOn} save={async (date) => { await edit(editing, date); return true; }} title="Editar visionado" />}
    </section>
  );
}

function ViewingDateForm({ title, initialDate, busy = false, close, save }: { title: string; initialDate: string; busy?: boolean; close: () => void; save: (date: string) => Promise<boolean> }) {
  const [date, setDate] = useState(initialDate);
  return <Modal className="simple-viewing-modal" labelledBy="simple-viewing-title" onClose={close}>
    <form onSubmit={async (event) => { event.preventDefault(); if (await save(date)) close(); }}>
      <header><div><h2 id="simple-viewing-title">{title}</h2><p>Indica cuándo viste esta película.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header>
      <label>Fecha de visionado<SmartDateInput max={todayMadrid()} onChange={setDate} required value={date} /></label>
      <footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !date} type="submit">Guardar</button></footer>
    </form>
  </Modal>;
}

function SeriesRunForm({ run, busy, close, save }: { run: SeriesRun | null; busy: boolean; close: () => void; save: (startedOn: string, finishedOn: string | null) => Promise<boolean> }) {
  const [startedOn, setStartedOn] = useState(run?.startedOn ?? todayMadrid());
  const [finishedOn, setFinishedOn] = useState(run?.finishedOn ?? "");
  return <Modal className="simple-viewing-modal" labelledBy="series-run-title" onClose={close}>
    <form onSubmit={async (event) => { event.preventDefault(); if (await save(startedOn, finishedOn || null)) close(); }}>
      <header><div><h2 id="series-run-title">{run ? "Editar visionado" : "Registrar visionado"}</h2><p>Guarda el periodo en el que viste esta serie.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header>
      <div className="simple-series-run-fields"><label>Fecha de inicio<SmartDateInput max={todayMadrid()} onChange={setStartedOn} required value={startedOn} /></label><label>Fecha final (opcional)<SmartDateInput max={todayMadrid()} min={startedOn} onChange={setFinishedOn} value={finishedOn} /></label></div>
      <footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !startedOn || Boolean(finishedOn && finishedOn < startedOn)} type="submit">Guardar</button></footer>
    </form>
  </Modal>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function seriesPosition(title: MediaTitle): string {
  if (!title.currentSeason && !title.currentEpisode) return "Sin indicar";
  return [title.currentSeason ? `T${title.currentSeason}` : null, title.currentEpisode ? `E${title.currentEpisode}` : null].filter(Boolean).join(" · ");
}

function simpleProgress(title: MediaTitle, area: SimpleArea): string {
  return area === "series" ? seriesPosition(title) : title.watchedUnits ? "Vista" : "Pendiente";
}
