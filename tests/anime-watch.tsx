// Isolated fixture: no Tauri calls or personal data writes.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimeWatchForm, AnimeHistoryEditForm, AnimeHistoryPanel } from "../src/media/MediaDetail";
import type { ContentRun, MediaContent, WatchSession } from "../src/media/api";
import "../src/styles.css";
import "../src/media/media.css";

const base: MediaContent = {
  id: "t1", titleId: "test", name: "Temporada 1", kind: "season", status: "completed",
  suggestedStatus: null, canonStatus: "canon", totalEpisodes: 12, effectiveTotal: 12,
  watchedEpisodes: 12, studio: null, score: null, opinion: null, notes: null,
  startedOn: null, releasedOn: "2024-01-07", finishedOn: null, position: 0,
  canIncrement: false, canRewatch: true, firstActivityOn: null, lastActivityOn: null,
};
const contents = [base, { ...base, id: "t2", name: "Temporada 2 — Solo Leveling", totalEpisodes: 13, effectiveTotal: 13, watchedEpisodes: 0, releasedOn: "2025-01-05", canIncrement: true, canRewatch: false }];
contents.push({ ...contents[1], id: "partial", name: "Progreso parcial", watchedEpisodes: 3 });
contents.push({ ...contents[1], id: "unknown", name: "Total desconocido", totalEpisodes: null, effectiveTotal: null, releasedOn: null });
const hunter: MediaContent = { ...base, id: "hunter", name: "Hunter x Hunter · Temporada 1", watchedEpisodes: 148, totalEpisodes: 148, effectiveTotal: 148, releasedOn: "2011-10-02" };
contents.push(hunter);
const runs: ContentRun[] = [
  { id: "hunter-base", contentId: "hunter", ordinal: 0, status: "completed", isProgressRun: true, firstOn: "2021-06-30", lastOn: "2021-06-30", watched: 148, nextEpisode: null, canComplete: true },
  { id: "hunter-repeat", contentId: "hunter", ordinal: 1, status: "inProgress", isProgressRun: false, firstOn: "2025-12-05", lastOn: "2025-12-05", watched: 60, nextEpisode: 61, canComplete: false },
];
const sessions: WatchSession[] = Array.from({ length: 60 }, (_, i) => ({ id: `s${i}`, contentId: "hunter", contentName: hunter.name, watchedOn: "2025-12-05", episodeNumber: i + 1, source: "manualAdjustment", canDelete: true, registrationId: "registration", isRewatch: true, isChronologicalRewatch: true, runId: "hunter-repeat" }));

function Fixture() {
  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState<{ contentId: string; runId: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fail, setFail] = useState(false);
  const [result, setResult] = useState("Sin registros");
  const [busy, setBusy] = useState(false);
  async function save(mode: string, content: MediaContent, episodes: number, date: string) {
    setBusy(true);
    setError(null);
    await Promise.resolve();
    setBusy(false);
    if (fail) { setError("Error de prueba al guardar: el registro no se guardó."); return false; }
    setResult(`${mode}: ${content.id}; episodios: ${episodes}; fecha: ${date}`);
    return true;
  }
  return <div style={{ padding: 30 }}>
    <h1>Registro manual de Anime</h1>
    <p role="status">{result}</p>
    <button onClick={() => { setFail(false); setError(null); setOpen(true); }}>Registrar</button>
    <button onClick={() => { setFail(true); setError(null); setOpen(true); }}>Probar error</button>
    <button onClick={() => setEditing(true)}>Editar instancia</button>
    <AnimeHistoryPanel archived={false} busy={busy} contents={contents} runs={runs} sessions={sessions}
      setRunStatus={async (_c, _r, status) => { setResult(status); return true; }} register={(next) => { setTarget(next ?? null); setOpen(true); }}
      quickAdd={null} quickAddLabel={null} openFullHistory={() => setResult("Historial completo")}
      updateGroup={async () => true} deleteGroup={async () => true} />
    {open && <AnimeWatchForm busy={busy} error={error} contents={contents} runs={runs} sessions={sessions} initialTarget={target} close={() => setOpen(false)}
      register={(c, n, date) => save("normal", c, n, date)} saveRun={(input) => save(`recorrido ${input.firstEpisode}–${input.lastEpisode}`, contents.find((c) => c.id === input.contentId)!, input.lastEpisode - input.firstEpisode + 1, input.watchedOn)} />}
    {editing && <AnimeHistoryEditForm busy={false} group={{ key: "test", content: hunter, watchedOn: "2025-12-06", episodes: Array.from({ length: 15 }, (_, i) => i + 61), sessionIds: [], isRewatch: true, isChronologicalRewatch: true, canDelete: true }} close={() => setEditing(false)} save={async (n, date, first) => { setResult(`edición: ${first}–${first + n - 1}; ${n}; ${date}`); setEditing(false); }} />}
  </div>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
