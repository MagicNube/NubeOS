import { confirmInferredStatusChange } from "../ui/inferredStatus";
import type { MediaDetail, MediaTitleInput, TrackingStatus } from "./api";
import { mediaApi } from "./api";
import { statusLabel } from "./presentation";

export function titleInputWithStatus(
  detail: MediaDetail,
  status: TrackingStatus,
): MediaTitleInput {
  const { title } = detail;
  return {
    name: title.name,
    alternativeTitle: title.alternativeTitle,
    genres: title.genres,
    primaryStudio: title.primaryStudio,
    kind: title.kind,
    isAnime: title.isAnime,
    status,
    score: title.score,
    opinion: title.opinion,
    favorite: title.favorite,
    startedOn: title.startedOn,
    finishedOn: title.finishedOn,
    currentSeason: title.currentSeason,
    currentEpisode: title.currentEpisode,
    coverToken: null,
    removeCover: false,
  };
}

export async function resolveInferredMediaStatus(
  before: MediaDetail,
  after: MediaDetail,
): Promise<MediaDetail> {
  if (
    before.title.status === after.title.status ||
    await confirmInferredStatusChange(
      before.title.name,
      statusLabel(before.title.status),
      statusLabel(after.title.status),
    )
  ) {
    return after;
  }

  return mediaApi.updateTitle(
    after.title.id,
    titleInputWithStatus(after, before.title.status),
  );
}
