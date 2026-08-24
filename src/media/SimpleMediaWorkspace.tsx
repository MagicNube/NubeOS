import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Edit3,
  Film,
  History,
  Library,
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
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import type {
  MediaArea,
  MediaDetail,
  MediaTitle,
  MediaTitleInput,
  MediaStatistics,
  MovieViewing,
  TrackingStatus,
} from "./api";
import { mediaApi, mediaErrorMessage } from "./api";
import CoverImage from "./CoverImage";
import { MediaTitleForm } from "./MediaForms";
import {
  formatDate,
  formatScore,
  scoreColor,
  scoreTone,
  statusLabel,
  todayMadrid,
  trackingStatuses,
} from "./presentation";
import "./media.css";

type SimpleArea = Extract<MediaArea, "series" | "movies">;

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
  const [statistics, setStatistics] = useState<MediaStatistics | null>(null);
  const [statisticsYear, setStatisticsYear] = useState("");
  const [statisticsMinimumScore, setStatisticsMinimumScore] = useState("");
  const [allViewings, setAllViewings] = useState<MovieViewing[]>([]);
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [viewings, setViewings] = useState<MovieViewing[]>([]);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingStatus | "">("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (showLoading = false) => {
    const id = ++requestId.current;
    if (showLoading) setLoading(true);
    try {
      const [data, viewingData, stats] = await Promise.all([mediaApi.list({
        archived, area, search: search || null, status: status || null, favoritesOnly,
      }), area === "movies" ? mediaApi.movieViewings() : Promise.resolve([]), view === "statistics" ? mediaApi.statistics({ area, completedYear: statisticsYear ? Number(statisticsYear) : null, minimumScore: statisticsMinimumScore ? Number(statisticsMinimumScore) : null }) : Promise.resolve(null)]);
      if (requestId.current === id) {
        setItems(data);
        setAllViewings(viewingData);
        if (stats) setStatistics(stats);
        setError(null);
      }
    } catch (reason) {
      if (requestId.current === id) setError(mediaErrorMessage(reason));
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [archived, area, favoritesOnly, search, statisticsMinimumScore, statisticsYear, status, view]);

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

  async function open(id: string) {
    const result = await run(async () => {
      const [media, movieViewings] = await Promise.all([mediaApi.get(id), area === "movies" ? mediaApi.movieViewings(id) : Promise.resolve([])]);
      setViewings(movieViewings); return media;
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

  const Icon = copy.icon;
  return (
    <section className="media-workspace simple-media-workspace">
      {area === "movies" && <nav aria-label="Vistas de Películas" className="media-tabs simple-media-tabs"><button className={view === "library" ? "active" : ""} onClick={() => setView("library")} type="button"><Library size={16} /> Biblioteca</button><button className={view === "history" ? "active" : ""} onClick={() => { setView("history"); setArchived(false); setDetail(null); setSearch(""); setStatus(""); setFavoritesOnly(false); }} type="button"><History size={16} /> Historial</button><button className={view === "statistics" ? "active" : ""} onClick={() => { setView("statistics"); setArchived(false); setDetail(null); }} type="button"><BarChart3 size={16} /> Estadísticas</button></nav>}
      <div className="library-heading-row simple-media-heading">
        <header className="media-view-heading">
          <span>{view === "history" ? "TU HISTORIAL" : view === "statistics" ? "TU COLECCIÓN" : archived ? "ARCHIVO" : "TU COLECCIÓN"}</span>
          <h2>{view === "history" ? "Visionados" : view === "statistics" ? "Estadísticas" : archived ? `${copy.plural[0].toUpperCase()}${copy.plural.slice(1)} archivadas` : `Tus ${copy.plural}`}</h2>
          <p>{view === "history" ? "Primeros visionados y revisiones, conservados por separado." : archived ? "Restaura o elimina definitivamente." : area === "series" ? "Un seguimiento sencillo de lo que ves y por dónde vas." : "Pendientes, vistas y valoraciones sin mezclarlas con el anime."}</p>
        </header>
        {view === "library" && <div className="simple-media-heading-actions">
          <button className="text-action" onClick={() => { setArchived(!archived); setDetail(null); }} type="button">
            {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
            {archived ? "Volver" : "Archivo"}
          </button>
          {!archived && (
            <button className="primary-button" onClick={() => setForm("new")} type="button">
              <Plus size={17} /> Añadir {copy.singular}
            </button>
          )}
        </div>}
      </div>

      {error && (
        <div className="media-error" role="alert">
          {error}
          <button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={16} /></button>
        </div>
      )}

      {view === "statistics" && area === "movies" ? <SimpleMediaStatistics data={statistics} entries={allViewings} minimumScore={statisticsMinimumScore} setMinimumScore={setStatisticsMinimumScore} setYear={setStatisticsYear} year={statisticsYear} /> : view === "history" && area === "movies" ? <MovieHistory entries={allViewings} titles={items} edit={async (id, date) => { const result = await run(() => mediaApi.updateMovieViewing(id, date)); if (result) await load(false); }} remove={async (id) => { if (!window.confirm("¿Eliminar este visionado del historial?")) return; const result = await run(() => mediaApi.deleteMovieViewing(id)); if (result) await load(false); }} /> : <><div className="media-filters">
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
        <FavoriteFilter active={favoritesOnly} onChange={setFavoritesOnly} />
      </div>

      {loading ? (
        <div className="media-empty"><Icon size={28} /><strong>Cargando {copy.plural}…</strong></div>
      ) : items.length === 0 ? (
        <div className="media-empty"><Icon size={28} /><strong>{archived ? "El Archivo está vacío." : copy.empty}</strong></div>
      ) : (
        <div className="library-grid">
          {items.map((item) => (
            <article className="library-card" key={item.id}>
              <button className="library-card-open" onClick={() => void open(item.id)} type="button">
                <div className="library-cover-wrap">
                  <CoverImage alt={`Portada de ${item.name}`} hasCover={item.hasCover} titleId={item.id} />
                  <span className={`media-status status-${item.status}`}>{statusLabel(item.status)}</span>
                  {item.favorite && <Star className="library-favorite" fill="currentColor" size={17} />}
                </div>
                <div className="library-card-copy">
                  <span>{area === "series" ? "Serie" : "Película"}</span>
                  <h3>{item.name}</h3>
                  {item.alternativeTitle && <p>{item.alternativeTitle}</p>}
                  <div>
                    <strong>{simpleProgress(item, area)}</strong>
                    <b className={`media-score-badge score-${scoreTone(item.score)}`} style={{ color: scoreColor(item.score) }}>{item.score === null ? "—" : formatScore(item.score)}</b>
                  </div>
                </div>
              </button>
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
          edit={() => setForm("edit")}
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
          addViewing={async (date) => { const result = await run(() => mediaApi.createMovieViewing(detail.title.id, date)); if (!result) return false; setViewings(result); setDetail(await mediaApi.get(detail.title.id)); await load(false); return true; }}
          editViewing={async (id, date) => { const result = await run(() => mediaApi.updateMovieViewing(id, date)); if (!result) return; setViewings(result); setDetail(await mediaApi.get(detail.title.id)); await load(false); }}
          deleteViewing={async (id) => { const result = await run(() => mediaApi.deleteMovieViewing(id)); if (!result) return; setViewings(result); setDetail(await mediaApi.get(detail.title.id)); await load(false); }}
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
  archive,
  restore,
  remove,
  viewings,
  addViewing,
  editViewing,
  deleteViewing,
}: {
  detail: MediaDetail;
  area: SimpleArea;
  busy: boolean;
  close: () => void;
  edit: () => void;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  remove: () => Promise<void>;
  viewings: MovieViewing[];
  addViewing: (date: string) => Promise<boolean>;
  editViewing: (id: string, date: string) => Promise<void>;
  deleteViewing: (id: string) => Promise<void>;
}) {
  const { title } = detail;
  const [watchedOn, setWatchedOn] = useState(title.finishedOn ?? todayMadrid());
  const [detailView, setDetailView] = useState<"summary" | "history">("summary");
  return (
    <Modal className="media-detail-dialog simple-media-detail-dialog" labelledBy="simple-media-detail-title" onClose={close}>
      <article className={`media-detail simple-media-detail simple-${area}-detail`}>
        <header className="media-detail-header">
          <CoverImage alt={`Portada de ${title.name}`} className="media-detail-cover" hasCover={title.hasCover} titleId={title.id} />
          <div className="media-detail-heading">
            <div className="media-detail-kickers">
              <span>{area === "series" ? "Serie" : "Película"}</span>
              <span className={`media-status status-${title.status}`}>{statusLabel(title.status)}</span>
              {title.favorite && <Star aria-label="Favorito" fill="currentColor" size={15} />}
            </div>
            <h2 id="simple-media-detail-title">{title.name}</h2>
            {title.alternativeTitle && <p>{title.alternativeTitle}</p>}
          </div>
          <div className="media-detail-actions">
            {!title.archived ? (
              <>
                <button className="secondary-button" onClick={edit} type="button"><Edit3 size={16} /> Editar</button>
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

        {area === "movies" && <TrackerDetailTabs onChange={setDetailView} value={detailView} />}

        {area === "series" && <><TrackerMetricGrid metrics={[
          { label: "Puntuación", value: formatScore(title.score), color: scoreColor(title.score) },
          { label: "Por dónde vas", value: seriesPosition(title) },
          { label: "Estado", value: statusLabel(title.status) },
        ]} /><section className="simple-series-dates">
          <Fact label="Empezada" value={title.startedOn ? formatDate(title.startedOn) : "Sin indicar"} />
          <Fact label="Finalizada" value={title.finishedOn ? formatDate(title.finishedOn) : "Sin indicar"} />
        </section></>}

        {area === "movies" && detailView === "summary" && <><TrackerMetricGrid metrics={[{ label: "Puntuación", value: formatScore(title.score), color: scoreColor(title.score) }, { label: "Visionados", value: viewings.length }, { label: "Estado", value: title.watchedUnits ? "Vista" : "Pendiente" }]} />{title.opinion && <section className="media-opinion"><span>Opinión</span><p>{title.opinion}</p></section>}</>}

        {area === "movies" && detailView === "history" && !title.archived && (
          <section className="media-detail-section simple-watch-control">
            <div>
              <CalendarDays size={17} />
              <input max={todayMadrid()} onChange={(event) => setWatchedOn(event.target.value)} type="date" value={watchedOn} />
            </div>
            <button className="primary-button" disabled={busy} onClick={() => void addViewing(watchedOn)} type="button">
              {viewings.length ? "Registrar revisionado" : "Marcar como vista"}
            </button>
          </section>
        )}

        {area === "movies" && detailView === "history" && viewings.length > 0 && <section className="media-detail-section simple-movie-history"><h3><History size={17} /> Historial de visionados</h3>{viewings.map((viewing, index) => <article key={viewing.id}><strong>{index === viewings.length - 1 ? "Primer visionado" : `Revisionado ${viewings.length - index - 1}`}</strong><input max={todayMadrid()} onChange={(event) => void editViewing(viewing.id, event.target.value)} type="date" value={viewing.watchedOn} /><button className="media-icon-button" onClick={() => { if (window.confirm("¿Eliminar este visionado del historial?")) void deleteViewing(viewing.id); }} title="Eliminar" type="button"><Trash2 size={15} /></button></article>)}</section>}

        {area === "series" && title.opinion && <section className="media-opinion"><span>Opinión</span><p>{title.opinion}</p></section>}

        {area === "series" && detail.contents.length > 0 && (
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
  );
}

function SimpleMediaStatistics({ data, entries, year, minimumScore, setYear, setMinimumScore }: { data: MediaStatistics | null; entries: MovieViewing[]; year: string; minimumScore: string; setYear: (value: string) => void; setMinimumScore: (value: string) => void }) {
  const years = [...new Set(entries.map((entry) => entry.watchedOn.slice(0, 4)))].sort((left, right) => right.localeCompare(left));
  if (!data) return <div className="media-empty"><strong>Cargando estadísticas…</strong></div>;
  return <section className="simple-media-statistics">
    <div className="media-stat-filters"><SelectControl><select aria-label="Filtrar estadísticas por año" onChange={(event) => setYear(event.target.value)} value={year}><option value="">Todos los años</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></SelectControl><SelectControl><select aria-label="Filtrar estadísticas por puntuación mínima" onChange={(event) => setMinimumScore(event.target.value)} value={minimumScore}><option value="">Cualquier puntuación</option><option value="5">5 o más</option><option value="6">6 o más</option><option value="7">7 o más</option><option value="8">8 o más</option><option value="9">9 o más</option></select></SelectControl></div>
    <TrackerMetricGrid metrics={[{ label: "Películas", value: data.activeTitles }, { label: "Vistas", value: data.completedMovies }, { label: "Puntuación media", value: formatScore(data.averageScore), color: scoreColor(data.averageScore) }]} />
  </section>;
}

function MovieHistory({
  entries,
  titles,
  edit,
  remove,
}: {
  entries: MovieViewing[];
  titles: MediaTitle[];
  edit: (id: string, date: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [titleId, setTitleId] = useState("");
  const [year, setYear] = useState("");
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
              <div><Film size={17} /><span><strong>{titleNames.get(entry.titleId)}</strong><small>{formatDate(entry.watchedOn)}</small></span></div>
              <input aria-label={`Fecha de visionado de ${titleNames.get(entry.titleId)}`} max={todayMadrid()} onChange={(event) => { if (event.target.value) void edit(entry.id, event.target.value); }} type="date" value={entry.watchedOn} />
              <button aria-label={`Eliminar visionado de ${titleNames.get(entry.titleId)}`} className="media-icon-button" onClick={() => void remove(entry.id)} title="Eliminar visionado" type="button"><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
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
