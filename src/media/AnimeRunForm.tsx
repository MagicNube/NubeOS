import { useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import ContentWatchDate from "./ContentWatchDate";
import type { ContentRun, ContentRunRegistration, ContentRunStatus, MediaContent, WatchSession } from "./api";
import { todayMadrid } from "./presentation";

export const runLabel = (run: ContentRun) => run.ordinal === 0 ? "Primer visionado" : `Revisionado ${run.ordinal}`;
export const runStatusLabel = (status: ContentRunStatus) => ({ inProgress: "En curso", completed: "Terminado", interrupted: "Interrumpido" })[status];

export default function AnimeRunForm({ error, contents, runs = [], sessions = [], initialTarget, busy, close, register, saveRun }: {
  error?: string | null; contents: MediaContent[]; runs?: ContentRun[]; sessions?: WatchSession[];
  initialTarget?: { contentId: string; runId: string } | null;
  busy: boolean; close: () => void;
  register: (content: MediaContent, watched: number, date: string) => Promise<boolean>;
  saveRun: (input: ContentRunRegistration) => Promise<boolean>;
}) {
  const available = contents.filter((c) => c.canonStatus !== "omitted" && c.status !== "waitingContent");
  const initial = available.find((c) => c.id === initialTarget?.contentId)
    ?? available.find((c) => c.status === "watching" && c.canIncrement)
    ?? available.find((c) => c.canIncrement) ?? available[0];
  function canContinueBase(content?: MediaContent) {
    const base = runs.find((r) => r.contentId === content?.id && r.isProgressRun);
    return Boolean(content?.canIncrement && base?.status !== "interrupted");
  }
  function defaultRun(content?: MediaContent) {
    const ongoing = runs.filter((r) => r.contentId === content?.id && !r.isProgressRun && r.status === "inProgress" && r.nextEpisode !== null)
      .sort((a, b) => b.lastOn.localeCompare(a.lastOn) || b.id.localeCompare(a.id))[0];
    return ongoing?.id ?? (canContinueBase(content) ? "base" : "new");
  }
  const initialRun = initialTarget?.runId ?? defaultRun(initial);
  function suggestedFirst(content: MediaContent | undefined, runId: string) {
    if (runId === "base") return (content?.watchedEpisodes ?? 0) + 1;
    return runs.find((r) => r.id === runId)?.nextEpisode ?? 1;
  }
  const [contentId, setContentId] = useState(initial?.id ?? "");
  const [runId, setRunId] = useState(initialRun);
  const [first, setFirst] = useState(String(suggestedFirst(initial, initialRun)));
  const [last, setLast] = useState(first);
  const [date, setDate] = useState(todayMadrid);
  const [status, setStatus] = useState<ContentRunStatus>("inProgress");
  const content = available.find((c) => c.id === contentId);
  const selectedRun = runs.find((r) => r.id === runId);
  const isBase = runId === "base";
  const start = Number(first), end = Number(last);
  const episodeCount = end - start + 1;
  const total = content?.effectiveTotal ?? null;
  const existing = sessions.filter((s) => s.runId === runId);
  const overlaps = !isBase && existing.some((s) => s.episodeNumber >= start && s.episodeNumber <= end);
  const validRange = Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start && (total === null || end <= total);
  const coveredOutsideRange = new Set(existing.filter((s) => s.episodeNumber < start || s.episodeNumber > end).map((s) => s.episodeNumber)).size;
  const canComplete = validRange && (total === null || coveredOutsideRange + end - start + 1 === total);
  const valid = Boolean(content && validRange && !overlaps && date && date <= todayMadrid() && (!content.releasedOn || date >= content.releasedOn)
    && (isBase ? canContinueBase(content) : (runId === "new" || selectedRun?.status === "inProgress") && (status !== "completed" || canComplete)));
  function select(content: MediaContent | undefined, id: string) {
    setContentId(content?.id ?? ""); setRunId(id);
    const next = String(suggestedFirst(content, id));
    setFirst(next); setLast(next); setStatus("inProgress");
  }
  function bounded(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    return digits && total !== null ? String(Math.min(Number(digits), total)) : digits;
  }
  return <Modal className="media-watch-form-dialog" labelledBy="anime-watch-form-title" onClose={close}>
    <form className="media-watch-form" onSubmit={async (event) => {
      event.preventDefault();
      if (!valid || !content) return;
      const saved = isBase ? await register(content, end, date) : await saveRun({ contentId, runId: runId === "new" ? null : runId, firstEpisode: start, lastEpisode: end, watchedOn: date, status });
      if (saved) close();
    }}>
      <header><div><h2 id="anime-watch-form-title">Registrar visionado</h2><p>Continúa un recorrido o empieza otro desde el episodio que elijas.</p></div><button type="button" aria-label="Cerrar" className="media-icon-button" onClick={close}><X size={18} /></button></header>
      {error && <div className="media-error" role="alert">{error}</div>}
      <label>Contenido<SelectControl><select disabled={busy} value={contentId} onChange={(e) => { const c = available.find((x) => x.id === e.target.value); select(c, defaultRun(c)); }}>{available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></SelectControl></label>
      <label>Recorrido<SelectControl><select disabled={busy} value={runId} onChange={(e) => select(content, e.target.value)}>
        {content?.canIncrement && <option value="base" disabled={!canContinueBase(content)}>Continuar progreso principal · {content.watchedEpisodes} de {total ?? "?"}</option>}
        {runs.filter((r) => r.contentId === contentId && !r.isProgressRun).map((r) => <option key={r.id} value={r.id} disabled={r.status !== "inProgress" || r.nextEpisode === null}>{runLabel(r)} · {r.watched} episodios · {runStatusLabel(r.status)}</option>)}
        <option value="new">Nuevo recorrido</option>
      </select></SelectControl></label>
      <div className="media-watch-form-grid">
        <label>Episodio inicial<input disabled={busy || isBase} inputMode="numeric" type="text" value={first} onChange={(e) => setFirst(bounded(e.target.value))} /></label>
        <label>Episodio final<input disabled={busy} inputMode="numeric" type="text" value={last} onChange={(e) => setLast(bounded(e.target.value))} /></label>
      </div>
      {total !== null && <label className="media-watch-all"><input type="checkbox" disabled={busy} checked={end === total} onChange={(e) => setLast(e.target.checked ? String(total) : first)} /><span>Hasta el último episodio ({total})</span></label>}
      <div className="media-watch-form-grid">
        <ContentWatchDate disabled={busy} releasedOn={content?.releasedOn ?? null} onChange={setDate} value={date} />
        {!isBase && <label>Dejar este recorrido<SelectControl><select disabled={busy} value={status} onChange={(e) => setStatus(e.target.value as ContentRunStatus)}><option value="inProgress">En curso</option><option value="completed" disabled={!canComplete}>Terminado</option><option value="interrupted">Interrumpido</option></select></SelectControl></label>}
      </div>
      {overlaps && <p className="media-error" role="alert">Ese intervalo ya contiene episodios registrados. Para repetirlos, elige Nuevo recorrido.</p>}
      <div className="media-watch-preview"><span>Después del registro</span><strong>{validRange ? episodeCount === 1 ? `Episodio ${start} (1 episodio)` : `Episodios ${start}–${end} (${episodeCount} episodios)` : "Revisa el intervalo"}</strong><small>{isBase ? `El progreso principal quedará en ${end} de ${total ?? "?"}.` : "Este recorrido no cambia el progreso principal ni el estado del anime."}</small></div>
      <footer><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="primary-button" type="submit" disabled={busy || !valid}><Plus size={16} /> Registrar visionado</button></footer>
    </form>
  </Modal>;
}
