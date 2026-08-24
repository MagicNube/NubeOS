import type { GameStatus } from "./api";

export const gameStatuses: { value: GameStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" }, { value: "playing", label: "Jugando" },
  { value: "paused", label: "En pausa" }, { value: "completed", label: "Terminado" },
  { value: "abandoned", label: "Abandonado" },
];
export function gameStatusLabel(status: GameStatus) { return gameStatuses.find((item) => item.value === status)?.label ?? status; }
export function formatGameDate(value: string | null) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}
export function today() {
  const date = new Date(); const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
