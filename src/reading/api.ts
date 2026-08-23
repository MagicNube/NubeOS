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
  create: (input: ReadingBookInput) => invoke<ReadingBook>("create_reading_book", { input }),
  update: (bookId: string, input: ReadingBookInput) => invoke<ReadingBook>("update_reading_book", { bookId, input }),
  favorite: (bookId: string, favorite: boolean) => invoke<ReadingBook>("set_reading_book_favorite", { bookId, favorite }),
  archive: (bookId: string) => invoke<void>("archive_reading_book", { bookId }),
  restore: (bookId: string) => invoke<void>("restore_reading_book", { bookId }),
  delete: (bookId: string) => invoke<void>("delete_reading_book", { bookId }),
  statistics: () => invoke<ReadingStatistics>("get_reading_statistics"),
  selectCover: () => invoke<PendingReadingCover | null>("select_reading_cover"),
  discardCover: (token: string) => invoke<void>("discard_pending_reading_cover", { token }),
  readCover: (bookId: string) => invoke<ArrayBuffer>("read_reading_cover", { bookId }),
};

export function readingErrorMessage(reason: unknown) {
  if (typeof reason === "object" && reason !== null && "message" in reason) return String((reason as { message: unknown }).message);
  return typeof reason === "string" ? reason : "No se ha podido completar la operación.";
}
