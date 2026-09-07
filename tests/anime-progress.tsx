// Isolated preview using production components/styles, without Tauri or personal data.
import React from "react";
import { createRoot } from "react-dom/client";
import AnimePreviewProgress, { AnimePreviewStatus } from "../src/media/AnimePreviewProgress";
import ScoreTile from "../src/ui/ScoreTile";
import type { MediaProgress } from "../src/media/api";
import "../src/styles.css";
import "../src/ui/ui.css";
import "../src/media/media.css";

const base: MediaProgress = { watched: 0, total: 127, percentage: 0, totalIncomplete: false, upcomingCount: 0, availableCompleted: false };
const examples = [
  { name: "Por empezar", progress: base },
  { name: "A mitad de camino", progress: { ...base, watched: 64, percentage: 6400 / 127 } },
  { name: "Todo lo disponible visto", progress: { ...base, watched: 127, percentage: 100, availableCompleted: true, upcomingCount: 2 } },
  { name: "Todavía hay episodios por confirmar", progress: { ...base, watched: 64, percentage: null, knownPercentage: 6400 / 127, totalIncomplete: true } },
  { name: "Total desconocido", progress: { ...base, watched: 3, total: null, percentage: null, totalIncomplete: true } },
  { name: "Casi terminado (sin redondear a 100 %)", progress: { ...base, watched: 999, total: 1000, percentage: 99.9 } },
];

function ProgressPreview() {
  return <main className="anime-workspace" style={{ maxWidth: 1200, margin: "0 auto", padding: 28 }}>
  <h1>Progreso en Anime</h1>
  <p style={{ margin: "8px 0 24px", color: "#bdb5c2" }}>Vista de prueba · Sin compilar ni modificar la instalación. Datos ficticios.</p>
  <div className="library-grid">{examples.map(({ name, progress }, i) => <article className="library-card" key={name}>
    <div className="library-card-open">
      <div className="library-cover-wrap" style={{ aspectRatio: "16 / 9", background: "linear-gradient(140deg, #352345, #171820)", display: "grid", placeItems: "center", color: "#b7a6d0" }}>Portada horizontal</div>
      <div className="library-card-copy">
        <AnimePreviewStatus status={i === 0 ? "pending" : i === 2 ? "completed" : "watching"} progress={progress} />
        <h3 title={name}>{name}</h3>
        <div className="media-genre-tags"><span>Aventura</span><span>Fantasía</span></div>
        <div className="media-library-card-footer"><AnimePreviewProgress progress={progress} /><ScoreTile className="media-score-badge" score={i === 0 ? null : 8.5} /></div>
      </div>
    </div>
  </article>)}</div>
</main>;
}

createRoot(document.getElementById("root")!).render(<ProgressPreview />);
