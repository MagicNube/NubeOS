// Isolated UI regression: no Tauri commands or user data.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MediaTitleForm } from "../src/media/MediaForms";
import { resolveContentAvailabilityStatus } from "../src/media/statusChoice";
import { mediaApi, type MediaDetail } from "../src/media/api";
import { animeTrackingStatuses, contentTrackingStatuses, trackingStatuses } from "../src/media/presentation";
import "../src/styles.css";
import "../src/ui/ui.css";
import "../src/media/media.css";

function Fixture() {
  const [form, setForm] = useState(false);
  const [result, setResult] = useState("Sin simular");
  async function simulate(omitted = false, unchanged = false) {
    const before = {
      title: { id: "anime", name: "Anime de prueba", kind: "anime", status: "waitingContent" },
      contents: [{ id: "future", status: "waitingContent", canonStatus: omitted ? "omitted" : "canon" }],
    } as MediaDetail;
    const after = { ...before, title: { ...before.title, suggestedStatus: "toResume" as const },
      contents: [{ ...before.contents[0], status: unchanged ? "waitingContent" as const : "pending" as const }] };
    let writes = 0;
    const original = mediaApi.setTitleStatus;
    mediaApi.setTitleStatus = async (_id, status) => { writes++; return { ...after, title: { ...after.title, status } }; };
    try {
      const saved = await resolveContentAvailabilityStatus(before, after);
      setResult(`Estado: ${saved.title.status}; escrituras: ${writes}; contenido: ${saved.contents[0].status}`);
    } finally { mediaApi.setTitleStatus = original; }
  }
  return <main style={{ padding: 40 }}>
    <h1>Por retomar</h1>
    <p>Opciones: Anime {animeTrackingStatuses.length}; contenidos {contentTrackingStatuses.length}; resto {trackingStatuses.length}.</p>
    <button onClick={() => setForm(true)}>Formulario de anime</button>
    <button onClick={() => void simulate()}>Contenido disponible</button>
    <button onClick={() => void simulate(true)}>Contenido omitido</button>
    <button onClick={() => void simulate(false, true)}>Sin cambio de disponibilidad</button>
    <p role="status">{result}</p>
    {form && <MediaTitleForm area="anime" busy={false} close={() => setForm(false)} detail={null} save={async () => true} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
