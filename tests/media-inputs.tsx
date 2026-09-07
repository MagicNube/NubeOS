// Manual regression fixture: npm run dev, then /tests/media-inputs.html.
// No Tauri commands or personal data are used.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Modal from "../src/ui/Modal";
import SmartDateInput from "../src/ui/SmartDateInput";
import { conciseContentName } from "../src/media/presentation";
import { resolveContentProgressStatus } from "../src/media/statusChoice";
import { mediaApi } from "../src/media/api";
import type { MediaDetail } from "../src/media/api";
import "../src/styles.css";

const examples = [
  ["Temporada 2 — Horimiya: The Missing Pieces", "Horimiya", null, "Temporada 2 — The Missing Pieces"],
  ["Temporada 2 — Solo Leveling: Arise from the Shadow", "Solo Leveling", null, "Temporada 2 — Arise from the Shadow"],
  ["Temporada 1 --- Anime", "Anime", null, "Temporada 1"],
  ["Temporada 1 – Anime", "Anime", null, "Temporada 1"],
  ["Temporada 1 — Anime", "Anime", null, "Temporada 1"],
  ["Temporada 2 - Los diarios de la boticaria", "The Apothecary Diaries", "Los diarios de la boticaria", "Temporada 2"],
  ["No Game No Life: Zero", "No Game No Life", null, "No Game No Life: Zero"],
  ["Temporada 4 Parte 1 - To the Top", "Haikyuu!!", null, "Temporada 4 Parte 1 - To the Top"],
  ["OVA 3 - Los jóvenes y el torneo de primavera", "Haikyuu!!", null, "OVA 3 - Los jóvenes y el torneo de primavera"],
  ["Película — No Game No Life: Zero", "No Game No Life", null, "No Game No Life: Zero"],
];
const failures = examples.filter(([name, title, alternative, expected]) => conciseContentName(name!, title!, alternative) !== expected);

function Fixture() {
  const [date, setDate] = useState("");
  const [last, setLast] = useState("2026-09-03");
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState("Sin simular");
  async function simulateFuture(alreadyCompleted = false, dateOnly = false, noFuture = false) {
    let state = {
      title: { id: "anime", name: "Anime de prueba", status: "paused", suggestedStatus: "waitingContent", progress: { watched: 24, total: 24, totalIncomplete: false, percentage: 100, availableCompleted: true, upcomingCount: 1 } },
      contents: [
        { id: "test", name: "Temporada 2", kind: "season", status: alreadyCompleted ? "completed" : "watching", suggestedStatus: alreadyCompleted ? null : "completed", canonStatus: "canon", totalEpisodes: 12, effectiveTotal: 12, watchedEpisodes: 12 },
        { id: "future", name: "Temporada 3", status: "waitingContent", watchedEpisodes: 0 },
      ],
    } as unknown as MediaDetail;
    if (noFuture) {
      state.title.progress.upcomingCount = 0;
      state.title.suggestedStatus = "completed";
      state.contents = state.contents.slice(0, 1);
    }
    const before = { ...state, title: { ...state.title, progress: { ...state.title.progress, availableCompleted: dateOnly } }, contents: [{ ...state.contents[0], watchedEpisodes: dateOnly ? 12 : 11 }, ...state.contents.slice(1)] };
    const originalContent = mediaApi.updateContent;
    const originalTitle = mediaApi.updateTitle;
    let contentWrites = 0;
    let titleWrites = 0;
    mediaApi.updateContent = async (_id, input) => { contentWrites++; state = { ...state, contents: [{ ...state.contents[0], status: input.status }, ...state.contents.slice(1)] }; return state; };
    mediaApi.updateTitle = async (_id, input) => { titleWrites++; state = { ...state, title: { ...state.title, status: input.status } }; return state; };
    try {
      const resolved = await resolveContentProgressStatus(before, state, "test");
      setResult(`Anime: ${resolved.title.status}; contenido: ${resolved.contents[0].status}; escrituras: ${contentWrites}/${titleWrites}; futuro: ${resolved.contents[1]?.status ?? "ninguno"}; episodios: ${resolved.contents[0].watchedEpisodes}`);
    } finally { mediaApi.updateContent = originalContent; mediaApi.updateTitle = originalTitle; }
  }
  async function simulate() {
    const content = { id: "test", name: "Temporada de prueba", kind: "season", status: "pending", suggestedStatus: "watching", canonStatus: "canon", totalEpisodes: 12, effectiveTotal: 12, watchedEpisodes: 3 };
    const after = { title: { status: "pending", suggestedStatus: "watching", progress: { availableCompleted: false, upcomingCount: 0 } }, contents: [content] } as unknown as MediaDetail;
    const before = { ...after, contents: [{ ...after.contents[0], watchedEpisodes: 0 }] };
    const original = mediaApi.updateContent;
    let writes = 0;
    mediaApi.updateContent = async (_id, input) => { writes++; return { ...after, contents: [{ ...after.contents[0], status: input.status }] }; };
    try {
      const resolved = await resolveContentProgressStatus(before, after, "test");
      setResult(`Estado: ${resolved.contents[0].status}; actualizaciones: ${writes}; episodios: ${resolved.contents[0].watchedEpisodes}`);
    } finally { mediaApi.updateContent = original; }
  }
  return <>
    <button onClick={() => setOpen(true)}>Abrir prueba</button>
    {open && <Modal labelledBy="test-title" onClose={() => setOpen(false)}>
      <div style={{ padding: 32 }}>
        <h2 id="test-title">Prueba de fechas Media</h2>
        <p>{failures.length ? `FALLOS: ${JSON.stringify(failures)}` : `${examples.length} casos de títulos correctos`}</p>
        <label>Primera fecha<SmartDateInput aria-label="Primera fecha" value={date} onChange={setDate} /></label>
        <p>Valor inicial: <output>{date || "vacío"}</output></p>
        <button onClick={() => setDate("2025-12-31")}>Cambiar desde fuera</button>
        <button onClick={() => void simulate()}>Simular 3 de 12</button><p>{result}</p>
        <button onClick={() => void simulateFuture()}>Completar con T3 por salir</button>
        <button onClick={() => void simulateFuture(true)}>Contenido ya Terminado</button>
        <button onClick={() => void simulateFuture(true, true)}>Solo editar fecha</button>
        <button onClick={() => void simulateFuture(false, false, true)}>Completar sin futuros</button>
        <label>Última fecha<SmartDateInput aria-label="Última fecha" value={last} onChange={setLast} /></label>
        <p>Valor final: <output>{last || "vacío"}</output></p>
      </div>
    </Modal>}
  </>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<Fixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
