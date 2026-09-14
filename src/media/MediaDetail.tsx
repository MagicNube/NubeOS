import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { confirmAction } from "../ui/confirmAction";
import ContentWatchDate from "./ContentWatchDate";
import AnimeWatchForm, { runLabel } from "./AnimeRunForm";
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import type {
  MediaContent,
  MediaDetail,
  MovieViewing,
  ProgressTarget,
  TrackingStatus,
  WatchSession,
  ContentRun, ContentRunRegistration,
} from "./api";
import CoverImage from "./CoverImage";
import CoverPositionEditor from "./CoverPositionEditor";
import {
  canonLabel,
  conciseContentName,
  contentKindLabel,
  formatDate,
  formatScore,
  kindLabel,
  progressLabel,
  scoreColor,
  statusLabel,
  statusHelp,
  todayMadrid,
  contentTrackingStatuses,
  contentStatusLabel,
  upcomingLabel,
} from "./presentation";

export default function MediaDetailView({
  catalogPosition,
  detail,
  error,
  movieViewings,
  busy,
  close,
  editTitle,
  addContent,
  editContent,
  increment,
  setProgress,
  registerContentRun,
  setContentScore,
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
  updateHistoryGroup,
  deleteHistoryGroup,
  addMovieViewing,
  editMovieViewing,
  deleteMovieViewing,
  setCoverPosition,
}: {
  catalogPosition?: number | null;
  detail: MediaDetail;
  error?: string | null;
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
  registerContentRun: (input: ContentRunRegistration) => Promise<boolean>;
  setContentScore: (content: MediaContent, score: number | null) => Promise<void>;
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
  updateHistoryGroup: (group: { registrationId: string; contentId: string; episodes: number; watchedOn: string; firstEpisode?: number }) => Promise<boolean>;
  deleteHistoryGroup: (sessionIds: string[]) => Promise<boolean>;
  addMovieViewing: (watchedOn: string) => Promise<boolean>;
  editMovieViewing: (viewingId: string, watchedOn: string) => Promise<void>;
  deleteMovieViewing: (viewingId: string) => Promise<void>;
  setCoverPosition: (x: number, y: number, zoom: number) => Promise<boolean>;
}) {
  const { title } = detail;
  const [hideOmitted, setHideOmitted] = useState(true);
  const [contentStatus, setContentStatus] = useState<TrackingStatus | "">("");
  const [contentPanel, setContentPanel] = useState<"contents" | "history">("contents");
  const [moviePanel, setMoviePanel] = useState<"summary" | "history">("summary");
  const [registeringWatch, setRegisteringWatch] = useState(false);
  const [watchTarget, setWatchTarget] = useState<{ contentId: string; runId: string } | null>(null);
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
        (content) => (!contentStatus || content.status === contentStatus) && (!hideOmitted || content.canonStatus !== "omitted"),
      ),
    [contentStatus, hideOmitted, detail.contents],
  );
  const quickContent = detail.contents.find((content) => content.status === "watching" && content.canonStatus !== "omitted" && content.canIncrement)
    ?? (title.nextContent?.canIncrement ? detail.contents.find((content) => content.id === title.nextContent?.id) ?? null : null);
  async function dropOn(targetId: string, sourceId = draggedId) {
    if (!sourceId || sourceId === targetId || contentStatus || hideOmitted) return;
    const ids = detail.contents.map((content) => content.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDraggedId(null);
    await reorder(ids);
  }

  function startPointerDrag(event: React.PointerEvent, id: string) {
    if (contentStatus || hideOmitted || event.button !== 0) return;
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
            {title.kind === "anime" && catalogPosition && <span className="media-detail-catalog-number">#{catalogPosition}</span>}
            {!title.archived && title.hasCover && <button aria-label="Ajustar encuadre de portada" className="ui-cover-adjust-button" onClick={() => setPositioningCover(true)} type="button"><Move size={14} /> Ajustar</button>}
          </div>
          <div className="media-detail-heading">
            {title.suggestedStatus && <div className="media-status-suggestion-row"><button className="media-status-suggestion" title={statusHelp(title.suggestedStatus)} disabled={busy} onClick={() => void setTitleStatus(title.suggestedStatus!)} type="button"><Lightbulb size={14} /> Sugerencia: marcar como {statusLabel(title.suggestedStatus)}</button></div>}
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
                <button aria-label="Archivar título" className="media-icon-button" disabled={busy} onClick={() => void archive()} title="Archivar" type="button">
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

        <div className="anime-detail-overview">
          <TrackerMetricGrid metrics={[
            {
              label: "Progreso",
              value: progressLabel(title.progress),
              details: [upcomingLabel(title.progress), title.progress.totalIncomplete ? "Total aún desconocido" : null].filter((detail): detail is string => Boolean(detail)),
            },
            { label: title.kind === "movie" ? "Visionados" : "Contenidos", value: title.kind === "movie" ? movieViewings.length : title.contentsCount },
            { label: "Estado", value: statusLabel(title.status), help: statusHelp(title.status) },
          ]} />
        </div>
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
              {movieViewings.length === 0 ? <p className="media-muted">No hay visionados registrados.</p> : <div className="media-anime-movie-history-list">{movieViewings.map((viewing, index) => <article key={viewing.id}><CalendarDays size={16} /><div><strong>{index === movieViewings.length - 1 ? "Primer visionado" : `Visionado ${movieViewings.length - index}`}</strong><span>{formatDate(viewing.watchedOn)}</span></div>{!title.archived && <div className="media-anime-movie-history-actions"><button aria-label="Editar fecha del visionado" className="media-icon-button" disabled={busy} onClick={() => setEditingMovieViewing(viewing)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar visionado" className="media-icon-button danger" disabled={busy} onClick={async () => { if (await confirmAction({ title: "Eliminar visionado", message: "Se retirará este visionado del historial y se actualizará el progreso calculado.", confirmLabel: "Eliminar visionado", destructive: true })) await deleteMovieViewing(viewing.id); }} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
            </div>}
          </section>
        ) : (
          <section className="media-detail-section">
            <div className="media-section-toolbar media-content-section-toolbar">
              <SectionHeading
                subtitle={contentPanel === "history" ? "Tus visionados, agrupados por contenido y fecha" : contentStatus || hideOmitted ? "Muestra todos los contenidos para ajustar el orden" : "Arrastra para ajustar el orden recomendado"}
                title="Contenidos"
              />
              <div className="media-content-section-controls">
                {contentPanel === "contents" && <button aria-label={hideOmitted ? "Mostrar contenidos omitidos" : "Ocultar contenidos omitidos"} aria-pressed={hideOmitted} className="secondary-button" onClick={() => setHideOmitted(!hideOmitted)} title={hideOmitted ? "Mostrar contenidos omitidos" : "Ocultar contenidos omitidos"} type="button">{hideOmitted ? <EyeOff size={16} /> : <Eye size={16} />} Omitidos</button>}
                {contentPanel === "contents" && <SelectControl>
                  <select
                    aria-label="Filtrar contenidos por estado"
                    onChange={(event) => setContentStatus(event.target.value as TrackingStatus | "")}
                    value={contentStatus}
                  >
                    <option value="">Todos los estados</option>
                    {contentTrackingStatuses.map((status) => (
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
                error={error}
                archived={title.archived}
                busy={busy}
                contents={detail.contents}
                quickAdd={quickContent ? () => increment("content", quickContent.id) : null}
                quickAddLabel={quickContent?.name ?? null}
                register={(target) => { setWatchTarget(target ?? null); setRegisteringWatch(true); }}
                runs={detail.runs ?? []}
                sessions={detail.sessions}
                updateGroup={updateHistoryGroup}
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
                    alternativeTitle={title.alternativeTitle}
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
                    setScore={(score) => setContentScore(content, score)}
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
    {registeringWatch && <AnimeWatchForm error={error} busy={busy} close={() => setRegisteringWatch(false)} contents={detail.contents} runs={detail.runs} sessions={detail.sessions} initialTarget={watchTarget} register={(content, watched, date) => setProgress("content", content.id, watched, date)} saveRun={registerContentRun} />}
    {registeringMovieWatch && <AnimeMovieWatchForm busy={busy} close={() => setRegisteringMovieWatch(false)} register={addMovieViewing} />}
    {editingMovieViewing && <AnimeMovieHistoryDateForm busy={busy} close={() => setEditingMovieViewing(null)} viewing={editingMovieViewing} save={async (date) => { await editMovieViewing(editingMovieViewing.id, date); setEditingMovieViewing(null); }} />}
    </>
  );
}

function ContentRow({
  content,
  titleName,
  alternativeTitle,
  busy,
  editable,
  dragging,
  dropTarget,
  edit,
  remove,
  omit,
  setScore,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  content: MediaContent;
  titleName: string;
  alternativeTitle: string | null;
  busy: boolean;
  editable: boolean;
  dragging: boolean;
  dropTarget: boolean;
  edit: () => void;
  remove: () => Promise<void>;
  omit: () => Promise<void>;
  setScore: (score: number | null) => Promise<void>;
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
        <div className="media-content-identity" title={content.name}><span className="media-content-order">#{content.position + 1}</span><strong>{conciseContentName(content.name, titleName, alternativeTitle)}</strong></div>
        <span className={`media-content-status-label status-${content.status}`}>{contentStatusLabel(content.status)}</span>
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
        <div className="media-content-card-footer"><div className="media-content-card-progress"><span>{contentProgressLabel(content)}</span><ProgressTrack current={content.watchedEpisodes} total={content.effectiveTotal} /></div>{editable ? <EditableScoreTile ariaLabel={`Puntuación de ${content.name}`} busy={busy} className="media-content-score-tile" score={content.score} save={setScore} /> : <ScoreTile className="media-content-score-tile" score={content.score} />}</div>
      </div>
    </article>
  );
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
  isRewatch: boolean;
  isChronologicalRewatch: boolean;
  runId?: string | null;
};

function groupWatchSessions(sessions: WatchSession[], contents: MediaContent[]): WatchGroup[] {
  const contentMap = new Map(contents.map((content) => [content.id, content]));
  const groups = new Map<string, Omit<WatchGroup, "canDelete">>();
  sessions.forEach((session) => {
    if (!session.contentId) return;
    const content = contentMap.get(session.contentId);
    if (!content) return;
    const key = session.registrationId || `${session.contentId}:${session.watchedOn}`;
    const group = groups.get(key) ?? { key, content, watchedOn: session.watchedOn, episodes: [], sessionIds: [], isRewatch: session.isRewatch, isChronologicalRewatch: false, runId: session.runId };
    group.isChronologicalRewatch ||= session.isChronologicalRewatch;
    group.episodes.push(session.episodeNumber);
    group.sessionIds.push(session.id);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => {
    const pairs = group.episodes.map((episode, index) => ({ episode, id: group.sessionIds[index] })).sort((a, b) => b.episode - a.episode);
    const episodes = pairs.map((pair) => pair.episode).sort((a, b) => a - b);
    const highest = episodes[episodes.length - 1] ?? 0;
    const contiguous = episodes.every((episode, index) => index === 0 || episode === episodes[index - 1] + 1);
    return { ...group, episodes, sessionIds: pairs.map((pair) => pair.id), canDelete: group.isRewatch || (contiguous && highest === group.content.watchedEpisodes) };
  }).sort((a, b) => b.watchedOn.localeCompare(a.watchedOn) || (b.episodes[b.episodes.length - 1] ?? 0) - (a.episodes[a.episodes.length - 1] ?? 0));
}

function watchGroupLabel(group: WatchGroup) {
  const first = group.episodes[0];
  const last = group.episodes[group.episodes.length - 1] ?? first;
  const suffix = group.isChronologicalRewatch ? " · Revisionado" : "";
  if (group.content.kind === "season") return `${group.content.name} · ${first === last ? `Episodio ${first}` : `Episodios ${first}–${last}`}${suffix}`;
  if (group.content.kind === "movie") return `Película “${group.content.name}” vista${suffix}`;
  if (group.content.kind === "ova") return `OVA “${group.content.name}” visto${suffix}`;
  return `Especial “${group.content.name}” visto${suffix}`;
}

export function AnimeHistoryPanel({ error, archived, busy, contents, sessions, runs, register, quickAdd, quickAddLabel, updateGroup, deleteGroup }: {
  error?: string | null; archived: boolean; busy: boolean; contents: MediaContent[]; sessions: WatchSession[];
  runs: ContentRun[];
  register: (target?: { contentId: string; runId: string }) => void;
  quickAdd: (() => Promise<void>) | null; quickAddLabel: string | null;
  updateGroup: (group: { registrationId: string; contentId: string; episodes: number; watchedOn: string; firstEpisode?: number }) => Promise<boolean>;
  deleteGroup: (ids: string[]) => Promise<boolean>;
}) {
  const groups = useMemo(() => groupWatchSessions(sessions, contents), [contents, sessions]);
  const [editing, setEditing] = useState<WatchGroup | null>(null);
  const canRegister = contents.some((c) => c.canonStatus !== "omitted" && c.status !== "waitingContent");
  const orderedRuns = [...runs].sort((a, b) => b.lastOn.localeCompare(a.lastOn) || a.id.localeCompare(b.id));
  function renderGroup(group: WatchGroup) {
    const first = group.episodes[0], last = group.episodes[group.episodes.length - 1];
    return <article key={group.key}><History size={16} /><div>
      <strong>{first === last ? `Episodio ${first}` : `Episodios ${first}–${last}`}</strong>
      <span>{formatDate(group.watchedOn)}</span>
    </div>{!archived && <div className="media-anime-history-actions">
      <button aria-label={`Editar ${watchGroupLabel(group)}`} className="media-icon-button" disabled={busy} onClick={() => setEditing(group)} title="Editar intervalo y fecha" type="button"><Edit3 size={15} /></button>
      <button aria-label={`Eliminar ${watchGroupLabel(group)}`} className="media-icon-button danger" disabled={busy || !group.canDelete}
        onClick={async () => { if (await confirmAction({ title: "Eliminar registro", message: "Se retirará este registro del historial y se actualizará el progreso calculado.", confirmLabel: "Eliminar registro", destructive: true })) await deleteGroup(group.sessionIds); }}
        title={group.canDelete ? "Eliminar registro" : "Solo se puede retirar el último bloque del progreso principal"} type="button"><Trash2 size={15} /></button>
    </div>}</article>;
  }
  return <div className="media-anime-history-panel">
    <header><strong className="tracker-history-count"><History size={17} /> {sessions.length} episodios registrados</strong>
      <div className="media-anime-history-header-actions">
        {!archived && quickAdd && <button className="secondary-button media-history-quick-add" disabled={busy} onClick={() => void quickAdd()} title={quickAddLabel ?? undefined} type="button">+1 episodio</button>}
        {!archived && <button className="primary-button" disabled={busy || !canRegister} onClick={() => register()} type="button"><Plus size={16} /> Registrar visionado</button>}
      </div>
    </header>
    {groups.length === 0 ? <div className="media-inline-empty">Todavía no hay visionados registrados.</div> : orderedRuns.map((run) => {
      const content = contents.find((c) => c.id === run.contentId);
      if (!content) return null;
      return <section className="anime-content-run" key={run.id}>
        <header className="anime-content-run-heading"><div><h3>{content.name}</h3>
          <strong>{runLabel(run)}</strong><span>{run.watched} de {content.effectiveTotal ?? "?"} episodios · {formatDate(run.firstOn)} → {formatDate(run.lastOn)}</span>
        </div></header>
        <div className="media-anime-history-list">{groups.filter((g) => g.runId === run.id).map(renderGroup)}</div>
      </section>;
    })}
    {groups.some((g) => !g.runId) && <div className="media-anime-history-list">{groups.filter((g) => !g.runId).map(renderGroup)}</div>}
    {editing && <AnimeHistoryEditForm error={error} busy={busy} close={() => setEditing(null)} group={editing} save={async (episodes, watchedOn, firstEpisode) => {
      if (await updateGroup({ registrationId: editing.key, contentId: editing.content.id, episodes, watchedOn, firstEpisode })) setEditing(null);
    }} />}
  </div>;
}

export function AnimeHistoryEditForm({ error, group, busy, close, save }: {
  error?: string | null; group: WatchGroup; busy: boolean; close: () => void;
  save: (episodes: number, date: string, firstEpisode: number) => Promise<void>;
}) {
  const originalFirst = group.episodes[0] ?? 1;
  const originalLast = group.episodes[group.episodes.length - 1] ?? originalFirst;
  const [date, setDate] = useState(group.watchedOn);
  const [first, setFirst] = useState(String(originalFirst));
  const [last, setLast] = useState(String(originalLast));
  const start = Number(first), end = Number(last);
  const total = group.content.effectiveTotal;
  const valid = Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start && (total === null || end <= total)
    && date && date <= todayMadrid() && (!group.content.releasedOn || date >= group.content.releasedOn);
  const changed = date !== group.watchedOn || start !== originalFirst || end !== originalLast;
  return <Modal className="media-watch-form-dialog" labelledBy="anime-history-date-title" onClose={close}>
    <form className="media-watch-form" onSubmit={(e) => { e.preventDefault(); if (valid && changed) void save(end - start + 1, date, start); }}>
      <header><div><h2 id="anime-history-date-title">Editar visionado</h2><p>{group.content.name}</p></div><button type="button" aria-label="Cerrar" className="media-icon-button" onClick={close}><X size={18} /></button></header>
      {error && <div className="media-error" role="alert">{error}</div>}
      <div className="media-watch-form-grid">
        <label>Episodio inicial<input disabled={busy || !group.isRewatch} inputMode="numeric" type="text" value={first} onChange={(e) => setBoundedEpisodeValue(e.target.value, total, setFirst)} /></label>
        <label>Episodio final<input disabled={busy || (!group.isRewatch && !group.canDelete)} inputMode="numeric" type="text" value={last} onChange={(e) => setBoundedEpisodeValue(e.target.value, total, setLast)} /></label>
      </div>
      <ContentWatchDate disabled={busy} releasedOn={group.content.releasedOn} onChange={setDate} value={date} />
      {!group.isRewatch && <p className="media-form-hint">El progreso principal conserva su secuencia; solo el último bloque permite cambiar el episodio final.</p>}
      <footer><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" disabled={busy || !valid || !changed} type="submit">Guardar</button></footer>
    </form>
  </Modal>;
}

function AnimeMovieWatchForm({ busy, close, register }: { busy: boolean; close: () => void; register: (date: string) => Promise<boolean> }) {
  const [date, setDate] = useState(todayMadrid);
  return <Modal className="media-watch-form-dialog" labelledBy="anime-movie-watch-form-title" onClose={close}><form className="media-watch-form" onSubmit={async (event) => { event.preventDefault(); if (await register(date)) close(); }}><header><div><h2 id="anime-movie-watch-form-title">Registrar visionado</h2><p>Elige cuándo viste la película.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header><label>Fecha del visionado<SmartDateInput disabled={busy} max={todayMadrid()} onChange={setDate} required value={date} /></label><footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !date} type="submit"><Plus size={16} /> Registrar visionado</button></footer></form></Modal>;
}

function AnimeMovieHistoryDateForm({ viewing, busy, close, save }: { viewing: MovieViewing; busy: boolean; close: () => void; save: (date: string) => Promise<void> }) {
  const [date, setDate] = useState(viewing.watchedOn);
  return <Modal className="media-watch-form-dialog" labelledBy="anime-movie-history-date-title" onClose={close}><form className="media-watch-form" onSubmit={(event) => { event.preventDefault(); void save(date); }}><header><div><h2 id="anime-movie-history-date-title">Editar visionado</h2><p>Corrige la fecha sin alterar el resto de la película.</p></div><button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button"><X size={18} /></button></header><label>Fecha del visionado<SmartDateInput disabled={busy} max={todayMadrid()} onChange={setDate} required value={date} /></label><footer><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !date || date === viewing.watchedOn} type="submit">Guardar</button></footer></form></Modal>;
}

export { default as AnimeWatchForm } from "./AnimeRunForm";

function setBoundedEpisodeValue(value: string, maximum: number | null, setValue: (value: string) => void) {
  if (!/^\d*$/.test(value)) return;
  if (value === "") {
    setValue(value);
    return;
  }
  const parsed = Number(value);
  setValue(String(maximum !== null && parsed > maximum ? maximum : parsed));
}

function contentIsCompleted(content: MediaContent) {
  return content.canRewatch;
}

function QuickScore({ score, busy, save }: { score: number | null; busy: boolean; save: (score: number | null) => Promise<void> }) {
  return <label className="media-quick-score"><span>Tu puntuación</span><EditableScoreTile busy={busy} score={score} save={save} /></label>;
}

function EditableScoreTile({ score, busy, save, className = "", ariaLabel = "Tu puntuación" }: { score: number | null; busy: boolean; save: (score: number | null) => Promise<void>; className?: string; ariaLabel?: string }) {
  const [value, setValue] = useState(() => scoreInputValue(score));
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<number | null>(null);
  const ownSaveInFlight = useRef(false);
  const persist = useCallback(async (next: number | null) => {
    ownSaveInFlight.current = true;
    try {
      await save(next);
    } finally {
      ownSaveInFlight.current = false;
    }
  }, [save]);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setValue(scoreInputValue(score));
  }, [score]);
  const parsed = value === "" ? null : Number(value.replace(",", "."));
  const complete = value === "" || !/[,.]$/.test(value);
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10 && Math.abs(Math.round(parsed * 100) - parsed * 100) < 0.000_001);
  const changed = complete && valid && parsed !== score;
  const visualScore = valid ? parsed : null;
  useEffect(() => {
    if (autoSaveTimer.current !== null) window.clearTimeout(autoSaveTimer.current);
    if (!busy && changed) {
      autoSaveTimer.current = window.setTimeout(() => {
        autoSaveTimer.current = null;
        void persist(parsed);
      }, 450);
    }
    return () => {
      if (autoSaveTimer.current !== null) window.clearTimeout(autoSaveTimer.current);
    };
  }, [busy, changed, parsed, persist]);
  async function commit() {
    if (autoSaveTimer.current !== null) {
      window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (!valid) {
      setValue(scoreInputValue(score));
      return;
    }
    if (!complete) {
      setValue(scoreInputValue(score));
      return;
    }
    if (changed) await persist(parsed);
    setValue(scoreInputValue(parsed));
  }
  return (
      <div className={`media-detail-editable-score media-editable-score ui-score-tile${className ? ` ${className}` : ""}${valid ? (visualScore === null ? " unrated" : "") : " invalid"}`} onPointerDown={(event) => event.stopPropagation()} style={visualScore === null ? undefined : { backgroundColor: scoreColor(visualScore), borderColor: scoreColor(visualScore) }}>
        <input
          ref={inputRef}
          aria-invalid={!valid}
          aria-label={ariaLabel}
          disabled={busy && !ownSaveInFlight.current}
          inputMode="decimal"
          max={10}
          min={0}
          onBlur={() => void commit()}
          onChange={(event) => {
            const next = event.target.value;
            if (/^\d{0,2}(?:[,.]\d{0,2})?$/.test(next)) setValue(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setValue(scoreInputValue(score));
          }}
          placeholder="—"
          type="text"
          value={value}
        />
      </div>
  );
}

function scoreInputValue(score: number | null) {
  return score === null ? "" : score.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
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
