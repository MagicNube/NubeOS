import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ImagePlus, X } from "lucide-react";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
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
import { mediaApi } from "./api";
import {
  canonStatuses,
  contentKinds,
  scoreColor,
  todayMadrid,
  trackingStatuses,
} from "./presentation";

const parseScore = (value: string) => value ? Number(value.replace(",", ".")) : null;

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
  const [genres, setGenres] = useState(title?.genres.join(", ") ?? "");
  const [kind, setKind] = useState<MediaKind>(initialKind);
  const [status, setStatus] = useState<TrackingStatus>(
    title?.status ?? "pending",
  );
  const [score, setScore] = useState(title?.score?.toString() ?? "");
  const [opinion, setOpinion] = useState(title?.opinion ?? "");
  const [favorite, setFavorite] = useState(title?.favorite ?? false);
  const [isAnime, setIsAnime] = useState(title?.isAnime ?? area === "anime");
  const [startedOn, setStartedOn] = useState(title?.startedOn ?? "");
  const [finishedOn, setFinishedOn] = useState(title?.finishedOn ?? "");
  const [currentSeason, setCurrentSeason] = useState(title?.currentSeason?.toString() ?? "");
  const [currentEpisode, setCurrentEpisode] = useState(title?.currentEpisode?.toString() ?? "");
  const [cover, setCover] = useState<PendingCover | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const initialFingerprint = useMemo(() => JSON.stringify({
    name: title?.name ?? "", alternativeTitle: title?.alternativeTitle ?? "",
    genres: title?.genres.join(", ") ?? "", kind: initialKind,
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
    try {
      const selected = await mediaApi.selectCover();
      if (!selected) return;
      if (cover) await mediaApi.discardCover(cover.token).catch(() => undefined);
      setCover(selected);
      setRemoveCover(false);
    } finally {
      setCoverBusy(false);
    }
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
            genres: genres
              .split(",")
              .map((genre) => genre.trim())
              .filter(Boolean),
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
          }).then((ok) => ok && close());
        }}
      >
        <FormHeader
          title={title ? "Editar título" : "Añadir título"}
          subtitle={area === "anime" ? "Anime o película de anime" : area === "series" ? "Serie" : "Película"}
          close={() => void cancel()}
        />
        <div className="media-form-grid">
          <label className="media-field media-field-wide">
            Nombre principal
            <input
              autoFocus
              maxLength={150}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Boku no Hero Academia"
              required
              value={name}
            />
          </label>
          <label className="media-field media-field-wide">
            Título alternativo (opcional)
            <input
              maxLength={150}
              onChange={(event) => setAlternativeTitle(event.target.value)}
              placeholder="Ej. My Hero Academia"
              value={alternativeTitle}
            />
          </label>
          {area === "anime" && (
            <label className="media-field media-field-wide">
              Géneros (separados por comas)
              <input
                maxLength={500}
                onChange={(event) => setGenres(event.target.value)}
                placeholder="Acción, Comedia, Fantasía"
                value={genres}
              />
            </label>
          )}
          {area === "anime" && (
            <label className="media-field">
              Formato
              <SelectControl>
                <select
                  disabled={Boolean(detail?.contents.length)}
                  onChange={(event) => setKind(event.target.value as MediaKind)}
                  value={kind}
                >
                  <option value="anime">Serie o franquicia</option>
                  <option value="movie">Película independiente</option>
                </select>
              </SelectControl>
              {Boolean(detail?.contents.length) && <small>El formato no puede cambiarse mientras existan contenidos asociados.</small>}
            </label>
          )}
          <label className="media-field">
            Estado
            <SelectControl>
              <select
                onChange={(event) =>
                  setStatus(event.target.value as TrackingStatus)
                }
                value={status}
              >
                {trackingStatuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </SelectControl>
          </label>
          <ScoreField score={score} setScore={setScore} />
          {area !== "anime" && (
            <label className="media-check-field">
              <input
                checked={favorite}
                onChange={(event) => setFavorite(event.target.checked)}
                type="checkbox"
              />
              Marcar como favorito
            </label>
          )}
          {area === "series" && (
            <>
              <label className="media-field">
                Temporada actual (opcional)
                <input min={1} onChange={(event) => setCurrentSeason(event.target.value)} placeholder="Ej. 2" step={1} type="number" value={currentSeason} />
              </label>
              <label className="media-field">
                Episodio actual (opcional)
                <input min={1} onChange={(event) => setCurrentEpisode(event.target.value)} placeholder="Ej. 5" step={1} type="number" value={currentEpisode} />
              </label>
              <label className="media-field">
                Fecha de inicio (opcional)
                <input max={todayMadrid()} onChange={(event) => setStartedOn(event.target.value)} type="date" value={startedOn} />
              </label>
              <label className="media-field">
                Fecha de finalización (opcional)
                <input max={todayMadrid()} onChange={(event) => {
                  setFinishedOn(event.target.value);
                  if (event.target.value) setStatus("completed");
                }} type="date" value={finishedOn} />
              </label>
            </>
          )}
          {(area === "movies" || (area === "anime" && kind === "movie")) && (
            <label className="media-field">
              Fecha de visionado (opcional)
              <input max={todayMadrid()} onChange={(event) => {
                setFinishedOn(event.target.value);
                if (event.target.value) setStatus("completed");
              }} type="date" value={finishedOn} />
            </label>
          )}
          {area === "movies" && title && (
            <label className="media-check-field media-field-wide">
              <input checked={isAnime} onChange={(event) => setIsAnime(event.target.checked)} type="checkbox" />
              Mover esta película a Anime
            </label>
          )}
          <label className="media-field media-field-wide">
            Opinión general (opcional)
            <textarea
              maxLength={4000}
              onChange={(event) => setOpinion(event.target.value)}
              placeholder="Qué te pareció en conjunto…"
              rows={4}
              value={opinion}
            />
          </label>
        </div>
        <section className="cover-picker">
          <div>
            <strong>Portada (opcional)</strong>
            <span>JPEG, PNG, WebP o GIF (máximo 8 MB)</span>
          </div>
          <button
            className="secondary-button"
            disabled={coverBusy}
            onClick={() => void selectCover()}
            type="button"
          >
            <ImagePlus size={16} />
            {coverBusy ? "Seleccionando…" : "Elegir imagen"}
          </button>
          {cover && <span className="cover-file-name">{cover.originalName}</span>}
          {title?.hasCover && !cover && (
            <label className="media-check-field cover-remove">
              <input
                checked={removeCover}
                onChange={(event) => setRemoveCover(event.target.checked)}
                type="checkbox"
              />
              Quitar portada actual
            </label>
          )}
        </section>
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
  const [studio, setStudio] = useState(content?.studio ?? "");
  const [score, setScore] = useState(content?.score?.toString() ?? "");
  const [opinion, setOpinion] = useState(content?.opinion ?? "");
  const [notes, setNotes] = useState(content?.notes ?? "");
  const [startedOn, setStartedOn] = useState(content?.startedOn ?? "");
  const [releasedOn, setReleasedOn] = useState(content?.releasedOn ?? "");
  const [finishedOn, setFinishedOn] = useState(content?.finishedOn ?? "");
  const [studios, setStudios] = useState<string[]>([]);
  const effectiveHint = useMemo(
    () => kind !== "season" && total === "",
    [kind, total],
  );
  useEffect(() => { void mediaApi.listStudios().then(setStudios).catch(() => undefined); }, []);
  const initialFingerprint = useMemo(() => JSON.stringify({
    name: content?.name ?? "", kind: content?.kind ?? "season",
    status: content?.status ?? "pending", canonStatus: content?.canonStatus ?? "canon",
    total: content?.totalEpisodes?.toString() ?? "", studio: content?.studio ?? "",
    score: content?.score?.toString() ?? "", opinion: content?.opinion ?? "",
    notes: content?.notes ?? "", startedOn: content?.startedOn ?? "",
    releasedOn: content?.releasedOn ?? "", finishedOn: content?.finishedOn ?? "",
  }), [content]);
  const dirty = JSON.stringify({ name, kind, status, canonStatus, total, studio, score,
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
            studio: studio.trim() || null,
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
                <SelectControl><select onChange={(event) => setStatus(event.target.value as TrackingStatus)} value={status}>{trackingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
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
              <label className="media-field">
                Estudio (opcional)
                <input list="media-studio-options" maxLength={150} onChange={(event) => setStudio(event.target.value)} placeholder="Ej. Bones" value={studio} />
                <datalist id="media-studio-options">{studios.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
            </div>
          </FormSection>

          <FormSection title="Línea temporal">
            <div className="media-form-grid media-form-grid-three">
              <label className="media-field">Fecha de inicio (opcional)<input onChange={(event) => setStartedOn(event.target.value)} type="date" value={startedOn} /></label>
              <label className="media-field">Fecha final (opcional)<input onChange={(event) => setFinishedOn(event.target.value)} type="date" value={finishedOn} /></label>
              <label className="media-field">Fecha de estreno (opcional)<input onChange={(event) => setReleasedOn(event.target.value)} type="date" value={releasedOn} /></label>
            </div>
          </FormSection>

          <FormSection title="Anotaciones">
            <div className="media-form-grid">
              <label className="media-field">
                Más información (opcional)
                <textarea maxLength={4000} onChange={(event) => setNotes(event.target.value)} placeholder="Información objetiva, orden de visionado o contexto…" rows={2} value={notes} />
              </label>
              <label className="media-field">
                Opinión (opcional)
                <textarea maxLength={4000} onChange={(event) => setOpinion(event.target.value)} placeholder="Qué te pareció este contenido…" rows={2} value={opinion} />
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
  const visualScore = parsed !== null && Number.isFinite(parsed) ? parsed : null;
  return (
    <label className="media-field media-score-field" style={{ color: scoreColor(visualScore) }}>
      <span>Puntuación (opcional)</span>
      <span className="media-score-input">
        <input
          aria-label="Puntuación"
          inputMode="decimal"
          max={10}
          min={0}
          onChange={(event) => setScore(event.target.value)}
          placeholder="—"
          step={0.1}
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
