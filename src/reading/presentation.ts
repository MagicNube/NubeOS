import type { ReadingStatus } from "./api";

export const readingStatuses: Array<{ value: ReadingStatus; label: string }> = [
  { value: "pending", label: "Pendiente" },
  { value: "researching", label: "Por investigar" },
  { value: "reading", label: "Leyendo" },
  { value: "paused", label: "En pausa" },
  { value: "completed", label: "Terminado" },
  { value: "abandoned", label: "Abandonado" },
];

export function readingStatusLabel(status: ReadingStatus) {
  return readingStatuses.find((item) => item.value === status)?.label ?? status;
}

export function formatReadingDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
