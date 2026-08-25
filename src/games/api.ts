import { invoke } from "@tauri-apps/api/core";

export type GameStatus = "pending" | "playing" | "paused" | "completed" | "abandoned";
export type Game = {
  id: string; name: string; status: GameStatus; score: number | null; opinion: string | null;
  favorite: boolean; archived: boolean; updatedAt: string; hasCover: boolean;
  completedRuns: number; hasOpenRun: boolean;
  coverPositionX: number; coverPositionY: number; coverZoom: number;
};
export type GameRun = { id: string; gameId: string; startedOn: string | null; finishedOn: string | null };
export type GameDetail = Game & { runs: GameRun[] };
export type GameInput = Pick<Game, "name" | "status" | "score" | "opinion" | "favorite"> & { coverToken?: string | null; removeCover?: boolean };
export type GameRunInput = { startedOn: string | null; finishedOn: string | null };
export type GameHistoryEntry = { run: GameRun; gameName: string };
export type GameStatistics = {
  activeGames: number; playingGames: number; completedGames: number; replayedGames: number;
  favoriteGames: number; completedRuns: number; averageScore: number | null;
  byStatus: { status: GameStatus; count: number }[];
};
export type PendingGameCover = { token: string; originalName: string; mimeType: string; sizeBytes: number };

export const gamesApi = {
  list: (input: { archived: boolean; search?: string | null; status?: GameStatus | null; favoritesOnly?: boolean }) => invoke<Game[]>("list_games", { input }),
  get: (gameId: string) => invoke<GameDetail>("get_game", { gameId }),
  create: (input: GameInput) => invoke<Game>("create_game", { input }),
  update: (gameId: string, input: GameInput) => invoke<Game>("update_game", { gameId, input }),
  favorite: (gameId: string, favorite: boolean) => invoke<Game>("set_game_favorite", { gameId, favorite }),
  archive: (gameId: string) => invoke<void>("archive_game", { gameId }),
  restore: (gameId: string) => invoke<void>("restore_game", { gameId }),
  delete: (gameId: string) => invoke<void>("delete_game", { gameId }),
  startRun: (gameId: string, startedOn: string) => invoke<GameDetail>("start_game_run", { gameId, startedOn }),
  finishRun: (runId: string, finishedOn: string) => invoke<GameDetail>("finish_game_run", { runId, finishedOn }),
  createRun: (gameId: string, input: GameRunInput) => invoke<GameDetail>("create_game_run", { gameId, input }),
  updateRun: (runId: string, input: GameRunInput) => invoke<GameDetail>("update_game_run", { runId, input }),
  deleteRun: (runId: string) => invoke<GameDetail>("delete_game_run", { runId }),
  history: (input: { gameId?: string | null; year?: number | null }) => invoke<GameHistoryEntry[]>("list_game_history", { input }),
  statistics: () => invoke<GameStatistics>("get_game_statistics"),
  selectCover: () => invoke<PendingGameCover | null>("select_game_cover"),
  preparePastedCover: (bytes: number[]) => invoke<PendingGameCover>("prepare_pasted_game_cover", { bytes }),
  discardCover: (token: string) => invoke<void>("discard_pending_game_cover", { token }),
  readCover: (gameId: string) => invoke<ArrayBuffer>("read_game_cover", { gameId }),
  setCoverCrop: (gameId: string, x: number, y: number, zoom: number) => invoke<Game>("set_game_cover_crop", { gameId, x, y, zoom }),
};

export function gameErrorMessage(reason: unknown) {
  if (typeof reason === "object" && reason !== null && "message" in reason) return String((reason as { message: unknown }).message);
  return typeof reason === "string" ? reason : "No se ha podido completar la operación.";
}
