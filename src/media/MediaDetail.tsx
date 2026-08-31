import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Edit3,
  GripVertical,
  History,
  Lightbulb,
  ListVideo,
  Move,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../ui/Modal";
import ScoreTile from "../ui/ScoreTile";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import type {
  MediaContent,
  MediaDetail,
  MovieViewing,
  ProgressTarget,
  TrackingStatus,
  WatchSession,
} from "./api";
import CoverImage from "./CoverImage";
import CoverPositionEditor from "./CoverPositionEditor";
import {
  canonLabel,
  contentKindLabel,
  formatDate,
  formatScore,
  kindLabel,
  progressLabel,
  scoreColor,
  statusLabel,
  todayMadrid,
  trackingStatuses,
} from "./presentation";

export default function MediaDetailView({
  detail,
  movieViewings,
  busy,
  close,
  editTitle,
  addContent,
  editContent,
  increment,
  setProgress,
  removeContent,
  omitContent,
  reorder,
  archive,
  restore,
  removeTitle,
  setTitleStatus,
  setTitleScore,
  setTitleFavorite,
  openHistory,
  updateHistoryDates,
  deleteHistoryGroup,
  addMovieViewing,
  editMovieViewing,
  deleteMovieViewing,
  setCoverPosition,
}: {
  detail: MediaDetail;
  movieViewings: MovieViewing[];
  busy: boolean;
  close: () => void;
  editTitle: () => void;
  addContent: () => void;
  editContent: (content: MediaContent) => void;
  increment: (type: ProgressTarget, id: string) => Promise<void>;
  setProgress: (
    type: ProgressTarget,
    id: string,
    watched: number,
    date: string,
  ) => Promise<boolean>;
  removeContent: (content: MediaContent) => Promise<void>;
  omitContent: (content: MediaContent) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  removeTitle: () => Promise<void>;
  setTitleStatus: (status: TrackingStatus) => Promise<void>;
  setTitleScore: (score: number | null) => Promise<void>;
  setTitleFavorite: (favorite: boolean) => Promise<void>;
  openHistory: (titleId: string, contentId?: string) => void;
  updateHistoryDates: (sessionIds: string[], watchedOn: string) => Promise<boolean>;
  deleteHistoryGroup: (sessionIds: string[]) => Promise<boolean>;
  addMovieViewing: (watchedOn: string) => Promise<boolean>;
  editMovieViewing: (viewingId: string, watchedOn: string) => Promise<void>;
  deleteMovieViewing: (viewingId: string) => Promise<void>;
  setCoverPosition: (x: number, y: number, zoom: number) => Promise<boolean>;
}) {
  const { title } = detail;
  const [contentStatus, setContentStatus] = useState<TrackingStatus | "">("");
  const [contentPanel, setContentPanel] = useState<"contents" | "history">("contents");
  const [moviePanel, setMoviePanel] = useState<"summary" | "history">("summary");
  const [registeringWatch, setRegisteringWatch] = useState(false);
  const [registeringMovieWatch, setRegisteringMovieWatch] = useState(false);
  const [editingMovieViewing, setEditingMovieViewing] = useState<MovieViewing | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [positioningCover, setPositioningCover] = useState(false);
  const pointerDrag = useRef<{
    id: string;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const contents = useMemo(
    () =>
      detail.contents.filter(
        (content) => !contentStatus || content.status === contentStatus,
      ),
    [contentStatus, detail.contents],
  );
  const quickContent = detail.contents.find((content) => content.status === "watching" && content.canonStatus !== "omitted" && content.canIncrement)
    ?? (title.nextContent?.canIncrement ? detail.contents.find((content) => content.id === title.nextContent?.id) ?? null : null);
  async function dropOn(targetId: string, sourceId = draggedId) {
    if (!sourceId || sourceId === targetId || contentStatus) return;
    const ids = detail.contents.map((content) => content.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDraggedId(null);
    await reorder(ids);
  }

  function startPointerDrag(event: React.PointerEvent, id: string) {
    if (contentStatus || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDrag.current = {
      id,
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
  }

  function movePointerDrag(event: React.PointerEvent) {
    const state = pointerDrag.current;
    if (!state) return;
    if (
      !state.active &&
      Math.hypot(event.clientX - state.x, event.clientY - state.y) < 5
    )
      return;
    if (!state.active) {
      state.active = true;
      setDraggedId(state.id);
    }
    setDragPoint({ x: event.clientX, y: event.clientY });
    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-media-content-id]"))
      .find((element) => element && element.dataset.mediaContentId !== state.id);
    setDropTarget(target?.dataset.mediaContentId ?? null);
  }

  async function endPointerDrag() {
    const state = pointerDrag.current;
    const target = dropTarget;
    pointerDrag.current = null;
    setDropTarget(null);
    setDragPoint(null);
    setDraggedId(null);
    if (state?.active && target) await dropOn(target, state.id);
  }

  function cancelPointerDrag() {
    pointerDrag.current = null;
    setDropTarget(null);
    setDragPoint(null);
    setDraggedId(null);
  }

  return (
    <>
    <Modal className="media-detail-dialog" initialFocus="dialog" labelledBy="media-detail-title" onClose={close}>
      <article className="media-detail anime-media-detail">
        <header className="media-detail-header">
          <div className="media-detail-cover-wrap ui-cover-adjust-host">
            <CoverImage
              alt={`Portada de ${title.name}`}
              animated={title.animatedCover}
              className="media-detail-cover"
              hasCover={title.hasCover}
              positionX={title.coverPositionX}
              positionY={title.coverPositionY}
              titleId={title.id}
              zoom={title.coverZoom}
            />
            {title.kind === "anime" && title.catalogNumber && <span className="media-detail-catalog-number">#{title.catalogNumber}</span>}
            {!title.archived && title.hasCover && <button aria-label="Ajustar encuadre de portada" className="ui-cover-adjust-button" onClick={() => setPositioningCover(true)} type="button"><Move size={14} /> Ajustar</button>}
          </div>
          <div className="media-detail-heading">
            {title.suggestedStatus && <div className="media-status-suggestion-row"><button className="media-status-suggestion" disabled={busy} onClick={() => void setTitleStatus(title.suggestedStatus!)} type="button"><Lightbulb size={14} /> Sugerencia: marcar como {statusLabel(title.suggestedStatus)}</button></div>}
            <div className="media-detail-kickers">
              <span>{title.isAnime && title.kind === "movie" ? "Película de anime" : kindLabel(title.kind)}</span>
            </div>
            <h2 id="media-detail-title">{title.name}</h2>
            {title.alternativeTitle && <p>{title.alternativeTitle}</p>}
            {title.genres.length > 0 && <div className="media-genre-tags media-detail-genres">{title.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>}
          </div>
          <div className="media-detail-scores">
            <QuickScore busy={busy} score={title.score} save={setTitleScore} />
            {title.kind !== "movie" && (
              <ScoreValue
                label="Media"
                score={title.averageContentScore}
              />
            )}
          </div>
          <div className="media-detail-actions">
            <button aria-label="Ver historial del anime" className="media-icon-button" onClick={() => openHistory(title.id)} title="Ver historial del anime" type="button">
              <History size={17} />
            </button>
            {!title.archived && (
              <>
                <button
                  aria-label={title.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                  className={`media-icon-button media-favorite-button${title.favorite ? " active" : ""}`}
                  disabled={busy}
                  onClick={() => void setTitleFavorite(!title.favorite)}
                  title={title.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                  type="button"
                >
                  <Star fill={title.favorite ? "currentColor" : "none"} size={18} />
                </button>
                <button aria-label="Editar título" className="media-icon-button" onClick={editTitle} title="Editar título" type="button">
                  <Edit3 size={17} />
                </button>
                <button className="media-icon-button" disabled={busy} onClick={() => void archive()} title="Archivar" type="button">
                  <Archive size={17} />
                </button>
              </>
            )}
            {title.archived && (
              <>
                <button className="secondary-button" disabled={busy} onClick={() => void restore()} type="button">
                  <RotateCcw size={16} /> Restaurar
                </button>
                <button className="danger-button" disabled={busy} onClick={() => void removeTitle()} type="button">
                  <Trash2 size={16} /> Eliminar
                </button>
              </>
            )}
            <button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button">
              <X size={19} />
            </button>
          </div>
        </header>

        <section className="media-overview-strip">
          <div>
            <span>Progreso</span>
            <strong>{progressLabel(title.progress)}</strong>
            {title.progress.totalIncomplete && <small>Total aún desconocido</small>}
          </div>
          <div>
            <span>Contenidos</span>
            <strong>{title.contentsCount}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong>{statusLabel(title.status)}</strong>
          </div>
        </section>
        {title.opinion && (
          <section className="media-opinion">
            <span>Opinión general</span>
            <p>{title.opinion}</p>
          </section>
        )}

        {title.kind === "movie" ? (
          <section className="media-anime-movie-tracker">
            <TrackerDetailTabs onChange={setMoviePanel} value={moviePanel} />
            {moviePanel === "summary" ? <TrackerMetricGrid metrics={[
              { label: "Puntuación", value: formatScore(title.score), score: title.score },
              { label: "Visionados", value: movieViewings.length },
              { label: "Estado", value: statusLabel(title.status) },
            ]} /> : <div className="media-anime-movie-history">
              <header><strong className="tracker-history-count"><History size={17} /> {movieViewings.length} {movieViewings.length === 1 ? "visionado registrado" : "visionados registrados"}</strong>{!title.archived && <div className="media-anime-movie-history-header-actions"><button className="secondary-button" disabled={busy} onClick={() => void addMovieViewing(todayMadrid())} type="button">Registrar hoy</button><button className="primary-button" disabled={busy} onClick={() => setRegisteringMovieWatch(true)} type="button"><Plus size={16} /> Registrar visionado</button></div>}</header>
              {movieViewings.length === 0 ? <p className="media-muted">No hay visionados registrados.</p> : <div className="media-anime-movie-history-list">{movieViewings.map((viewing, index) => <article key={viewing.id}><CalendarDays size={16} /><div><strong>{index === movieViewings.length - 1 ? "Primer visionado" : `Visionado ${movieViewings.length - index}`}</strong><span>{formatDate(viewing.watchedOn)}</span></div>{!title.archived && <div className="media-anime-movie-history-actions"><button aria-label="Editar fecha del visionado" className="media-icon-button" disabled={busy} onClick={() => setEditingMovieViewing(viewing)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar visionado" className="media-icon-button danger" disabled={busy} onClick={() => { if (window.confirm("¿Eliminar este visionado del historial?")) void deleteMovieViewing(viewing.id); }} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
              <button className="media-progress-history" onClick={() => openHistory(title.id)} type="button"><History size={14} /> Ver historial completo</button>
            </div>}
          </section>
        ) : (
          <section className="media-detail-section">
            <div className="media-section-toolbar media-content-section-toolbar">
              <SectionHeading
                subtitle={contentPanel === "history" ? "Tus visionados, agrupados por contenido y fecha" : contentStatus ? "El orden se edita sin filtros" : "Arrastra para ajustar el orden recomendado"}
                title="Contenidos"
              />
              <div className="media-content-section-controls">
                {contentPanel === "contents" && <SelectControl>
                  <select
                    aria-label="Filtrar contenidos por estado"
                    onChange={(event) => setContentStatus(event.target.value as TrackingStatus | "")}
                    value={contentStatus}
                  >
                    <option value="">Todos los estados</option>
                    {trackingStatuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </SelectControl>}
                {contentPanel === "contents" && !title.archived && (
                  <button className="primary-button" onClick={addContent} type="button">
                    <Plus size={16} /> Añadir contenido
                  </button>
                )}
              </div>
            </div>
            <TrackerDetailTabs
              onChange={(view) => setContentPanel(view === "summary" ? "contents" : "history")}
              summaryIcon={<ListVideo size={16} />}
              summaryLabel="Contenidos"
              value={contentPanel === "contents" ? "summary" : "history"}
            />
            {contentPanel === "history" ? (
              <AnimeHistoryPanel
                archived={title.archived}
                busy={busy}
                contents={detail.contents}
                openFullHistory={() => openHistory(title.id)}
                quickAdd={quickContent ? () => increment("content", quickContent.id) : null}
                quickAddLabel={quickContent?.name ?? null}
                register={() => setRegisteringWatch(true)}
                sessions={detail.sessions}
                updateDates={updateHistoryDates}
                deleteGroup={deleteHistoryGroup}
              />
            ) : contents.length === 0 ? (
              <div className="media-inline-empty">
                {detail.contents.length === 0
                  ? "Añade la primera temporada, película, OVA o especial."
                  : "No hay contenidos con este filtro."}
              </div>
            ) : (
              <div className="media-content-list">
                {contents.map((content) => (
                  <ContentRow
                    busy={busy}
                    content={content}
                    titleName={title.name}
                    dragging={draggedId === content.id}
                    dropTarget={dropTarget === content.id}
                    editable={!title.archived}
                    onPointerCancel={cancelPointerDrag}
                    onPointerDown={(event) => startPointerDrag(event, content.id)}
                    onPointerMove={movePointerDrag}
                    onPointerUp={() => void endPointerDrag()}
                    edit={() => editContent(content)}
                    remove={() => removeContent(content)}
                    omit={() => omitContent(content)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {draggedId && dragPoint && (
          <div
            className="media-content-drag-preview"
            style={{ left: dragPoint.x + 14, top: dragPoint.y + 14 }}
          >
            <GripVertical size={15} />
            {detail.contents.find((content) => content.id === draggedId)?.name}
          </div>
        )}
      </article>
    </Modal>
    {positioningCover && <CoverPositionEditor busy={busy} close={() => setPositioningCover(false)} landscape save={setCoverPosition} title={title} />}
    {registeringWatch && <AnimeWatchForm busy={busy} close={() => setRegisteringWatch(false)} contents={detail.contents} register={(content, watched, date) => setProgress("content", content.id, watched, date)} />}
    {registeringMovieWatch && <AnimeMovieWatchForm busy={busy} close={() => setRegisteringMovieWatch(false)} register={addMovieViewing} />}
    {editingMovieViewing && <AnimeMovieHistoryDateForm busy={busy} close={() => setEditingMovieViewing(null)} viewing={editingMovieViewing} save={async (date) => { await editMovieViewing(editingMovieViewing.id, date); setEditingMovieViewing(null); }} />}
    </>
  );
}

function ContentRow({
  content,
  titleName,
  busy,
  editable,
  dragging,
  dropTarget,
  edit,
  remove,
  omit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  content: MediaContent;
  titleName: string;
  busy: boolean;
  editable: boolean;
  dragging: boolean;
  dropTarget: boolean;
  edit: () => void;
  remove: () => Promise<void>;
  omit: () => Promise<void>;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}) {
  return (
    <article
      className={`media-content-row${dragging ? " dragging" : ""}${dropTarget ? " drop-target" : ""}${content.canonStatus === "omitted" ? " omitted" : ""}`}
      data-media-content-id={content.id}
    >
      <button
        aria-label={`Reordenar ${content.name}`}
        className="media-content-grip"
        disabled={!editable}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      >
        <GripVertical aria-hidden="true" size={18} />
      </button>
      <div className="media-content-copy">
        <div className="media-content-identity"><span className="media-content-order">#{content.position + 1}</span><strong>{conciseContentName(content.name, titleName)}</strong></div>
        <span className={`media-content-status-label status-${content.status}`}>{statusLabel(content.status)}</span>
        {editable && <div className="media-content-actions">
            <button aria-label={content.canonStatus === "omitted" ? `Volver a incluir ${content.name} como Canon` : `Omitir ${content.name} del progreso`} className="media-icon-button omit" disabled={busy} onClick={() => void omit()} title={content.canonStatus === "omitted" ? "Volver a incluir como Canon" : "Omitir del progreso"} type="button">{content.canonStatus === "omitted" ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            <button aria-label={`Editar ${content.name}`} className="media-icon-button" onClick={edit} title="Editar" type="button"><Edit3 size={16} /></button>
            <button aria-label={`Eliminar ${content.name}`} className="media-icon-button danger" onClick={() => void remove()} title="Eliminar" type="button"><Trash2 size={16} /></button>
          </div>}
      </div>
      <div className="media-content-information">
        <div className="media-content-card-meta"><span>{contentKindLabel(content.kind)}</span><span className={`canon-${content.canonStatus}`}>{canonLabel(content.canonStatus)}</span></div>
        <div className="media-content-card-dates"><span><CalendarDays size={13} /> Estreno {content.releasedOn ? formatDate(content.releasedOn) : "sin fecha"}</span><span><History size={13} /> Último visionado {content.lastActivityOn ? formatDate(content.lastActivityOn) : "sin registros"}</span></div>
        {(content.opinion || content.notes) && <div className="media-content-text">
          {content.opinion && <p>{content.opinion}</p>}
          {content.notes && <p className="media-content-notes">{content.notes}</p>}
        </div>}
        <div className="media-content-card-footer"><div className="media-content-card-progress"><span>{contentProgressLabel(content)}</span><ProgressTrack current={content.watchedEpisodes} total={content.effectiveTotal} /></div><ScoreTile className="media-content-score-tile" score={content.score} /></div>
      </div>
    </article>
  );
}

function conciseContentName(name: string, titleName: string) {
  const original = name.trim();
  const suffix = ` — ${titleName}`;
  if (original.toLocaleLowerCase("es").endsWith(suffix.toLocaleLowerCase("es"))) {
    return original.slice(0, -suffix.length).trim() || original;
  }
  let result = original.replace(/^(película|temporada|ova|especial)\s+—\s+/i, "");
  const parentPrefix = `${titleName}:`;
  if (result.toLocaleLowerCase("es").startsWith(parentPrefix.toLocaleLowerCase("es"))) {
    result = result.slice(parentPrefix.length).trim();
  }
  return result || original;
}

function contentProgressLabel(content: MediaContent): string {
  if (content.kind !== "season" && content.effectiveTotal === 1) {
    return content.watchedEpisodes >= 1 ? "Visto" : "No visto";
  }
  return `${content.watchedEpisodes} de ${content.effectiveTotal ?? "?"} episodios`;
}

function ProgressTrack({ current, total }: { current: number; total: number | null }) {
  const progress = total && total > 0 ? Math.min(100, Math.round((current / total) * 100)) : null;
  return progress === null ? null : <div className="media-progress-track" aria-label={`${progress}% completado`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>;
}

type WatchGroup = {
  key: string;
  content: MediaContent;
  watchedOn: string;
  episodes: number[];
  sessionIds: string[];
  canDelete: boolean;
};

function groupWatchSessions(sessions: WatchSession[], contents: MediaContent[]): WatchGroup[] {
  const contentMap = new Map(contents.map((content) => [content.id, content]));
  const groups = new Map<string, Omit<WatchGroup, "canDelete">>();
  sessions.forEach((session) => {
    if (!session.contentId) return;
    const content = contentMap.get(session.contentId);
    if (!content) return;
    const key = `${session.contentId}:${session.watchedOn}`;
    const group = groups.get(key) ?? { key, content, watchedOn: session.watchedOn, episodes: [], sessionIds: [] };
    group.episodes.push(session.episodeNumber);
    group.sessionIds.push(session.id);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => {
    const pairs = group.episodes.map((episode, index) => ({ episode, id: group.sessionIds[index] })).sort((a, b) => b.episode - a.episode);
    const episodes = pairs.map((pair) => pair.episode).sort((a, b) => a - b);
    const highest = episodes[episodes.length - 1] ?? 0;
    const contiguous = episodes.every((episode, index) => index === 0 || episode === episodes[index - 1] + 1);
    return { ...group, episodes, sessionIds: pairs.map((pair) => pair.id), canDelete: contiguous && highest === group.content.watchedEpisodes };
  }).sort((a, b) => b.watchedOn.localeCompare(a.watchedOn) || (b.episodes[b.episodes.length - 1] ?? 0) - (a.episodes[a.episodes.length - 1] ?? 0));
}

function watchGroupLabel(group: WatchGroup) {
  const first = group.episodes[0];
  const last = group.episodes[group.episodes.length - 1] ?? first;
  if (group.content.kind === "season") return `${group.content.name} · ${first === last ? `Episodio ${first}` : `Episodios ${first}–${last}`}`;
  if (group.content.kind === "movie") return `Película “${group.content.name}” vista`;
  if (group.content.kind === "ova") return `OVA “${group.content.name}” visto`;
  return `Especial “${group.content.name}” visto`;
}

function AnimeHistoryPanel({ archived, busy, contents, sessions, register, quickAdd, quickAddLabel, openFullHistory, updateDates, deleteGroup }: { archived: boolean; busy: boolean; contents: MediaContent[]; sessions: WatchSession[]; register: () => void; quickAdd: (() => Promise<void>) | null; quickAddLabel: string | null; openFullHistory: () => void; updateDates: (ids: string[], date: string) => Promise<boolean>; deleteGroup: (ids: string[]) => Promise<boolean> }) {
  const groups = useMemo(() => groupWatchSessions(sessions, contents), [contents, sessions]);
  const [editing, setEditing] = useState<WatchGroup | null>(null);
  const canRegister = contents.some((content) => content.canonStatus !== "omitted" && content.canIncrement);
  return <div className="media-anime-history-panel">
    <header><strong className="tracker-history-count"><History size={17} /> {sessions.length} {sessions.length === 1 ? "episodio registrado" : "episodios registrados"}</strong><div className="media-anime-history-header-actions"><button className="secondary-button" onClick={openFullHistory} type="button"><History size={15} /> Ver historial completo</button>{!archived && quickAdd && <button className="secondary-button media-history-quick-add" disabled={busy} onClick={() => void quickAdd()} title={quickAddLabel ? `Añadir un episodio de ${quickAddLabel}` : "Añadir un episodio"} type="button">+1 episodio</button>}{!archived && <button className="primary-button" disabled={busy || !canRegister} onClick={register} type="button"><Plus size={16} /> Registrar visionado</button>}</div></header>
    {groups.length === 0 ? <div className="media-inline-empty">Todavía no hay visionados registrados.</div> : <div className="media-anime-history-list">{groups.map((group) => <article key={group.key}><History size={16} /><div><strong>{watchGroupLabel(group)}</strong><span>{formatDate(group.watchedOn)}</span></div>{!archived && <div className="media-anime-history-actions"><button aria-label={`Editar ${watchGroupLabel(group)}`} className="media-icon-button" disabled={busy} onClick={() => setEditing(group)} title="Editar fecha" type="button"><Edit3 size={15} /></button><button aria-label={`Eliminar ${watchGroupLabel(group)}`} className="media-icon-button danger" disabled={busy || !group.canDelete} onClick={() => { if (window.confirm("¿Eliminar este registro y actualizar el progreso?")) void deleteGroup(group.sessionIds); }} title={group.canDelete ? "Eliminar y actualizar progreso" : "Solo se puede retirar el último bloque de cada contenido"} type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
    {editing && <AnimeHistoryDateForm busy={busy} close={() => setEditing(null)} group={editing} save={async (date) => { if (await updateDates(editing.sessionIds, date)) setEditing(null); }} />}
  </div>;
}

function AnimeHistoryDateForm({ group, busy, close, save }: { group: WatchGroup; busy: boolean; close: () => void; save: (date: string) => Promise<void> }) {
  const [date, setDate] = useState(group.watchedOn);
  return <Modal className="media-watch-form-dialog" labelledBy="anime-history-date-title" onClose={close}><form className="media-watch-form" onSubmit={(event) => { event.preventDefault(); void save(date); }}><header><div><h2 id="anime-history-date-title">Editar visionado</h2><p>{watchGroupLabel(group)}</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header><label>Fecha<SmartDateInput disabled={busy} max={todayMadrid()} onChange={setDate} required value={date} /></label><footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || date === group.watchedOn} type="submit">Guardar</button></footer></form></Modal>;
}

function AnimeMovieWatchForm({ busy, close, register }: { busy: boolean; close: () => void; register: (date: string) => Promise<boolean> }) {
  const [date, setDate] = useState(todayMadrid);
  return <Modal className="media-watch-form-dialog" labelledBy="anime-movie-watch-form-title" onClose={close}><form className="media-watch-form" onSubmit={async (event) => { event.preventDefault(); if (await register(date)) close(); }}><header><div><h2 id="anime-movie-watch-form-title">Registrar visionado</h2><p>Elige cuándo viste la película.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header><label>Fecha del visionado<SmartDateInput disabled={busy} max={todayMadrid()} onChange={setDate} required value={date} /></label><footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !date} type="submit"><Plus size={16} /> Registrar visionado</button></footer></form></Modal>;
}

function AnimeMovieHistoryDateForm({ viewing, busy, close, save }: { viewing: MovieViewing; busy: boolean; close: () => void; save: (date: string) => Promise<void> }) {
  const [date, setDate] = useState(viewing.watchedOn);
  return <Modal className="media-watch-form-dialog" labelledBy="anime-movie-history-date-title" onClose={close}><form className="media-watch-form" onSubmit={(event) => { event.preventDefault(); void save(date); }}><header><div><h2 id="anime-movie-history-date-title">Editar visionado</h2><p>Corrige la fecha sin alterar el resto de la película.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header><label>Fecha del visionado<SmartDateInput disabled={busy} max={todayMadrid()} onChange={setDate} required value={date} /></label><footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !date || date === viewing.watchedOn} type="submit">Guardar</button></footer></form></Modal>;
}

function AnimeWatchForm({ contents, busy, close, register }: { contents: MediaContent[]; busy: boolean; close: () => void; register: (content: MediaContent, watched: number, date: string) => Promise<boolean> }) {
  const available = useMemo(() => contents.filter((content) => content.canonStatus !== "omitted" && content.canIncrement), [contents]);
  const [contentId, setContentId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(todayMadrid);
  const content = available.find((item) => item.id === contentId) ?? null;
  const remaining = content?.effectiveTotal === null || content?.effectiveTotal === undefined ? null : Math.max(0, content.effectiveTotal - content.watchedEpisodes);
  const amount = Number(quantity);
  const valid = Boolean(content && Number.isInteger(amount) && amount > 0 && (remaining === null || amount <= remaining));
  const next = content ? content.watchedEpisodes + amount : 0;
  const singleUnit = content && content.kind !== "season" && remaining === 1;
  const preview = content ? singleUnit ? `Se registrará “${content.name}” como visto.` : amount === 1 ? `Se registrará el episodio ${next} de ${content.name}.` : `Se registrarán los episodios ${content.watchedEpisodes + 1}–${next} de ${content.name}.` : "Elige un contenido para continuar.";
  return <Modal className="media-watch-form-dialog" labelledBy="anime-watch-form-title" onClose={close}><form className="media-watch-form" onSubmit={async (event) => { event.preventDefault(); if (content && valid && await register(content, next, date)) close(); }}><header><div><h2 id="anime-watch-form-title">Registrar visionado</h2><p>Añade varios episodios en una sola entrada visual.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header>{available.length === 0 ? <p className="media-muted">No quedan contenidos disponibles para avanzar.</p> : <><label>Contenido<SelectControl><select disabled={busy} onChange={(event) => { setContentId(event.target.value); setQuantity("1"); }} value={contentId}>{available.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.watchedEpisodes} de {item.effectiveTotal ?? "?"})</option>)}</select></SelectControl></label><div className="media-watch-form-grid">{!singleUnit && <label>Episodios vistos<input disabled={busy} max={remaining ?? undefined} min={1} onChange={(event) => setQuantity(event.target.value)} required step={1} type="number" value={quantity} /></label>}<label>Fecha<SmartDateInput disabled={busy} max={todayMadrid()} onChange={setDate} required value={date} /></label></div><div className="media-watch-preview"><span>Después del registro</span><strong>{preview}</strong>{content && <small>El progreso quedará en {next} de {content.effectiveTotal ?? "?"}.</small>}</div></>}<footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !valid} type="submit"><Plus size={16} /> Registrar visionado</button></footer></form></Modal>;
}

function QuickScore({ score, busy, save }: { score: number | null; busy: boolean; save: (score: number | null) => Promise<void> }) {
  const [value, setValue] = useState(score?.toString() ?? "");
  const autoSaveTimer = useRef<number | null>(null);
  useEffect(() => setValue(score?.toString() ?? ""), [score]);
  const parsed = value === "" ? null : Number(value.replace(",", "."));
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10 && Math.round(parsed * 10) === parsed * 10);
  const changed = valid && parsed !== score;
  const visualScore = valid ? parsed : null;
  useEffect(() => {
    if (autoSaveTimer.current !== null) window.clearTimeout(autoSaveTimer.current);
    if (!busy && changed) {
      autoSaveTimer.current = window.setTimeout(() => {
        autoSaveTimer.current = null;
        void save(parsed);
      }, 450);
    }
    return () => {
      if (autoSaveTimer.current !== null) window.clearTimeout(autoSaveTimer.current);
    };
  }, [busy, changed, parsed, save]);
  async function commit() {
    if (autoSaveTimer.current !== null) {
      window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (!valid) {
      setValue(score?.toString() ?? "");
      return;
    }
    if (changed) await save(parsed);
  }
  return (
    <label className="media-quick-score">
      <span>Tu puntuación</span>
      <div className={`media-detail-editable-score ui-score-tile${visualScore === null ? " unrated" : ""}`} style={visualScore === null ? undefined : { backgroundColor: scoreColor(visualScore), borderColor: scoreColor(visualScore) }}>
        <input
          aria-invalid={!valid}
          aria-label="Tu puntuación"
          disabled={busy}
          inputMode="decimal"
          max={10}
          min={0}
          onBlur={() => void commit()}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setValue(score?.toString() ?? "");
          }}
          placeholder="—"
          step={0.1}
          type="number"
          value={value}
        />
      </div>
    </label>
  );
}

function ScoreValue({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  return (
    <div className="media-score-card">
      <span>{label}</span>
      <ScoreTile score={score} />
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="media-section-heading">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
