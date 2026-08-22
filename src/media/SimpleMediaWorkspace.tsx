import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Edit3,
  Film,
  Heart,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import type {
  MediaArea,
  MediaDetail,
  MediaTitle,
  MediaTitleInput,
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
  const [detail, setDetail] = useState<MediaDetail | null>(null);
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
      const data = await mediaApi.list({
        archived,
        area,
        search: search || null,
        status: status || null,
        favoritesOnly,
      });
      if (requestId.current === id) {
        setItems(data);
        setError(null);
      }
    } catch (reason) {
      if (requestId.current === id) setError(mediaErrorMessage(reason));
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [archived, area, favoritesOnly, search, status]);

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
    const result = await run(() => mediaApi.get(id));
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
      <div className="library-heading-row simple-media-heading">
        <header className="media-view-heading">
          <span>{archived ? "ARCHIVO" : "TU COLECCIÓN"}</span>
          <h2>{archived ? `${copy.plural[0].toUpperCase()}${copy.plural.slice(1)} archivadas` : `Tus ${copy.plural}`}</h2>
          <p>{archived ? "Restaura o elimina definitivamente." : area === "series" ? "Un seguimiento sencillo de lo que ves y por dónde vas." : "Pendientes, vistas y valoraciones sin mezclarlas con el anime."}</p>
        </header>
        <div className="simple-media-heading-actions">
          <button className="text-action" onClick={() => { setArchived(!archived); setDetail(null); }} type="button">
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

      <div className="media-filters">
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
        <button className={favoritesOnly ? "favorite-filter active" : "favorite-filter"} onClick={() => setFavoritesOnly(!favoritesOnly)} type="button">
          <Heart fill={favoritesOnly ? "currentColor" : "none"} size={16} /> Favoritos
        </button>
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
              {archived && (
                <div className="library-archive-actions">
                  <button disabled={busy} onClick={async () => { if (await runAction(() => mediaApi.restore(item.id))) await load(false); }} type="button"><RotateCcw size={15} /> Restaurar</button>
                  <button disabled={busy} onClick={async () => {
                    if (!window.confirm(`¿Eliminar definitivamente “${item.name}” y todo su historial?`)) return;
                    if (await runAction(() => mediaApi.delete(item.id))) await load(false);
                  }} type="button"><Trash2 size={15} /> Eliminar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {detail && (
        <SimpleMediaDetail
          area={area}
          busy={busy}
          close={() => setDetail(null)}
          detail={detail}
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
          setWatched={(watched, date) => updateDetail(() => mediaApi.setProgress("title", detail.title.id, watched, date))}
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
  setWatched,
}: {
  detail: MediaDetail;
  area: SimpleArea;
  busy: boolean;
  close: () => void;
  edit: () => void;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  remove: () => Promise<void>;
  setWatched: (watched: number, date: string) => Promise<boolean>;
}) {
  const { title } = detail;
  const [watchedOn, setWatchedOn] = useState(title.finishedOn ?? todayMadrid());
  return (
    <Modal className="media-detail-dialog simple-media-detail-dialog" labelledBy="simple-media-detail-title" onClose={close}>
      <article className="media-detail">
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
            <strong className={`simple-media-score media-score-badge score-${scoreTone(title.score)}`} style={{ color: scoreColor(title.score) }}>{formatScore(title.score)}</strong>
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

        <section className="simple-media-facts">
          {area === "series" && (
            <>
              <Fact label="Por dónde vas" value={seriesPosition(title)} />
              <Fact label="Empezada" value={title.startedOn ? formatDate(title.startedOn) : "Sin indicar"} />
              <Fact label="Finalizada" value={title.finishedOn ? formatDate(title.finishedOn) : "Sin indicar"} />
            </>
          )}
          {area === "movies" && (
            <>
              <Fact label="Visionado" value={title.watchedUnits ? "Vista" : "Pendiente"} />
              <Fact label="Fecha" value={title.finishedOn ? formatDate(title.finishedOn) : "Sin indicar"} />
              <Fact label="Sesiones" value={detail.sessions.length.toString()} />
            </>
          )}
        </section>

        {area === "movies" && !title.archived && (
          <section className="media-detail-section simple-watch-control">
            <div>
              <CalendarDays size={17} />
              <input max={todayMadrid()} onChange={(event) => setWatchedOn(event.target.value)} type="date" value={watchedOn} />
            </div>
            <button className={title.watchedUnits ? "secondary-button" : "primary-button"} disabled={busy} onClick={() => void setWatched(title.watchedUnits ? 0 : 1, watchedOn)} type="button">
              {title.watchedUnits ? "Volver a pendiente" : "Marcar como vista"}
            </button>
          </section>
        )}

        {title.opinion && <section className="media-opinion"><span>Opinión</span><p>{title.opinion}</p></section>}

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
