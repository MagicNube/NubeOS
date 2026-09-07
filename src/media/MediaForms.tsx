import React, { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ImagePlus, Star, Trash2, X } from "lucide-react";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import { notifyCoverChanged } from "../ui/coverRefresh";
import { pastedCoverAsJpeg } from "../ui/pastedCover";
import type {
  ContentKind,
  MediaContent,
  MediaContentInput,
  MediaDetail,
  MediaArea,
  MediaKind,
  MediaTitleInput,
  PendingCover,
  TrackingStatus,
} from "./api";
import { mediaApi, mediaErrorMessage } from "./api";
import {
  canonStatuses,
  contentKinds,
  scoreColor,
  trackingStatuses,
  animeTrackingStatuses,
  statusHelp,
  contentTrackingStatuses,
} from "./presentation";

const parseScore = (value: string) => value ? Number(value.replace(",", ".")) : null;
const animeGenres = [
  "Acción", "Aventura", "Comedia", "Drama", "Fantasía", "Ciencia ficción",
  "Romance", "Misterio", "Terror", "Deportes", "Escolar", "Slice of Life",
  "Sobrenatural", "Psicológico", "Thriller", "Mecha", "Música", "Histórico",
  "Ecchi", "Isekai", "Otro",
];

export function MediaTitleForm({
  detail,
  area,
  preferredKind,
  busy,
  save,
  close,
}: {
  detail: MediaDetail | null;
  area: MediaArea;
  preferredKind?: MediaKind;
  busy: boolean;
  save: (input: MediaTitleInput) => Promise<boolean>;
  close: () => void;
}) {
  const title = detail?.title;
  const initialKind: MediaKind = title?.kind ?? preferredKind ?? (area === "anime" ? "anime" : area === "series" ? "series" : "movie");
  const [name, setName] = useState(title?.name ?? "");
  const [alternativeTitle, setAlternativeTitle] = useState(
    title?.alternativeTitle ?? "",
  );
  const [genres, setGenres] = useState<string[]>(title?.genres ?? []);
  const [kind, setKind] = useState<MediaKind>(initialKind);
  const [status, setStatus] = useState<TrackingStatus>(
    title?.status ?? "pending",
  );
  const [score, setScore] = useState(title?.score?.toString() ?? "");
  const [opinion, setOpinion] = useState(title?.opinion ?? "");
  const [favorite, setFavorite] = useState(title?.favorite ?? false);
  const [isAnime, setIsAnime] = useState(title?.isAnime ?? area === "anime");
  const startedOn = title?.startedOn ?? "";
  const finishedOn = title?.finishedOn ?? "";
  const [currentSeason, setCurrentSeason] = useState(title?.currentSeason?.toString() ?? "");
  const [currentEpisode, setCurrentEpisode] = useState(title?.currentEpisode?.toString() ?? "");
  const [cover, setCover] = useState<PendingCover | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const initialFingerprint = useMemo(() => JSON.stringify({
    name: title?.name ?? "", alternativeTitle: title?.alternativeTitle ?? "",
    genres: title?.genres ?? [], kind: initialKind,
    status: title?.status ?? "pending", score: title?.score?.toString() ?? "",
    opinion: title?.opinion ?? "", favorite: title?.favorite ?? false,
    isAnime: title?.isAnime ?? area === "anime", startedOn: title?.startedOn ?? "",
    finishedOn: title?.finishedOn ?? "", currentSeason: title?.currentSeason?.toString() ?? "",
    currentEpisode: title?.currentEpisode?.toString() ?? "", removeCover: false,
  }), [area, initialKind, title]);
  const dirty = JSON.stringify({ name, alternativeTitle, genres, kind, status, score,
    opinion, favorite, isAnime, startedOn, finishedOn, currentSeason, currentEpisode,
    removeCover }) !== initialFingerprint || cover !== null;

  async function selectCover() {
    setCoverBusy(true);
    setCoverError(null);
    try {
      const selected = await mediaApi.selectCover();
      if (!selected) return;
      if (cover) await mediaApi.discardCover(cover.token).catch(() => undefined);
      setCover(selected);
      setRemoveCover(false);
    } catch (reason) {
      setCoverError(mediaErrorMessage(reason));
    } finally {
      setCoverBusy(false);
    }
  }

  async function pasteCover(event: React.ClipboardEvent<HTMLElement>) {
    setCoverBusy(true);
    setCoverError(null);
    try {
      const bytes = await pastedCoverAsJpeg(event, area === "anime");
      if (!bytes) return;
      const selected = await mediaApi.preparePastedCover(bytes);
      if (cover) await mediaApi.discardCover(cover.token).catch(() => undefined);
      setCover(selected);
      setRemoveCover(false);
    } catch (reason) { setCoverError(mediaErrorMessage(reason)); }
    finally { setCoverBusy(false); }
  }

  async function cancel() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Quieres salir igualmente?")) return;
    if (cover) await mediaApi.discardCover(cover.token).catch(() => undefined);
    close();
  }

  return (
    <Modal
      className="media-form-dialog"
      labelledBy="media-title-form-title"
      onClose={() => void cancel()}
    >
      <form
        className="media-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save({
            name,
            alternativeTitle: alternativeTitle.trim() || null,
            genres,
            primaryStudio: null,
            kind,
            isAnime,
            status,
            score: parseScore(score),
            opinion: opinion.trim() || null,
            favorite,
            startedOn: startedOn || null,
            finishedOn: finishedOn || null,
            currentSeason: area === "series" && currentSeason ? Number(currentSeason) : null,
            currentEpisode: area === "series" && currentEpisode ? Number(currentEpisode) : null,
            coverToken: cover?.token ?? null,
            removeCover,
          }).then((ok) => {
            if (!ok) return;
            if (title && (cover || removeCover)) notifyCoverChanged(title.id);
            close();
          });
        }}
      >
        <FormHeader
          title={title ? `Editar ${area === "anime" ? "anime" : area === "series" ? "serie" : "película"}` : `Añadir ${area === "anime" ? "anime" : area === "series" ? "serie" : "película"}`}
          subtitle={area === "anime" ? "Anime o película de anime" : area === "series" ? "Serie" : "Película"}
          close={() => void cancel()}
        />
        <div className="media-form-sections media-title-form-sections">
          <FormSection title="Identificación">
            <div className="media-form-grid">
              <label className="media-field">
                Nombre principal
                <input autoFocus maxLength={150} onChange={(event) => setName(event.target.value)} placeholder={area === "anime" ? "Ej. Steins;Gate" : area === "series" ? "Ej. Dark" : "Ej. Interstellar"} required value={name} />
              </label>
              <label className="media-field">
                Título alternativo (opcional)
                <input maxLength={150} onChange={(event) => setAlternativeTitle(event.target.value)} placeholder={area === "anime" ? "Título alternativo del anime" : area === "series" ? "Título alternativo de la serie" : "Título alternativo de la película"} value={alternativeTitle} />
              </label>
              {area === "anime" && <div className="media-genre-field media-field-wide"><span>Géneros</span><div>{[...new Set([...animeGenres, ...genres])].map((genre) => <button className={genres.includes(genre) ? "active" : ""} key={genre} onClick={() => setGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre])} type="button">{genre}</button>)}</div></div>}
              {area === "anime" && <label className="media-field">
                Formato
                <SelectControl><select disabled={Boolean(detail?.contents.length)} onChange={(event) => { const next = event.target.value as MediaKind; setKind(next); if (next !== "anime" && status === "toResume") setStatus("pending"); }} value={kind}><option value="anime">Serie o franquicia</option><option value="movie">Película independiente</option></select></SelectControl>
                {Boolean(detail?.contents.length) && <small>El formato no puede cambiarse mientras existan contenidos asociados.</small>}
              </label>}
            </div>
          </FormSection>

          <FormSection title="Seguimiento">
            <div className="media-form-grid">
              {area !== "movies" && <label className="media-field">
                Estado
                <SelectControl><select aria-label="Estado" aria-describedby={statusHelp(status) ? "anime-status-help" : undefined} title={statusHelp(status)} onChange={(event) => setStatus(event.target.value as TrackingStatus)} value={status}>{(kind === "anime" ? animeTrackingStatuses : trackingStatuses).map((item) => <option key={item.value} title={statusHelp(item.value)} value={item.value}>{item.label}</option>)}</select></SelectControl>{statusHelp(status) && <small className="media-muted" id="anime-status-help">{statusHelp(status)}</small>}
              </label>}
              <ScoreField score={score} setScore={setScore} />
              <div className="media-field"><span>Favorito</span><button aria-pressed={favorite} className={`media-form-favorite${favorite ? " active" : ""}`} onClick={() => setFavorite(!favorite)} type="button"><Star fill={favorite ? "currentColor" : "none"} size={18} /> {favorite ? "En favoritos" : "Añadir a favoritos"}</button></div>
              {area === "series" && <>
                <label className="media-field">Temporada actual (opcional)<input min={1} onChange={(event) => setCurrentSeason(event.target.value)} placeholder="Ej. 2" step={1} type="number" value={currentSeason} /></label>
                <label className="media-field">Episodio actual (opcional)<input min={1} onChange={(event) => setCurrentEpisode(event.target.value)} placeholder="Ej. 5" step={1} type="number" value={currentEpisode} /></label>
              </>}
              {area === "movies" && title && <label className="media-check-field media-field-wide"><input checked={isAnime} onChange={(event) => setIsAnime(event.target.checked)} type="checkbox" />Mover esta película a Anime</label>}
            </div>
          </FormSection>

          <FormSection title="Opinión">
            <label className="media-field"><textarea maxLength={4000} onChange={(event) => setOpinion(event.target.value)} placeholder="Qué te pareció en conjunto…" rows={3} value={opinion} /></label>
          </FormSection>

          <FormSection title="Portada">
            <section className="cover-picker" onPaste={(event) => void pasteCover(event)} tabIndex={0}>
              <div>
                <span className="cover-current-name">{cover ? cover.originalName : title?.hasCover && !removeCover ? "Portada actual guardada" : "Sin portada"}</span>
                <span>{area === "anime" ? "Elige o pega una imagen. Los GIF conservan su animación." : "Elige una imagen o pégala con Ctrl+V. Se guardará como JPEG."}</span>
              </div>
              <div className="cover-picker-actions">
                <button className="secondary-button" disabled={coverBusy} onClick={() => void selectCover()} type="button"><ImagePlus size={16} />{coverBusy ? "Seleccionando…" : "Elegir imagen"}</button>
                {(title?.hasCover || cover) && !removeCover && <button aria-label="Quitar portada" className="media-icon-button cover-remove-button" onClick={() => { if (cover) void mediaApi.discardCover(cover.token).catch(() => undefined); setCover(null); setRemoveCover(Boolean(title?.hasCover)); }} title="Quitar portada" type="button"><Trash2 size={16} /></button>}
              </div>
              {coverError && <span className="cover-error" role="alert">{coverError}</span>}
            </section>
          </FormSection>
        </div>
        <FormFooter busy={busy} cancel={() => void cancel()} />
      </form>
    </Modal>
  );
}

export function MediaContentForm({
  content,
  busy,
  save,
  close,
}: {
  content: MediaContent | null;
  busy: boolean;
  save: (input: MediaContentInput) => Promise<boolean>;
  close: () => void;
}) {
  const [name, setName] = useState(content?.name ?? "");
  const [kind, setKind] = useState<ContentKind>(content?.kind ?? "season");
  const [status, setStatus] = useState<TrackingStatus>(
    content?.status ?? "pending",
  );
  const [canonStatus, setCanonStatus] = useState(
    content?.canonStatus ?? "canon",
  );
  const [total, setTotal] = useState(content?.totalEpisodes?.toString() ?? "");
  const [score, setScore] = useState(content?.score?.toString() ?? "");
  const [opinion, setOpinion] = useState(content?.opinion ?? "");
  const [notes, setNotes] = useState(content?.notes ?? "");
  const startedOn = content?.startedOn ?? "";
  const [releasedOn, setReleasedOn] = useState(content?.releasedOn ?? "");
  const finishedOn = content?.finishedOn ?? "";
  const effectiveHint = useMemo(
    () => kind !== "season" && total === "",
    [kind, total],
  );
  const initialFingerprint = useMemo(() => JSON.stringify({
    name: content?.name ?? "", kind: content?.kind ?? "season",
    status: content?.status ?? "pending", canonStatus: content?.canonStatus ?? "canon",
    total: content?.totalEpisodes?.toString() ?? "",
    score: content?.score?.toString() ?? "", opinion: content?.opinion ?? "",
    notes: content?.notes ?? "", startedOn: content?.startedOn ?? "",
    releasedOn: content?.releasedOn ?? "", finishedOn: content?.finishedOn ?? "",
  }), [content]);
  const dirty = JSON.stringify({ name, kind, status, canonStatus, total, score,
    opinion, notes, startedOn, releasedOn, finishedOn }) !== initialFingerprint;
  function requestClose() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Quieres salir igualmente?")) return;
    close();
  }

  return (
    <Modal
      className="media-form-dialog media-content-form-dialog"
      labelledBy="media-content-form-title"
      onClose={requestClose}
    >
      <form
        className="media-form media-content-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save({
            name,
            kind,
            status,
            canonStatus,
            totalEpisodes: total ? Number(total) : null,
            studio: null,
            score: parseScore(score),
            opinion: opinion.trim() || null,
            notes: notes.trim() || null,
            startedOn: startedOn || null,
            releasedOn: releasedOn || null,
            finishedOn: finishedOn || null,
          }).then((ok) => ok && close());
        }}
      >
        <FormHeader
          title={content ? "Editar contenido" : "Añadir contenido"}
          subtitle="Temporada, película vinculada, OVA o especial"
          close={requestClose}
        />
        <div className="media-form-sections">
          <FormSection title="Identificación">
            <div className="media-form-grid">
              <label className="media-field">
                Nombre
                <input autoFocus maxLength={150} onChange={(event) => setName(event.target.value)} placeholder="Ej. Temporada 1" required value={name} />
              </label>
              <label className="media-field">
                Tipo
                <SelectControl><select onChange={(event) => setKind(event.target.value as ContentKind)} value={kind}>{contentKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
              </label>
            </div>
          </FormSection>

          <FormSection title="Estado y progreso">
            <div className="media-form-grid media-form-grid-three">
              <label className="media-field">
                Estado
                <SelectControl><select onChange={(event) => setStatus(event.target.value as TrackingStatus)} value={status}>{contentTrackingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
                {status === "waitingContent" && <small>No cuenta en el progreso disponible.</small>}
              </label>
              <label className="media-field">
                Episodios totales (opcional)
                <input inputMode="numeric" min={1} onChange={(event) => setTotal(event.target.value)} placeholder={kind === "season" ? "Desconocido" : "1 unidad"} step={1} type="number" value={total} />
                {effectiveHint && <small>Se contará como una unidad.</small>}
              </label>
              <ScoreField score={score} setScore={setScore} />
            </div>
          </FormSection>

          <FormSection title="Metadatos">
            <div className="media-form-grid">
              <label className="media-field">
                Canonicidad
                <SelectControl><select onChange={(event) => setCanonStatus(event.target.value as typeof canonStatus)} value={canonStatus}>{canonStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
              </label>
              <label className="media-field">Fecha de estreno (opcional)<SmartDateInput onChange={setReleasedOn} value={releasedOn} /></label>
            </div>
          </FormSection>

          <FormSection title="Opinión y anotaciones">
            <div className="media-form-grid">
              <label className="media-field">
                Opinión (opcional)
                <textarea maxLength={4000} onChange={(event) => setOpinion(event.target.value)} placeholder="Qué te pareció este contenido…" rows={2} value={opinion} />
              </label>
              <label className="media-field">
                Anotaciones (opcional)
                <textarea maxLength={4000} onChange={(event) => setNotes(event.target.value)} placeholder="Información objetiva, orden de visionado o contexto…" rows={2} value={notes} />
              </label>
            </div>
          </FormSection>
        </div>
        <FormFooter busy={busy} cancel={requestClose} />
      </form>
    </Modal>
  );
}

function ScoreField({ score, setScore }: { score: string; setScore: (value: string) => void }) {
  const parsed = parseScore(score);
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10);
  const visualScore = valid ? parsed : null;
  return (
    <label className={`media-field media-score-field${valid ? "" : " invalid"}`} style={{ color: scoreColor(visualScore) }}>
      <span>Puntuación (opcional)</span>
      <span className="media-score-input">
        <input
          aria-invalid={!valid}
          aria-label="Puntuación"
          inputMode="decimal"
          max={10}
          min={0}
          onChange={(event) => setScore(event.target.value)}
          placeholder="—"
          step={0.01}
          style={{ color: scoreColor(visualScore) }}
          type="number"
          value={score}
        />
        <strong>/ 10</strong>
      </span>
    </label>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="media-form-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function FormHeader({
  title,
  subtitle,
  close,
}: {
  title: string;
  subtitle: string;
  close: () => void;
}) {
  return (
    <header className="media-form-header">
      <div>
        <h2 id={title.includes("contenido") ? "media-content-form-title" : "media-title-form-title"}>
          {title}
        </h2>
        <p>{subtitle}</p>
      </div>
      <button aria-label="Cerrar" className="media-icon-button" onClick={close} type="button">
        <X size={18} />
      </button>
    </header>
  );
}

function FormFooter({ busy, cancel }: { busy: boolean; cancel: () => void }) {
  return (
    <footer className="media-form-footer">
      <button className="secondary-button" disabled={busy} onClick={cancel} type="button">
        Cancelar
      </button>
      <button className="primary-button" disabled={busy} type="submit">
        {busy ? "Guardando…" : "Guardar"}
      </button>
    </footer>
  );
}
