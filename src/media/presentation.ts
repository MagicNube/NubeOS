import type {
  CanonStatus,
  ContentKind,
  MediaKind,
  MediaProgress,
  TrackingStatus,
} from "./api";

export const mediaKinds: { value: MediaKind; label: string }[] = [
  { value: "anime", label: "Anime" },
  { value: "movie", label: "Película" },
  { value: "series", label: "Serie" },
];

export const trackingStatuses: { value: TrackingStatus; label: string }[] = [
  { value: "watching", label: "Viendo" },
  { value: "pending", label: "Pendiente" },
  { value: "paused", label: "En pausa" },
  { value: "completed", label: "Terminado" },
  { value: "dropped", label: "Abandonado" },
  { value: "waitingContent", label: "Esperando contenido" },
];

export const contentKinds: { value: ContentKind; label: string }[] = [
  { value: "season", label: "Temporada" },
  { value: "movie", label: "Película" },
  { value: "ova", label: "OVA" },
  { value: "special", label: "Especial" },
];

export const canonStatuses: { value: CanonStatus; label: string }[] = [
  { value: "canon", label: "Canon" },
  { value: "recommended", label: "Recomendado" },
  { value: "optional", label: "Opcional" },
  { value: "omitted", label: "Omitido" },
];

export const kindLabel = (value: MediaKind) =>
  mediaKinds.find((item) => item.value === value)?.label ?? value;
export const statusLabel = (value: TrackingStatus) =>
  trackingStatuses.find((item) => item.value === value)?.label ?? value;
export const contentKindLabel = (value: ContentKind) =>
  contentKinds.find((item) => item.value === value)?.label ?? value;
export const canonLabel = (value: CanonStatus) =>
  canonStatuses.find((item) => item.value === value)?.label ?? value;

export function progressLabel(progress: MediaProgress) {
  if (progress.totalIncomplete && progress.total !== null) {
    return `${progress.watched} de ${progress.total} + ?`;
  }
  return `${progress.watched} de ${progress.total ?? "?"}`;
}

export function scoreColor(score: number | null) {
  if (score === null) return "#8d8790";
  if (score < 5) return "#ef4444";
  if (score < 6) return "#fb7185";
  if (score < 7) return "#f59e0b";
  if (score < 8) return "#f9d442";
  if (score < 9) return "#22c777";
  if (score < 9.5) return "#16824f";
  return "#19a7e8";
}

export function scoreTone(score: number | null) {
  if (score === null) return "unrated";
  if (score < 5) return "garbage";
  if (score < 6) return "bad";
  if (score < 7) return "regular";
  if (score < 8) return "good";
  if (score < 9) return "great";
  if (score < 9.5) return "awesome";
  return "cinema";
}

export function formatScore(score: number | null) {
  return score === null ? "Sin puntuar" : score.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function todayMadrid() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
