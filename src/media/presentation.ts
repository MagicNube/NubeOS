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

export const toResumeHelp = "Ya estabas al día y tienes nuevo contenido disponible que todavía no has empezado.";
export const statusHelp = (value: TrackingStatus) => value === "toResume" ? toResumeHelp : undefined;
export const animeTrackingStatuses = [...trackingStatuses,
  { value: "toResume" as const, label: "Por retomar" },
];

export const contentKinds: { value: ContentKind; label: string }[] = [
  { value: "season", label: "Temporada" },
  { value: "movie", label: "Película" },
  { value: "ova", label: "OVA" },
  { value: "special", label: "Especial" },
];

export const contentTrackingStatuses = trackingStatuses.map((status) => ({
  ...status,
  label: status.value === "waitingContent" ? "Por salir" : status.label,
}));
export const contentStatusLabel = (value: TrackingStatus) =>
  contentTrackingStatuses.find((item) => item.value === value)?.label ?? value;

export const upcomingLabel = (progress: MediaProgress) => progress.upcomingCount > 0
  ? `${progress.upcomingCount} ${progress.upcomingCount === 1 ? "contenido" : "contenidos"} por salir`
  : null;

export const canonStatuses: { value: CanonStatus; label: string }[] = [
  { value: "canon", label: "Canon" },
  { value: "recommended", label: "Recomendado" },
  { value: "optional", label: "Opcional" },
  { value: "omitted", label: "Omitido" },
];

export const kindLabel = (value: MediaKind) =>
  mediaKinds.find((item) => item.value === value)?.label ?? value;
export const statusLabel = (value: TrackingStatus) =>
  animeTrackingStatuses.find((item) => item.value === value)?.label ?? value;
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

export function conciseContentName(name: string, titleName: string, alternativeTitle?: string | null) {
  const original = name.trim();
  const normalize = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").replace(/\s+[-–—]+\s+/g, " — ").trim().toLocaleLowerCase("es");
  const titles = [titleName, alternativeTitle].filter((title): title is string => Boolean(title)).map(normalize);
  // Only imported classification labels may be shortened, never official titles.
  const parts = original.split(/\s+[-–—]+\s+/);
  if (parts.length > 1 && /^(temporada\s+\d+(?:\s+parte\s+\d+)?|película|ova(?:\s+\d+)?|especial(?:\s+\d+)?)$/i.test(parts[0])) {
    if (titles.includes(normalize(parts.slice(1).join(" — ")))) return parts[0];
    const remainder = parts.slice(1).join(" — ");
    // A colon is only redundant after an imported classification and an exact
    // parent title. Standalone official titles such as No Game No Life: Zero stay intact.
    for (const match of remainder.matchAll(/[:：]/g)) {
      const subtitle = remainder.slice(match.index! + 1).trim();
      if (/^temporada\s+\d+/i.test(parts[0]) && subtitle && titles.includes(normalize(remainder.slice(0, match.index)))) {
        return `${parts[0]} — ${subtitle}`;
      }
    }
  }
  return original.replace(/^(película|temporada|ova|especial)\s+[-–—]+\s+/i, "") || original;
}

export { formatScore, scoreColor, scoreTone } from "../ui/score";

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
