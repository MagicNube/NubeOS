import { chooseInferredStatus, confirmInferredStatusChange } from "../ui/inferredStatus";
import type { MediaContentInput, MediaDetail, MediaTitleInput, TrackingStatus } from "./api";
import { mediaApi } from "./api";
import { contentStatusLabel, statusLabel } from "./presentation";

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

export async function resolveContentAvailabilityStatus(
  before: MediaDetail,
  after: MediaDetail,
): Promise<MediaDetail> {
  const newlyAvailable = after.contents.some((content) =>
    content.status === "pending" && content.canonStatus !== "omitted" &&
    before.contents.some((old) => old.id === content.id && old.status === "waitingContent"));
  if (before.title.status !== "waitingContent" || after.title.suggestedStatus !== "toResume" || !newlyAvailable) return after;
  const accepted = await confirmInferredStatusChange(
    after.title.name, statusLabel(after.title.status), statusLabel("toResume"),
    "El contenido que has marcado como disponible",
    "Hay nuevo contenido por ver. Puedes retomarlo más adelante sin marcar el anime como Viendo.",
  );
  return accepted ? mediaApi.setTitleStatus(after.title.id, "toResume") : after;
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

export async function resolveContentStateSuggestion(
  before: MediaDetail,
  after: MediaDetail,
): Promise<MediaDetail> {
  if (after.title.kind !== "anime") return after;
  const relevantChange = before.contents.length !== after.contents.length || after.contents.some((content) => {
    const previous = before.contents.find((old) => old.id === content.id);
    return !previous || previous.status !== content.status || previous.canonStatus !== content.canonStatus || previous.position !== content.position;
  });
  const suggested = after.title.suggestedStatus;
  if (!relevantChange || !suggested || suggested === after.title.status) return after;
  if (suggested === "toResume") return resolveContentAvailabilityStatus(before, after);
  const accepted = await confirmInferredStatusChange(
    after.title.name, statusLabel(after.title.status), statusLabel(suggested),
    "Los estados de sus contenidos",
    "Mantener conserva el estado del anime y los cambios que acabas de hacer en sus contenidos.",
  );
  return accepted ? mediaApi.setTitleStatus(after.title.id, suggested) : after;
}

function contentInputWithStatus(
  detail: MediaDetail,
  contentId: string,
  status: TrackingStatus,
): MediaContentInput | null {
  const content = detail.contents.find((item) => item.id === contentId);
  if (!content) return null;
  return {
    name: content.name,
    kind: content.kind,
    status,
    canonStatus: content.canonStatus,
    totalEpisodes: content.totalEpisodes,
    studio: content.studio,
    score: content.score,
    opinion: content.opinion,
    notes: content.notes,
    startedOn: content.startedOn,
    releasedOn: content.releasedOn,
    finishedOn: content.finishedOn,
  };
}

export async function resolveContentProgressStatus(
  before: MediaDetail,
  after: MediaDetail,
  contentId: string,
): Promise<MediaDetail> {
  const previous = before.contents.find((content) => content.id === contentId);
  const current = after.contents.find((content) => content.id === contentId);
  if (!previous || !current || current.watchedEpisodes <= previous.watchedEpisodes) return after;
  const finishedAvailable = !before.title.progress.availableCompleted && after.title.progress.availableCompleted;
  const hasUpcoming = after.title.progress.upcomingCount > 0;
  const suggested = current.suggestedStatus;

  const completesTitle = suggested === "completed" && after.title.status !== "completed"
    && after.title.suggestedStatus === "completed";

  let completeTitle = completesTitle;
  const accepted = suggested && await confirmInferredStatusChange(
    current.name,
    contentStatusLabel(current.status),
    contentStatusLabel(suggested),
    suggested === "completed" ? "Al completar todos sus episodios, el historial" : "Al registrar episodios, el historial",
    completesTitle
      ? "Es el último contenido pendiente; puedes decidir si actualizas también el anime."
      : undefined,
    completesTitle
      ? {
          label: `Marcar también “${after.title.name}” como Terminado`,
          checked: true,
          onChange: (checked) => { completeTitle = checked; },
        }
      : undefined,
  );
  let updated = after;
  if (accepted && suggested) {
    const input = contentInputWithStatus(after, contentId, suggested);
    if (input) updated = await mediaApi.updateContent(contentId, input);
    if (completeTitle) updated = await mediaApi.updateTitle(updated.title.id, titleInputWithStatus(updated, "completed"));
  }
  if (finishedAvailable && hasUpcoming) {
    const choice = await chooseInferredStatus<TrackingStatus>(
      updated.title.name, statusLabel(updated.title.status),
      "¿Cómo quieres dejar el anime?",
      "Has visto todo el contenido disponible. Quedan contenidos por salir.",
      [
        { label: "Terminado", value: "completed" },
        { label: "Esperando contenido", value: "waitingContent", recommended: true },
      ],
    );
    if (choice && choice !== updated.title.status) {
      updated = await mediaApi.updateTitle(updated.title.id, titleInputWithStatus(updated, choice));
    }
  }
  if (updated.title.kind === "anime" && updated.title.status === "pending"
    && updated.title.suggestedStatus === "watching") {
    const startTitle = await confirmInferredStatusChange(
      updated.title.name, statusLabel("pending"), statusLabel("watching"),
      "Ya hay episodios registrados; el historial",
      "El anime sigue en Pendiente. Mantener conserva tanto su estado como el registro que acabas de guardar.",
    );
    if (startTitle) updated = await mediaApi.setTitleStatus(updated.title.id, "watching");
  }
  return updated;
}
