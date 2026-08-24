import { invoke } from "@tauri-apps/api/core";

export type ReadingStatus =
  | "pending"
  | "reading"
  | "paused"
  | "completed"
  | "abandoned";

export type ReadingBook = {
  id: string;
  title: string;
  author: string;
  genres: string[];
  status: ReadingStatus;
  score: number | null;
  opinion: string | null;
  favorite: boolean;
  startedOn: string | null;
  finishedOn: string | null;
  archived: boolean;
  updatedAt: string;
  hasCover: boolean;
};

export type ReadingBookInput = Omit<ReadingBook, "id" | "archived" | "updatedAt" | "hasCover"> & {
  coverToken?: string | null;
  removeCover?: boolean;
};
export type ReadingRun = { id: string; bookId: string; startedOn: string | null; finishedOn: string | null };
export type ReadingDetail = ReadingBook & { runs: ReadingRun[] };
export type ReadingRunInput = { startedOn: string | null; finishedOn: string | null };
export type ReadingHistoryEntry = { run: ReadingRun; bookTitle: string; bookAuthor: string };

export type PendingReadingCover = { token: string; originalName: string; mimeType: string; sizeBytes: number };

export type ReadingStatistics = {
  activeBooks: number;
  currentlyReading: number;
  completedBooks: number;
  favoriteBooks: number;
  averageScore: number | null;
  byStatus: { status: ReadingStatus; count: number }[];
  topGenres: { genre: string; count: number }[];
};

export const readingApi = {
  list: (input: { archived: boolean; search?: string | null; status?: ReadingStatus | null; genre?: string | null; favoritesOnly?: boolean }) =>
    invoke<ReadingBook[]>("list_reading_books", { input }),
  get: (bookId: string) => invoke<ReadingDetail>("get_reading_book", { bookId }),
  create: (input: ReadingBookInput) => invoke<ReadingBook>("create_reading_book", { input }),
  update: (bookId: string, input: ReadingBookInput) => invoke<ReadingBook>("update_reading_book", { bookId, input }),
  favorite: (bookId: string, favorite: boolean) => invoke<ReadingBook>("set_reading_book_favorite", { bookId, favorite }),
  archive: (bookId: string) => invoke<void>("archive_reading_book", { bookId }),
  restore: (bookId: string) => invoke<void>("restore_reading_book", { bookId }),
  delete: (bookId: string) => invoke<void>("delete_reading_book", { bookId }),
  statistics: () => invoke<ReadingStatistics>("get_reading_statistics"),
  startRun: (bookId: string, startedOn: string) => invoke<ReadingDetail>("start_reading_run", { bookId, startedOn }),
  finishRun: (runId: string, finishedOn: string) => invoke<ReadingDetail>("finish_reading_run", { runId, finishedOn }),
  createRun: (bookId: string, input: ReadingRunInput) => invoke<ReadingDetail>("create_reading_run", { bookId, input }),
  updateRun: (runId: string, input: ReadingRunInput) => invoke<ReadingDetail>("update_reading_run", { runId, input }),
  deleteRun: (runId: string) => invoke<ReadingDetail>("delete_reading_run", { runId }),
  history: (input: { bookId?: string | null; year?: number | null }) => invoke<ReadingHistoryEntry[]>("list_reading_history", { input }),
  selectCover: () => invoke<PendingReadingCover | null>("select_reading_cover"),
  preparePastedCover: (bytes: number[]) => invoke<PendingReadingCover>("prepare_pasted_reading_cover", { bytes }),
  discardCover: (token: string) => invoke<void>("discard_pending_reading_cover", { token }),
  readCover: (bookId: string) => invoke<ArrayBuffer>("read_reading_cover", { bookId }),
};

export function readingErrorMessage(reason: unknown) {
  if (typeof reason === "object" && reason !== null && "message" in reason) return String((reason as { message: unknown }).message);
  return typeof reason === "string" ? reason : "No se ha podido completar la operación.";
}
