import { invoke } from "@tauri-apps/api/core";

export type MediaKind = "anime" | "series" | "movie";
export type MediaArea = "anime" | "series" | "movies";
export type TrackingStatus =
  | "watching"
  | "pending"
  | "paused"
  | "completed"
  | "dropped"
  | "waitingContent";
export type ContentKind = "season" | "movie" | "ova" | "special";
export type CanonStatus = "canon" | "recommended" | "optional" | "omitted";
export type ProgressTarget = "title" | "content";

export type MediaProgress = {
  watched: number;
  total: number | null;
  totalIncomplete: boolean;
  percentage: number | null;
};

export type NextContent = {
  id: string;
  name: string;
  watched: number;
  total: number | null;
  canIncrement: boolean;
};

export type MediaTitle = {
  id: string;
  catalogNumber: number | null;
  name: string;
  alternativeTitle: string | null;
  genres: string[];
  primaryStudio: string | null;
  kind: MediaKind;
  isAnime: boolean;
  status: TrackingStatus;
  score: number | null;
  opinion: string | null;
  favorite: boolean;
  archived: boolean;
  hasCover: boolean;
  animatedCover: boolean;
  coverPositionX: number;
  coverPositionY: number;
  coverZoom: number;
  watchedUnits: number;
  startedOn: string | null;
  finishedOn: string | null;
  currentSeason: number | null;
  currentEpisode: number | null;
  progress: MediaProgress;
  contentsCount: number;
  averageContentScore: number | null;
  nextContent: NextContent | null;
  studios: string[];
  suggestedStatus: TrackingStatus | null;
  firstActivityOn: string | null;
  lastActivityOn: string | null;
};

export type MediaContent = {
  id: string;
  titleId: string;
  name: string;
  kind: ContentKind;
  status: TrackingStatus;
  canonStatus: CanonStatus;
  totalEpisodes: number | null;
  effectiveTotal: number | null;
  watchedEpisodes: number;
  studio: string | null;
  score: number | null;
  opinion: string | null;
  notes: string | null;
  startedOn: string | null;
  releasedOn: string | null;
  finishedOn: string | null;
  position: number;
  canIncrement: boolean;
  firstActivityOn: string | null;
  lastActivityOn: string | null;
};

export type WatchSession = {
  id: string;
  contentId: string | null;
  contentName: string | null;
  watchedOn: string;
  episodeNumber: number;
  source: "quickAdd" | "manualAdjustment";
  canDelete: boolean;
};
export type MovieViewing = { id: string; titleId: string; watchedOn: string };
export type SeriesRun = { id: string; titleId: string; startedOn: string; finishedOn: string | null };

export type MediaHistoryEntry = {
  id: string;
  titleId: string;
  titleName: string;
  titleKind: MediaKind;
  contentId: string | null;
  contentName: string | null;
  contentKind: ContentKind | null;
  watchedOn: string;
  episodeNumber: number;
  canDelete: boolean;
};

export type MediaDetail = {
  title: MediaTitle;
  contents: MediaContent[];
  sessions: WatchSession[];
};

export type MediaTitleInput = {
  name: string;
  alternativeTitle: string | null;
  genres: string[];
  primaryStudio: string | null;
  kind: MediaKind;
  isAnime: boolean;
  status: TrackingStatus;
  score: number | null;
  opinion: string | null;
  favorite: boolean;
  startedOn: string | null;
  finishedOn: string | null;
  currentSeason: number | null;
  currentEpisode: number | null;
  coverToken: string | null;
  removeCover: boolean;
};

export type MediaContentInput = {
  name: string;
  kind: ContentKind;
  status: TrackingStatus;
  canonStatus: CanonStatus;
  totalEpisodes: number | null;
  studio: string | null;
  score: number | null;
  opinion: string | null;
  notes: string | null;
  startedOn: string | null;
  releasedOn: string | null;
  finishedOn: string | null;
};

export type PendingCover = {
  token: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type MediaStatistics = {
  activeTitles: number;
  animeTitles: number;
  seriesTitles: number;
  movieTitles: number;
  watchedEpisodes: number;
  completedMovies: number;
  sessions: number;
  averageScore: number | null;
  byStatus: { status: TrackingStatus; count: number }[];
  topTitles: { id: string; name: string; score: number }[];
};

export const mediaApi = {
  list: (input: {
    archived: boolean;
    search?: string | null;
    kind?: MediaKind | null;
    area?: MediaArea | null;
    status?: TrackingStatus | null;
    studio?: string | null;
    favoritesOnly?: boolean;
  }) => invoke<MediaTitle[]>("list_media_titles", { input }),
  get: (titleId: string) => invoke<MediaDetail>("get_media_title", { titleId }),
  createTitle: (input: MediaTitleInput) =>
    invoke<MediaDetail>("create_media_title", { input }),
  updateTitle: (titleId: string, input: MediaTitleInput) =>
    invoke<MediaDetail>("update_media_title", { titleId, input }),
  setTitleStatus: (titleId: string, status: TrackingStatus) =>
    invoke<MediaDetail>("set_media_title_status", { titleId, status }),
  setTitleScore: (titleId: string, score: number | null) =>
    invoke<MediaDetail>("set_media_title_score", { titleId, score }),
  setTitleFavorite: (titleId: string, favorite: boolean) =>
    invoke<MediaDetail>("set_media_title_favorite", { titleId, favorite }),
  setCoverPosition: (titleId: string, x: number, y: number, zoom: number) =>
    invoke<MediaDetail>("set_media_cover_position", { titleId, x, y, zoom }),
  createContent: (titleId: string, input: MediaContentInput) =>
    invoke<MediaDetail>("create_media_content", { titleId, input }),
  updateContent: (contentId: string, input: MediaContentInput) =>
    invoke<MediaDetail>("update_media_content", { contentId, input }),
  deleteContent: (contentId: string) =>
    invoke<void>("delete_media_content", { contentId }),
  reorderContents: (titleId: string, contentIds: string[]) =>
    invoke<void>("reorder_media_contents", { titleId, contentIds }),
  setProgress: (
    targetType: ProgressTarget,
    targetId: string,
    watched: number,
    watchedOn: string,
  ) =>
    invoke<MediaDetail>("set_media_progress", {
      input: { targetType, targetId, watched, watchedOn },
    }),
  increment: (
    targetType: ProgressTarget,
    targetId: string,
    watchedOn: string,
  ) =>
    invoke<MediaDetail>("increment_media_progress", {
      input: { targetType, targetId, watchedOn },
    }),
  archive: (titleId: string) =>
    invoke<void>("archive_media_title", { titleId }),
  restore: (titleId: string) =>
    invoke<void>("restore_media_title", { titleId }),
  delete: (titleId: string) =>
    invoke<void>("delete_media_title", { titleId }),
  selectCover: () => invoke<PendingCover | null>("select_media_cover"),
  preparePastedCover: (bytes: number[]) => invoke<PendingCover>("prepare_pasted_media_cover", { bytes }),
  discardCover: (token: string) =>
    invoke<void>("discard_pending_media_cover", { token }),
  readCover: (titleId: string) =>
    invoke<ArrayBuffer>("read_media_cover", { titleId }),
  readCoverThumbnail: (titleId: string) =>
    invoke<ArrayBuffer>("read_media_cover_thumbnail", { titleId }),
  saveCoverThumbnail: (titleId: string, bytes: number[]) =>
    invoke<void>("save_media_cover_thumbnail", { titleId, bytes }),
  statistics: (input: { area?: MediaArea | null; kind?: MediaKind | null; studio?: string | null; minimumScore?: number | null; completedYear?: number | null }) =>
    invoke<MediaStatistics>("get_media_statistics", { input }),
  listStudios: () => invoke<string[]>("list_media_studios"),
  movieViewings: (titleId?: string | null) => invoke<MovieViewing[]>("list_movie_viewings", { titleId: titleId ?? null }),
  createMovieViewing: (titleId: string, watchedOn: string) => invoke<MovieViewing[]>("create_movie_viewing", { titleId, watchedOn }),
  updateMovieViewing: (viewingId: string, watchedOn: string) => invoke<MovieViewing[]>("update_movie_viewing", { viewingId, watchedOn }),
  deleteMovieViewing: (viewingId: string) => invoke<MovieViewing[]>("delete_movie_viewing", { viewingId }),
  seriesRuns: (titleId?: string | null) => invoke<SeriesRun[]>("list_series_runs", { titleId: titleId ?? null }),
  createSeriesRun: (titleId: string, startedOn: string, finishedOn: string | null) => invoke<SeriesRun[]>("create_series_run", { titleId, startedOn, finishedOn }),
  updateSeriesRun: (runId: string, startedOn: string, finishedOn: string | null) => invoke<SeriesRun[]>("update_series_run", { runId, startedOn, finishedOn }),
  deleteSeriesRun: (runId: string) => invoke<SeriesRun[]>("delete_series_run", { runId }),
  history: (input: {
    area?: MediaArea | null;
    year?: number | null;
    month?: number | null;
    titleId?: string | null;
    contentId?: string | null;
    oldestFirst?: boolean;
  }) => invoke<MediaHistoryEntry[]>("list_media_history", { input }),
  updateHistoryDate: (sessionId: string, watchedOn: string) =>
    invoke<void>("update_media_history_date", { sessionId, watchedOn }),
  deleteHistoryEntry: (sessionId: string) =>
    invoke<void>("delete_media_history_entry", { sessionId }),
};

export function mediaErrorMessage(reason: unknown): string {
  if (typeof reason === "object" && reason !== null && "message" in reason)
    return String((reason as { message: unknown }).message);
  return typeof reason === "string"
    ? reason
    : "No se ha podido completar la operación.";
}
