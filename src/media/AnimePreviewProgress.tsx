import type { MediaProgress, TrackingStatus } from "./api";
import { progressLabel, statusHelp, statusLabel, upcomingLabel } from "./presentation";

export function AnimePreviewStatus({ status, progress }: { status: TrackingStatus; progress?: MediaProgress }) {
  const upcoming = progress ? upcomingLabel(progress) : null;
  return <div className="anime-preview-status-row">
    <span title={statusHelp(status)} className={`media-status status-${status}`}>{statusLabel(status)}</span>
    {upcoming && <small className="anime-preview-upcoming">{upcoming}</small>}
  </div>;
}

export default function AnimePreviewProgress({ progress }: { progress: MediaProgress }) {
  const value = progress.totalIncomplete ? progress.knownPercentage : progress.percentage;
  const percentage = value != null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
  // Never round an incomplete 99.9% up to a misleading 100%.
  const label = percentage === null ? "—" : `${Math.floor(percentage)} %`;
  const scope = progress.totalIncomplete ? "del total conocido" : "del contenido disponible";

  return <div className="media-library-progress anime-preview-progress">
    {progress.totalIncomplete && <small>{percentage === null ? "Total por confirmar" : "Del total conocido"}</small>}
    <div className="anime-preview-progress-line">
      <strong className="anime-preview-percentage" title={percentage === null ? "Total pendiente de confirmar" : `${label} ${scope}`}>{label}</strong>
      <span className="anime-preview-episode-count">{progressLabel(progress)} {progress.total === 1 && !progress.totalIncomplete ? "episodio" : "episodios"}</span>
    </div>
  </div>;
}
