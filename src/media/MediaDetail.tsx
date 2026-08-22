import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  GripVertical,
  History,
  Hourglass,
  Lightbulb,
  Eye,
  EyeOff,
  Plus,
  Pause,
  RotateCcw,
  Play,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import type {
  MediaContent,
  MediaDetail,
  ProgressTarget,
  TrackingStatus,
} from "./api";
import CoverImage from "./CoverImage";
import {
  canonLabel,
  contentKindLabel,
  formatDate,
  formatScore,
  kindLabel,
  progressLabel,
  scoreColor,
  scoreTone,
  statusLabel,
  todayMadrid,
  trackingStatuses,
} from "./presentation";

export default function MediaDetailView({
  detail,
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
  updateContentStatus,
  openHistory,
}: {
  detail: MediaDetail;
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
  ) => Promise<void>;
  removeContent: (content: MediaContent) => Promise<void>;
  omitContent: (content: MediaContent) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  removeTitle: () => Promise<void>;
  setTitleStatus: (status: TrackingStatus) => Promise<void>;
  setTitleScore: (score: number | null) => Promise<void>;
  setTitleFavorite: (favorite: boolean) => Promise<void>;
  updateContentStatus: (content: MediaContent, status: TrackingStatus) => Promise<void>;
  openHistory: (titleId: string, contentId?: string) => void;
}) {
  const { title } = detail;
  const [contentStatus, setContentStatus] = useState<TrackingStatus | "">("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
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
    <Modal className="media-detail-dialog" labelledBy="media-detail-title" onClose={close}>
      <article className="media-detail">
        <header className="media-detail-header">
          <div className="media-detail-cover-wrap">
            <CoverImage
              alt={`Portada de ${title.name}`}
              className="media-detail-cover"
              hasCover={title.hasCover}
              titleId={title.id}
            />
            {title.kind === "anime" && title.catalogNumber && <span className="media-detail-catalog-number">#{title.catalogNumber}</span>}
          </div>
          <div className="media-detail-heading">
            <div className="media-detail-kickers">
              <span>{title.isAnime && title.kind === "movie" ? "Película de anime" : kindLabel(title.kind)}</span>
            </div>
            <h2 id="media-detail-title">{title.name}</h2>
            {title.alternativeTitle && <p>{title.alternativeTitle}</p>}
            {title.genres.length > 0 && <p>{title.genres.join(", ")}</p>}
            {title.studios.length > 0 && <p>{title.studios.join(", ")}</p>}
            <div className="media-detail-scores">
              <QuickScore busy={busy} score={title.score} save={setTitleScore} />
              {title.kind !== "movie" && (
                <ScoreValue
                  label="Media"
                  score={title.averageContentScore}
                  secondary
                />
              )}
              <div className="media-quick-status">
                <span>Estado</span>
                <StatusIconSelector
                  busy={busy}
                  className="media-title-status-selector"
                  name={title.name}
                  setStatus={setTitleStatus}
                  status={title.status}
                />
              </div>
            </div>
            {title.suggestedStatus && <button className="media-status-suggestion" disabled={busy} onClick={() => void setTitleStatus(title.suggestedStatus!)} type="button"><Lightbulb size={14} /> Sugerencia: marcar como {statusLabel(title.suggestedStatus)}</button>}
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
            <span>Actividad registrada</span>
            <strong>{title.firstActivityOn ? title.firstActivityOn === title.lastActivityOn ? formatDate(title.firstActivityOn) : `${formatDate(title.firstActivityOn)} – ${formatDate(title.lastActivityOn!)}` : "Sin registros"}</strong>
          </div>
        </section>

        {title.opinion && (
          <section className="media-opinion">
            <span>Opinión general</span>
            <p>{title.opinion}</p>
          </section>
        )}

        {title.kind === "movie" ? (
          <section className="media-detail-section">
            <SectionHeading title="Seguimiento" />
            <ProgressEditor
              busy={busy}
              canIncrement={title.watchedUnits < 1 && title.status !== "dropped" && title.status !== "waitingContent"}
              current={title.watchedUnits}
              increment={() => increment("title", title.id)}
              save={(watched, date) => setProgress("title", title.id, watched, date)}
              total={1}
            />
          </section>
        ) : (
          <section className="media-detail-section">
            <div className="media-section-toolbar">
              <SectionHeading
                subtitle={contentStatus ? "El orden se edita sin filtros" : "Arrastra para ajustar el orden recomendado"}
                title="Contenidos"
              />
              <div>
                <SelectControl>
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
                </SelectControl>
                {!title.archived && (
                  <button className="primary-button" onClick={addContent} type="button">
                    <Plus size={16} /> Añadir contenido
                  </button>
                )}
              </div>
            </div>
            {contents.length === 0 ? (
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
                    increment={() => increment("content", content.id)}
                    onPointerCancel={cancelPointerDrag}
                    onPointerDown={(event) => startPointerDrag(event, content.id)}
                    onPointerMove={movePointerDrag}
                    onPointerUp={() => void endPointerDrag()}
                    edit={() => editContent(content)}
                    remove={() => removeContent(content)}
                    omit={() => omitContent(content)}
                    showHistory={() => openHistory(title.id, content.id)}
                    setStatus={(status) => updateContentStatus(content, status)}
                    setProgress={(watched, date) => setProgress("content", content.id, watched, date)}
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
  showHistory,
  increment,
  setStatus,
  setProgress,
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
  showHistory: () => void;
  increment: () => Promise<void>;
  setStatus: (status: TrackingStatus) => Promise<void>;
  setProgress: (watched: number, date: string) => Promise<void>;
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
      <div className={`media-content-score-column${content.score === null ? " unrated" : ""}`} style={{ color: scoreColor(content.score) }} title={content.score === null ? "Sin puntuar" : `Puntuación ${formatScore(content.score)}`}>
        <Star aria-hidden="true" fill={content.score === null ? "none" : "currentColor"} size={13} />
        <strong>{content.score === null ? "—" : formatScore(content.score)}</strong>
      </div>
      <div className="media-content-copy">
        <div className="media-content-title-line">
          <span className="media-content-order">#{content.position + 1}</span>
          <strong>{conciseContentName(content.name, titleName)}</strong>
        </div>
        <div className="media-content-metadata">
          <div><small>Tipo</small><strong>{contentKindLabel(content.kind)}</strong></div>
          <div><small>Canonicidad</small><strong className={`canon-${content.canonStatus}`}>{canonLabel(content.canonStatus)}</strong></div>
          {content.studio && <div><small>Estudio</small><strong>{content.studio}</strong></div>}
          {content.releasedOn && <div><small>Estreno</small><strong><CalendarDays size={13} /> {formatDate(content.releasedOn)}</strong></div>}
        </div>
        {content.opinion && <p>{content.opinion}</p>}
        {content.notes && <p className="media-content-notes">{content.notes}</p>}
      </div>
      <div className="media-content-state">
        <StatusIconSelector
          busy={busy || !editable}
          name={content.name}
          setStatus={setStatus}
          status={content.status}
        />
      </div>
      <div className="media-content-progress">
        <ProgressEditor
          busy={busy}
          canIncrement={content.canIncrement}
          current={content.watchedEpisodes}
          increment={increment}
          save={setProgress}
          showHistory={showHistory}
          total={content.effectiveTotal}
        />
      </div>
      {editable && (
        <div className="media-content-actions">
          <button
            aria-label={content.canonStatus === "omitted" ? `Volver a incluir ${content.name} como Canon` : `Omitir ${content.name} del progreso`}
            className="media-icon-button omit"
            disabled={busy}
            onClick={() => void omit()}
            title={content.canonStatus === "omitted" ? "Volver a incluir como Canon" : "Omitir del progreso"}
            type="button"
          >
            {content.canonStatus === "omitted" ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button aria-label={`Editar ${content.name}`} className="media-icon-button" onClick={edit} type="button"><Edit3 size={16} /></button>
          <button aria-label={`Eliminar ${content.name}`} className="media-icon-button danger" onClick={() => void remove()} type="button"><Trash2 size={16} /></button>
        </div>
      )}
    </article>
  );
}

const statusOptions = [
  { value: "watching", label: "Viendo", icon: Play },
  { value: "pending", label: "Pendiente", icon: Clock3 },
  { value: "paused", label: "En pausa", icon: Pause },
  { value: "completed", label: "Terminado", icon: Check },
  { value: "dropped", label: "Abandonado", icon: X },
  { value: "waitingContent", label: "Esperando contenido", icon: Hourglass },
] satisfies Array<{ value: TrackingStatus; label: string; icon: typeof Play }>;

function StatusIconSelector({
  status,
  name,
  busy,
  setStatus,
  className = "",
}: {
  status: TrackingStatus;
  name: string;
  busy: boolean;
  setStatus: (status: TrackingStatus) => Promise<void>;
  className?: string;
}) {
  return (
    <div aria-label={`Estado de ${name}`} className={`media-status-icon-selector ${className}`.trim()} role="group">
      {statusOptions.map((option) => {
        const Icon = option.icon;
        const active = option.value === status;
        return (
          <button
            aria-label={option.label}
            aria-pressed={active}
            className={active ? `active status-${option.value}` : ""}
            data-tooltip={option.label}
            disabled={busy}
            key={option.value}
            onClick={() => {
              if (!active) void setStatus(option.value);
            }}
            title={option.label}
            type="button"
          >
            <Icon aria-hidden="true" size={16} strokeWidth={active ? 2.5 : 2} />
          </button>
        );
      })}
    </div>
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

function ProgressEditor({
  current,
  total,
  canIncrement,
  busy,
  increment,
  save,
  showHistory,
}: {
  current: number;
  total: number | null;
  canIncrement: boolean;
  busy: boolean;
  increment: () => Promise<void>;
  save: (watched: number, date: string) => Promise<void>;
  showHistory?: () => void;
}) {
  const [value, setValue] = useState(current.toString());
  const [date, setDate] = useState(todayMadrid);
  useEffect(() => setValue(current.toString()), [current]);
  const hasChanges = value !== "" && Number(value) !== current;
  return (
    <div className={`media-progress-editor${showHistory ? " with-history" : ""}`}>
      <div className="media-progress-value">
        <input
          aria-label="Episodios vistos"
          disabled={busy}
          min={0}
          onChange={(event) => setValue(event.target.value)}
          step={1}
          type="number"
          value={value}
        />
        <span>de {total ?? "?"}</span>
      </div>
      <input
        aria-label="Fecha del avance"
        className="media-progress-date"
        max={todayMadrid()}
        onChange={(event) => setDate(event.target.value)}
        type="date"
        value={date}
      />
      <button
        aria-label="Añadir un episodio"
        className="media-plus-one"
        disabled={busy || !canIncrement}
        onClick={() => void increment()}
        type="button"
      >
        +1
      </button>
      <button
        className="media-save-progress"
        disabled={busy || !hasChanges}
        onClick={() => void save(Number(value), date)}
        type="button"
      >
        Guardar cambios
      </button>
      {showHistory && (
        <button className="media-progress-history" onClick={showHistory} type="button">
          <History aria-hidden="true" size={13} />
          Ver historial
        </button>
      )}
    </div>
  );
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
    <label className={`media-quick-score score-${scoreTone(visualScore)}`} style={{ color: scoreColor(visualScore) }}>
      <span>Tu puntuación</span>
      <div>
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
          style={{ color: scoreColor(visualScore) }}
          type="number"
          value={value}
        />
        <strong>/ 10</strong>
      </div>
    </label>
  );
}

function ScoreValue({
  label,
  score,
  secondary = false,
}: {
  label: string;
  score: number | null;
  secondary?: boolean;
}) {
  return (
    <div className={`${secondary ? "secondary " : ""}media-score-card score-${scoreTone(score)}`} style={{ borderColor: scoreColor(score) }}>
      <span>{label}</span>
      <strong style={{ color: scoreColor(score) }}>{formatScore(score)}</strong>
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
