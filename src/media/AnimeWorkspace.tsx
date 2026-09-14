import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Film,
  Edit3,
  History as HistoryIcon,
  Library,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../ui/Modal";
import FilterDisclosure from "../ui/FilterDisclosure";
import FilterBuilder from "../ui/FilterBuilder";
import MultiSelectControl from "../ui/MultiSelectControl";
import { useAppView } from "../ui/AppViewContext";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import ScoreTile from "../ui/ScoreTile";
import FavoriteFilter from "../ui/FavoriteFilter";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import MediaStatisticsDashboard from "../ui/MediaStatisticsDashboard";
import { readDefaultSort, saveDefaultSort } from "../ui/sortPreference";
import { confirmAction } from "../ui/confirmAction";
import type {
  MediaContent,
  MediaContentInput,
  MediaDetail,
  MediaHistoryEntry,
  MediaTitle,
  MediaTitleInput,
  MovieViewing,
  TrackingStatus,
} from "./api";
import { mediaApi, mediaErrorMessage } from "./api";
import CoverImage from "./CoverImage";
import AnimePreviewProgress, { AnimePreviewStatus } from "./AnimePreviewProgress";
import MediaDetailView from "./MediaDetail";
import { MediaContentForm, MediaTitleForm } from "./MediaForms";
import { resolveContentStateSuggestion, resolveContentProgressStatus, resolveInferredMediaStatus } from "./statusChoice";
import {
  conciseContentName,
  contentKindLabel,
  formatDate,
  statusLabel,
  todayMadrid,
  trackingStatuses,
  animeTrackingStatuses,
  statusHelp,
} from "./presentation";
import "./media.css";

type View = "watching" | "library" | "statistics" | "history";
type StatisticsScope = "anime" | "movie" | "content";
type AnimeStatContent = MediaContent & { titleId: string; titleName: string; genres: string[] };
type LibrarySort = "updated" | "scoreDesc" | "scoreAsc" | "titleAsc" | "progressAsc" | "progressDesc" | "startAsc" | "startDesc" | "finishAsc" | "finishDesc";
type LibrarySection = "anime" | "movies";
const librarySorts: readonly LibrarySort[] = ["titleAsc", "updated", "scoreDesc", "scoreAsc", "progressDesc", "progressAsc", "startDesc", "startAsc", "finishDesc", "finishAsc"];
const animeSortStorageKey = (section: LibrarySection) => `nubeos.anime.sort.default.v3.${section}`;

function contentInput(content: MediaContent, overrides: Partial<MediaContentInput> = {}): MediaContentInput {
  return {
    name: content.name,
    kind: content.kind,
    status: content.status,
    canonStatus: content.canonStatus,
    totalEpisodes: content.totalEpisodes,
    studio: null,
    score: content.score,
    opinion: content.opinion,
    notes: content.notes,
    startedOn: content.startedOn,
    releasedOn: content.releasedOn,
    finishedOn: content.finishedOn,
    ...overrides,
  };
}

export default function AnimeWorkspace() {
  const [view, setView] = useState<View>("library");
  const [items, setItems] = useState<MediaTitle[]>([]);
  const [statisticsItems, setStatisticsItems] = useState<MediaTitle[]>([]);
  const [statisticsHistory, setStatisticsHistory] = useState<MediaHistoryEntry[]>([]);
  const [statisticsContents, setStatisticsContents] = useState<AnimeStatContent[]>([]);
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [detailPosition, setDetailPosition] = useState<number | null>(null);
  const [movieViewings, setMovieViewings] = useState<MovieViewing[]>([]);
  const [titleForm, setTitleForm] = useState<"new" | "edit" | null>(null);
  const [contentForm, setContentForm] = useState<MediaContent | "new" | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<TrackingStatus[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<"" | "scored" | "unscored">("");
  const [librarySection, setLibrarySection] = useState<LibrarySection>("anime");
  const [defaultLibrarySort, setDefaultLibrarySort] = useState<LibrarySort>(() => readDefaultSort(animeSortStorageKey("anime"), "titleAsc", librarySorts));
  const [librarySort, setLibrarySort] = useState<LibrarySort>(() => readDefaultSort(animeSortStorageKey("anime"), "titleAsc", librarySorts));
  const [statisticsScope, setStatisticsScope] = useState<StatisticsScope>("anime");
  const [history, setHistory] = useState<MediaHistoryEntry[]>([]);
  const [historyOptions, setHistoryOptions] = useState<MediaHistoryEntry[]>([]);
  const [historyYear, setHistoryYear] = useState("");
  const [historyMonth, setHistoryMonth] = useState("");
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyContent, setHistoryContent] = useState("");
  const [historyOldestFirst, setHistoryOldestFirst] = useState(false);
  const [historyTitles, setHistoryTitles] = useState<MediaTitle[]>([]);
  const [historySelection, setHistorySelection] = useState<MediaDetail | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const historyCacheKey = [historyYear, historyMonth, historyTitle, historyContent, historyOldestFirst ? "oldest" : "newest"].join(":");
  const historyCacheKeyRef = useRef<string | null>(null);
  const historyTitlesLoadedRef = useRef(false);
  const reuseHistoryOnNextLoadRef = useRef(false);

  const load = useCallback(
    async (showInitial = false) => {
      const id = ++requestId.current;
      if (showInitial) setInitialLoading(true);
      try {
        if (view === "statistics") {
          const [active, activity] = await Promise.all([
            mediaApi.list({ archived: false, area: "anime" }),
            mediaApi.history({ area: "anime" }),
          ]);
          const details = await Promise.all(active.filter((item) => item.kind === "anime").map((item) => mediaApi.get(item.id)));
          if (requestId.current === id) {
            setStatisticsItems(active);
            setStatisticsHistory(activity);
            setStatisticsContents(details.flatMap((entry) => entry.contents.filter((content) => content.canonStatus !== "omitted").map((content) => ({ ...content, titleId: entry.title.id, titleName: entry.title.name, genres: entry.title.genres }))));
          }
        } else if (view === "history") {
          if (reuseHistoryOnNextLoadRef.current && historyCacheKeyRef.current === historyCacheKey) {
            reuseHistoryOnNextLoadRef.current = false;
            if (requestId.current === id) setInitialLoading(false);
            return;
          }
          reuseHistoryOnNextLoadRef.current = false;
          const [data, options] = await Promise.all([
            mediaApi.history({ area: "anime", year: historyYear ? Number(historyYear) : null, month: historyMonth ? Number(historyMonth) : null, titleId: historyTitle || null, contentId: historyContent || null, oldestFirst: historyOldestFirst }),
            mediaApi.history({ area: "anime" }),
          ]);
          if (requestId.current === id) {
            setHistory(data);
            setHistoryOptions(options);
            historyCacheKeyRef.current = historyCacheKey;
          }
        } else {
          const data = await mediaApi.list({
            archived: view === "library" ? archived : false,
            search: null,
            area: "anime",
            kind: null,
            status: view === "watching" ? "watching" : null,
            favoritesOnly: false,
          });
          if (requestId.current === id) setItems(data);
        }
        if (requestId.current === id) setError(null);
      } catch (reason) {
        if (requestId.current === id) setError(mediaErrorMessage(reason));
      } finally {
        if (requestId.current === id) setInitialLoading(false);
      }
    },
    [archived, historyCacheKey, historyContent, historyMonth, historyOldestFirst, historyTitle, historyYear, view],
  );

  useEffect(() => {
    if (view !== "history" || historyTitlesLoadedRef.current) return;
    let cancelled = false;
    void Promise.all([
      mediaApi.list({ area: "anime", archived: false }),
      mediaApi.list({ area: "anime", archived: true }),
    ]).then(([active, archivedItems]) => {
      if (!cancelled) {
        setHistoryTitles([...active, ...archivedItems]);
        historyTitlesLoadedRef.current = true;
      }
    }).catch((reason) => {
      if (!cancelled) setError(mediaErrorMessage(reason));
    });
    return () => { cancelled = true; };
  }, [view]);

  useEffect(() => {
    if (!historyTitle) {
      setHistorySelection(null);
      return;
    }
    if (view !== "history" || historySelection?.title.id === historyTitle) return;
    let cancelled = false;
    void mediaApi.get(historyTitle).then((selected) => {
      if (!cancelled) setHistorySelection(selected);
    }).catch((reason) => {
      if (!cancelled) setError(mediaErrorMessage(reason));
    });
    return () => { cancelled = true; };
  }, [historySelection?.title.id, historyTitle, view]);

  useEffect(() => {
    const delay = view === "library" ? 150 : 0;
    const timeout = window.setTimeout(() => void load(initialLoading), delay);
    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [load]);

  async function run<T>(operation: () => Promise<T>): Promise<T | null> {
    setError(null);
    setBusy(true);
    try {
      const result = await operation();
      setError(null);
      return result;
    } catch (reason) {
      setError(mediaErrorMessage(reason));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function runAction(operation: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    try {
      await operation();
      setError(null);
      return true;
    } catch (reason) {
      setError(mediaErrorMessage(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: string, position: number | null = null) {
    const result = await run(async () => {
      const selected = await mediaApi.get(id);
      const viewings = selected.title.kind === "movie" ? await mediaApi.movieViewings(id) : [];
      return { selected, viewings };
    });
    if (result) {
      setDetailPosition(position);
      setDetail(result.selected);
      setMovieViewings(result.viewings);
    }
  }

  async function refreshDetail(id = detail?.title.id) {
    if (!id) return;
    const next = await mediaApi.get(id);
    setDetail(next);
    setMovieViewings(next.title.kind === "movie" ? await mediaApi.movieViewings(id) : []);
  }

  async function mutateDetail(operation: () => Promise<MediaDetail>) {
    const result = await run(operation);
    if (!result) return false;
    historyCacheKeyRef.current = null;
    setDetail(result);
    await load(false);
    return true;
  }

  async function mutateHistoryDetail(operation: () => Promise<MediaDetail>, contentId?: string) {
    if (!detail) return false;
    const before = detail;
    const result = await run(async () => {
      let after = await operation();
      if (contentId) after = await resolveContentProgressStatus(before, after, contentId);
      if (after.title.status !== before.title.status) return after;
      return resolveInferredMediaStatus(before, after);
    });
    if (!result) return false;
    historyCacheKeyRef.current = null;
    setDetail(result);
    await load(false);
    return true;
  }

  async function mutateMovieViewing(operation: () => Promise<MovieViewing[]>) {
    if (!detail) return null;
    const before = detail;
    const result = await run(async () => {
      const viewings = await operation();
      const next = await resolveInferredMediaStatus(before, await mediaApi.get(before.title.id));
      return { viewings, detail: next };
    });
    if (!result) return null;
    historyCacheKeyRef.current = null;
    setMovieViewings(result.viewings);
    setDetail(result.detail);
    await load(false);
    return result.viewings;
  }

  function changeView(next: View) {
    if (next === view) return;
    const canReuseHistory = next === "history" && historyCacheKeyRef.current === historyCacheKey;
    reuseHistoryOnNextLoadRef.current = canReuseHistory;
    setInitialLoading(!canReuseHistory);
    if (next === "library" || next === "watching") setItems([]);
    setView(next);
    setArchived(false);
    setDetail(null);
  }

  function changeLibrarySection(next: LibrarySection) {
    if (next === librarySection) return;
    if (next === "movies" && statuses.includes("toResume")) setStatuses((current) => current.filter((status) => status !== "toResume"));
    const nextDefault = readDefaultSort(animeSortStorageKey(next), "titleAsc", librarySorts);
    setDefaultLibrarySort(nextDefault);
    setLibrarySort(nextDefault);
    setLibrarySection(next);
  }

  function openHistory(titleId: string, contentId?: string) {
    if (detail?.title.id === titleId) setHistorySelection(detail);
    setHistoryTitle(titleId);
    setHistoryContent(contentId ?? "");
    setView("history");
    setArchived(false);
    setDetail(null);
  }

  const collectionActions = (
    <div className="media-toolbar-actions">
      <button className="ui-archive-toggle" onClick={() => { if (view !== "library") changeView("library"); setArchived(view !== "library" || !archived); }} type="button">
        {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
        {archived ? "Volver" : "Archivo"}
      </button>
      {!archived && <button className="primary-button" onClick={() => setTitleForm("new")} type="button"><Plus size={17} /> Añadir anime</button>}
    </div>
  );
  const pageTitle = view === "watching"
    ? "En curso"
    : view === "history"
      ? "Historial"
      : view === "statistics"
        ? "Estadísticas"
        : archived
          ? librarySection === "anime" ? "Anime archivado" : "Películas archivadas"
          : librarySection === "anime" ? "Biblioteca" : "Películas";
  useAppView(pageTitle);

  return (
    <section className="media-workspace anime-workspace">
      <header className="entertainment-page-header">
        <h1 className="entertainment-module-title">Anime</h1>
        <div className="entertainment-navigation-row">
          <div className="media-tabs" role="tablist">
            <Tab active={!archived && view === "library"} icon={Library} label="Biblioteca" onClick={() => changeView("library")} />
            <Tab active={!archived && view === "watching"} icon={Film} label="En curso" onClick={() => changeView("watching")} />
            <Tab active={!archived && view === "history"} icon={HistoryIcon} label="Historial" onClick={() => changeView("history")} />
            <Tab active={!archived && view === "statistics"} icon={BarChart3} label="Estadísticas" onClick={() => changeView("statistics")} />
          </div>
          {collectionActions}
        </div>
      </header>

      {error && (
        <div className="media-error" role="alert">
          {error}
          <button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={16} /></button>
        </div>
      )}

      {initialLoading ? (
        <MediaEmpty loading />
      ) : (
        <>
          {view === "watching" && (
            <WatchingView
              items={items}
              busy={busy}
              open={openDetail}
              increment={async (item) => {
                const target = item.kind === "movie"
                  ? { type: "title" as const, id: item.id }
                  : item.nextContent
                    ? { type: "content" as const, id: item.nextContent.id }
                    : null;
                if (!target) return;
                const result = await run(async () => {
                  const before = await mediaApi.get(item.id);
                  let next = await mediaApi.increment(target.type, target.id, todayMadrid());
                  if (target.type === "content") {
                    next = await resolveContentProgressStatus(before, next, target.id);
                  }
                  if (next.title.status !== before.title.status) return next;
                  return resolveInferredMediaStatus(before, next);
                });
                if (result) await load(false);
              }}
            />
          )}
          {view === "library" && (
            <LibraryView
              archived={archived}
              section={librarySection}
              setSection={changeLibrarySection}
              search={search}
              setSearch={setSearch}
              statuses={statuses}
              setStatuses={setStatuses}
              favoritesOnly={favoritesOnly}
              setFavoritesOnly={setFavoritesOnly}
              scoreFilter={scoreFilter}
              setScoreFilter={setScoreFilter}
              sort={librarySort}
              setSort={setLibrarySort}
              defaultSort={defaultLibrarySort}
              saveSortAsDefault={() => {
                saveDefaultSort(animeSortStorageKey(librarySection), librarySort);
                setDefaultLibrarySort(librarySort);
              }}
              items={items}
              open={openDetail}
              busy={busy}
              toggleFavorite={async (item) => {
                const result = await run(() => mediaApi.setTitleFavorite(item.id, !item.favorite));
                if (result) await load(false);
              }}
              restore={async (id) => {
                if (await runAction(() => mediaApi.restore(id))) await load(false);
              }}
              remove={async (id, name) => {
                if (!await confirmAction({ title: `Eliminar “${name}”`, message: "Se eliminarán definitivamente el título, sus contenidos y todo su historial.", confirmLabel: "Eliminar título", destructive: true })) return;
                if (await runAction(() => mediaApi.delete(id))) await load(false);
              }}
            />
          )}
          {view === "statistics" && (
            <StatisticsView contents={statisticsContents} history={statisticsHistory} items={statisticsItems} open={openDetail} scope={statisticsScope} setScope={setStatisticsScope} showUnscored={statisticsScope === "content" ? undefined : () => { changeLibrarySection(statisticsScope === "movie" ? "movies" : "anime"); setScoreFilter("unscored"); changeView("library"); }} />
          )}
          {view === "history" && <HistoryView busy={busy} content={historyContent} entries={history} month={historyMonth} oldestFirst={historyOldestFirst} options={historyOptions} selected={historySelection} setContent={setHistoryContent} setMonth={setHistoryMonth} setOldestFirst={setHistoryOldestFirst} setTitle={setHistoryTitle} setYear={setHistoryYear} title={historyTitle} titles={historyTitles} year={historyYear} updateDate={async (id, date) => { if (await runAction(() => mediaApi.updateHistoryDate(id, date))) await load(false); }} deleteEntry={async (entry) => { if (!await confirmAction({ title: "Eliminar visualización", message: "Se retirará este registro y se actualizará el progreso calculado.", confirmLabel: "Eliminar visualización", destructive: true })) return; if (await runAction(() => mediaApi.deleteHistoryEntry(entry.id))) await load(false); }} />}
        </>
      )}

      {detail && (
        <MediaDetailView
          catalogPosition={detailPosition}
          error={error}
          detail={detail}
          movieViewings={movieViewings}
          busy={busy}
          close={() => { setDetail(null); setDetailPosition(null); }}
          editTitle={() => setTitleForm("edit")}
          addContent={() => setContentForm("new")}
          editContent={setContentForm}
          increment={async (type, id) => {
            await mutateHistoryDetail(() => mediaApi.increment(type, id, todayMadrid()), type === "content" ? id : undefined);
          }}
          setProgress={async (type, id, watched, date) => {
            return mutateHistoryDetail(() => mediaApi.setProgress(type, id, watched, date), type === "content" ? id : undefined);
          }}
          registerContentRun={(input) => mutateHistoryDetail(() => mediaApi.registerContentRun(input), input.contentId)}
          setContentScore={async (content, score) => {
            await mutateDetail(() => mediaApi.updateContent(content.id, contentInput(content, { score })));
          }}
          removeContent={async (content) => {
            if (!await confirmAction({ title: `Eliminar “${content.name}”`, message: "Se eliminarán definitivamente el contenido y todo su historial.", confirmLabel: "Eliminar contenido", destructive: true })) return;
            await mutateDetail(async () => {
              await mediaApi.deleteContent(content.id);
              return resolveContentStateSuggestion(detail, await mediaApi.get(detail.title.id));
            });
          }}
          omitContent={async (content) => {
            await mutateDetail(async () =>
              resolveContentStateSuggestion(detail, await mediaApi.updateContent(
                content.id,
                contentInput(content, {
                  canonStatus: content.canonStatus === "omitted" ? "canon" : "omitted",
                }),
              )),
            );
          }}
          reorder={async (ids) => {
            await mutateDetail(async () => {
              await mediaApi.reorderContents(detail.title.id, ids);
              return resolveContentStateSuggestion(detail, await mediaApi.get(detail.title.id));
            });
          }}
          archive={async () => {
            if (await runAction(() => mediaApi.archive(detail.title.id))) {
              setDetail(null);
              await load(false);
            }
          }}
          restore={async () => {
            if (await runAction(() => mediaApi.restore(detail.title.id))) {
              setDetail(null);
              await load(false);
            }
          }}
          removeTitle={async () => {
            if (!await confirmAction({ title: `Eliminar “${detail.title.name}”`, message: "Se eliminarán definitivamente el título, sus contenidos y todo su historial.", confirmLabel: "Eliminar título", destructive: true })) return;
            if (await runAction(() => mediaApi.delete(detail.title.id))) {
              setDetail(null);
              await load(false);
            }
          }}
          setTitleStatus={async (next) => { await mutateDetail(() => mediaApi.setTitleStatus(detail.title.id, next)); }}
          setTitleScore={async (next) => { await mutateDetail(() => mediaApi.setTitleScore(detail.title.id, next)); }}
          setTitleFavorite={async (next) => { await mutateDetail(() => mediaApi.setTitleFavorite(detail.title.id, next)); }}
          setCoverPosition={(x, y, zoom) => mutateDetail(() => mediaApi.setCoverPosition(detail.title.id, x, y, zoom))}
          openHistory={openHistory}
          updateHistoryGroup={async (group) => {
            return mutateHistoryDetail(() => mediaApi.updateContentRegistration(group.registrationId, group.contentId, group.episodes, group.watchedOn, group.firstEpisode), group.contentId);
          }}
          deleteHistoryGroup={async (sessionIds) => {
            const before = detail;
            const result = await run(async () => {
              for (const sessionId of sessionIds) await mediaApi.deleteHistoryEntry(sessionId);
              return resolveInferredMediaStatus(before, await mediaApi.get(before.title.id));
            });
            if (!result) return false;
            historyCacheKeyRef.current = null;
            setDetail(result);
            await load(false);
            return true;
          }}
          addMovieViewing={async (watchedOn) => Boolean(await mutateMovieViewing(() => mediaApi.createMovieViewing(detail.title.id, watchedOn)))}
          editMovieViewing={async (viewingId, watchedOn) => { await mutateMovieViewing(() => mediaApi.updateMovieViewing(viewingId, watchedOn)); }}
          deleteMovieViewing={async (viewingId) => { await mutateMovieViewing(() => mediaApi.deleteMovieViewing(viewingId)); }}
        />
      )}

      {titleForm && (
        <MediaTitleForm
          busy={busy}
          close={() => setTitleForm(null)}
          detail={titleForm === "edit" ? detail : null}
          area="anime"
          preferredKind={librarySection === "movies" ? "movie" : "anime"}
          save={async (input: MediaTitleInput) => {
            const result = await run(() =>
              titleForm === "edit" && detail
                ? mediaApi.updateTitle(detail.title.id, input)
                : mediaApi.createTitle(input),
            );
            if (!result) return false;
            if (titleForm === "edit") setDetail(result);
            await load(false);
            return true;
          }}
        />
      )}

      {contentForm && detail && (
        <MediaContentForm
          busy={busy}
          close={() => setContentForm(null)}
          content={contentForm === "new" ? null : contentForm}
          save={async (input: MediaContentInput) =>
            mutateDetail(async () => {
              const after = contentForm === "new"
                ? await mediaApi.createContent(detail.title.id, input)
                : await mediaApi.updateContent(contentForm.id, input);
              return resolveContentStateSuggestion(detail, after);
            })
          }
        />
      )}
    </section>
  );
}

function WatchingView({
  items,
  busy,
  open,
  increment,
}: {
  items: MediaTitle[];
  busy: boolean;
  open: (id: string, position?: number) => void;
  increment: (item: MediaTitle) => Promise<void>;
}) {
  return (
    <section className="media-view">
      {items.length === 0 ? (
        <MediaEmpty text="No tienes ningún título marcado como Viendo." />
      ) : (
        <div className="library-grid anime-watching-grid">
          {items.map((item, index) => {
            const target = item.kind === "movie" ? item.watchedUnits < 1 : Boolean(item.nextContent?.canIncrement);
            return (
              <article className="library-card anime-watching-card" key={item.id}>
                <button className="library-card-open" onClick={() => open(item.id, index + 1)} type="button">
                  <div className="library-cover-wrap">
                    <CoverImage alt={`Portada de ${item.name}`} animated={item.animatedCover} hasCover={item.hasCover} positionX={item.coverPositionX} positionY={item.coverPositionY} titleId={item.id} zoom={item.coverZoom} />
                    {item.kind === "anime" && <span className="library-catalog-number">#{index + 1}</span>}
                    {item.favorite && <Star className="library-favorite" fill="currentColor" size={17} />}
                  </div>
                  <div className="library-card-copy">
                    <AnimePreviewStatus status={item.status} progress={item.kind === "anime" ? item.progress : undefined} />
                    <h3>{item.name}</h3>
                    {item.genres.length > 0 && <div className="media-genre-tags">{item.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>}
                    <div className="media-library-card-footer">
                      {item.kind === "anime" ? <AnimePreviewProgress progress={item.progress} /> : <AnimeMovieLastViewed date={item.lastActivityOn} />}
                      <ScoreTile className="media-score-badge" score={item.score ?? item.averageContentScore} />
                    </div>
                  </div>
                </button>
                <button className="media-continue-button" disabled={busy || !target} onClick={() => void increment(item)} type="button">
                  {item.kind === "movie" ? "Marcar como vista" : "+1 episodio"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LibraryView({
  archived,
  section,
  setSection,
  search,
  setSearch,
  statuses,
  setStatuses,
  favoritesOnly,
  setFavoritesOnly,
  scoreFilter,
  setScoreFilter,
  sort,
  setSort,
  defaultSort,
  saveSortAsDefault,
  items,
  open,
  busy,
  toggleFavorite,
  restore,
  remove,
}: {
  archived: boolean;
  section: LibrarySection;
  setSection: (value: LibrarySection) => void;
  search: string;
  setSearch: (value: string) => void;
  statuses: TrackingStatus[];
  setStatuses: (value: TrackingStatus[]) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (value: boolean) => void;
  scoreFilter: "" | "scored" | "unscored";
  setScoreFilter: (value: "" | "scored" | "unscored") => void;
  sort: LibrarySort;
  setSort: (value: LibrarySort) => void;
  defaultSort: LibrarySort;
  saveSortAsDefault: () => void;
  items: MediaTitle[];
  open: (id: string, position?: number) => void;
  busy: boolean;
  toggleFavorite: (item: MediaTitle) => Promise<void>;
  restore: (id: string) => Promise<void>;
  remove: (id: string, name: string) => Promise<void>;
}) {
  const [collectionPanel, setCollectionPanel] = useState<"filters" | "sort" | null>(null);
  const [genreFilter, setGenreFilter] = useState("");
  const [scoreMinimum, setScoreMinimum] = useState("");
  const [scoreMaximum, setScoreMaximum] = useState("");
  const [activityYear, setActivityYear] = useState("");
  const [progressFilter, setProgressFilter] = useState<"" | "notStarted" | "inProgress" | "completed">("");
  const [upcomingFilter, setUpcomingFilter] = useState<"" | "withUpcoming" | "withoutUpcoming">("");
  const sectionItems = useMemo(() => items.filter((item) => item.kind === (section === "anime" ? "anime" : "movie")), [items, section]);
  const genreOptions = useMemo(() => [...new Set(sectionItems.flatMap((item) => item.genres))].sort((a, b) => a.localeCompare(b, "es")), [sectionItems]);
  const activityYears = useMemo(() => [...new Set(sectionItems.flatMap((item) => [item.firstActivityOn, item.lastActivityOn]).filter((date): date is string => Boolean(date)).map((date) => date.slice(0, 4)))].sort().reverse(), [sectionItems]);
  const sortedItems = useMemo(() => {
    const expectedKind = section === "anime" ? "anime" : "movie";
    const score = (item: MediaTitle) => item.score ?? item.averageContentScore;
    const result = items.filter((item) => {
      const itemScore = score(item);
      const total = item.progress.total ?? 0;
      return item.kind === expectedKind
        && (!search.trim() || item.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")) || item.alternativeTitle?.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")))
        && (statuses.length === 0 || statuses.includes(item.status))
        && (!favoritesOnly || item.favorite)
        && (!genreFilter || item.genres.includes(genreFilter))
        && (!scoreFilter || (scoreFilter === "unscored" ? itemScore === null : itemScore !== null))
        && (!scoreMinimum || (itemScore !== null && itemScore >= Number(scoreMinimum)))
        && (!scoreMaximum || (itemScore !== null && itemScore <= Number(scoreMaximum)))
        && (!activityYear || item.firstActivityOn?.startsWith(activityYear) || item.lastActivityOn?.startsWith(activityYear))
        && (section !== "anime" || !progressFilter || (progressFilter === "notStarted" ? item.progress.watched === 0 : progressFilter === "inProgress" ? item.progress.watched > 0 && (total === 0 || item.progress.watched < total) : total > 0 && item.progress.watched >= total))
        && (section !== "anime" || !upcomingFilter || (upcomingFilter === "withUpcoming" ? item.progress.upcomingCount > 0 : item.progress.upcomingCount === 0));
    });
    result.sort((left, right) => {
      const byTitle = () => left.name.localeCompare(right.name, "es");
      if (sort === "updated") return 0;
      if (sort === "titleAsc") return byTitle();
      if (sort === "progressAsc" || sort === "progressDesc") {
        const progress = (item: MediaTitle) => item.progress.totalIncomplete ? item.progress.knownPercentage : item.progress.percentage;
        const first = progress(left), second = progress(right);
        if (first === null || first === undefined) return second === null || second === undefined ? byTitle() : 1;
        if (second === null || second === undefined) return -1;
        return (sort === "progressAsc" ? first - second : second - first) || byTitle();
      }
      if (sort.startsWith("start") || sort.startsWith("finish")) {
        const first = sort.startsWith("start") ? left.firstActivityOn : left.lastActivityOn;
        const second = sort.startsWith("start") ? right.firstActivityOn : right.lastActivityOn;
        if (!first) return second ? 1 : byTitle();
        if (!second) return -1;
        return (sort.endsWith("Asc") ? first.localeCompare(second) : second.localeCompare(first)) || byTitle();
      }
      const leftScore = score(left);
      const rightScore = score(right);
      if (leftScore === null) return rightScore === null ? byTitle() : 1;
      if (rightScore === null) return -1;
      return (sort === "scoreDesc" ? rightScore - leftScore : leftScore - rightScore) || byTitle();
    });
    return result;
  }, [activityYear, favoritesOnly, genreFilter, items, progressFilter, scoreFilter, scoreMaximum, scoreMinimum, search, section, sort, statuses, upcomingFilter]);
  const activeFilterCount = Number(statuses.length > 0) + Number(Boolean(scoreFilter)) + Number(Boolean(genreFilter))
    + Number(Boolean(scoreMinimum)) + Number(Boolean(scoreMaximum)) + Number(Boolean(activityYear))
    + Number(section === "anime" && Boolean(progressFilter)) + Number(section === "anime" && Boolean(upcomingFilter));

  return (
    <section className="media-view">
      <div className="media-filters">
        <div className="media-library-sections" role="tablist" aria-label="Tipo de biblioteca anime">
          <button aria-selected={section === "anime"} className={section === "anime" ? "active" : ""} onClick={() => setSection("anime")} role="tab" type="button">Anime</button>
          <button aria-selected={section === "movies"} className={section === "movies" ? "active" : ""} onClick={() => setSection("movies")} role="tab" type="button">Películas</button>
        </div>
        <label className="media-search">
          <Search size={17} />
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título" value={search} />
        </label>
        <FavoriteFilter active={favoritesOnly} onChange={setFavoritesOnly} />
        <FilterDisclosure change={setCollectionPanel} controlsId="anime-library-filters" count={activeFilterCount} open={collectionPanel} sortActive={sort !== "titleAsc"} />
        {collectionPanel && <FilterBuilder id="anime-library-filters" mode={collectionPanel} filters={[
          { id: "status", label: "Estado", active: statuses.length > 0, clear: () => setStatuses([]), control: <MultiSelectControl label="Todos los estados" onChange={setStatuses} options={(section === "anime" ? animeTrackingStatuses : trackingStatuses).map((item) => ({ ...item, title: statusHelp(item.value) }))} value={statuses} /> },
          { id: "genre", label: "Género", active: Boolean(genreFilter), clear: () => setGenreFilter(""), control: <SelectControl><select aria-label="Filtrar por género" onChange={(event) => setGenreFilter(event.target.value)} value={genreFilter}><option value="">Todos los géneros</option>{genreOptions.map((genre) => <option key={genre}>{genre}</option>)}</select></SelectControl> },
          { id: "score", label: "Puntuación", active: Boolean(scoreFilter), clear: () => setScoreFilter(""), control: <SelectControl><select aria-label="Filtrar por disponibilidad de puntuación" onChange={(event) => setScoreFilter(event.target.value as "" | "scored" | "unscored")} value={scoreFilter}><option value="">Todas las puntuaciones</option><option value="scored">Solo puntuadas</option><option value="unscored">Sin puntuar</option></select></SelectControl> },
          { id: "score-min", label: "Puntuación mínima", active: Boolean(scoreMinimum), clear: () => setScoreMinimum(""), control: <SelectControl><select aria-label="Puntuación mínima" onChange={(event) => setScoreMinimum(event.target.value)} value={scoreMinimum}><option value="">Cualquiera</option>{[5,6,7,8,9].map((value) => <option key={value} value={value}>{value} o más</option>)}</select></SelectControl> },
          { id: "score-max", label: "Puntuación máxima", active: Boolean(scoreMaximum), clear: () => setScoreMaximum(""), control: <SelectControl><select aria-label="Puntuación máxima" onChange={(event) => setScoreMaximum(event.target.value)} value={scoreMaximum}><option value="">Cualquiera</option>{[5,6,7,8,9].map((value) => <option key={value} value={value}>{value} o menos</option>)}</select></SelectControl> },
          { id: "activity-year", label: "Año de actividad", active: Boolean(activityYear), clear: () => setActivityYear(""), control: <SelectControl><select aria-label="Filtrar por año de actividad" onChange={(event) => setActivityYear(event.target.value)} value={activityYear}><option value="">Cualquier año</option>{activityYears.map((year) => <option key={year}>{year}</option>)}</select></SelectControl> },
          ...(section === "anime" ? [
            { id: "progress", label: "Progreso", active: Boolean(progressFilter), clear: () => setProgressFilter(""), control: <SelectControl><select aria-label="Filtrar por progreso" onChange={(event) => setProgressFilter(event.target.value as "" | "notStarted" | "inProgress" | "completed")} value={progressFilter}><option value="">Cualquier progreso</option><option value="notStarted">Sin empezar</option><option value="inProgress">Con progreso</option><option value="completed">Todo lo disponible visto</option></select></SelectControl> },
            { id: "upcoming", label: "Contenido por salir", active: Boolean(upcomingFilter), clear: () => setUpcomingFilter(""), control: <SelectControl><select aria-label="Filtrar por contenido futuro" onChange={(event) => setUpcomingFilter(event.target.value as "" | "withUpcoming" | "withoutUpcoming")} value={upcomingFilter}><option value="">Con o sin contenido por salir</option><option value="withUpcoming">Con contenido por salir</option><option value="withoutUpcoming">Sin contenido por salir</option></select></SelectControl> },
          ] : []),
        ]} sortControl={<SelectControl><select aria-label="Ordenar biblioteca" onChange={(event) => setSort(event.target.value as LibrarySort)} value={sort}>
              <option value="titleAsc">Título (A–Z)</option>
              <option value="updated">Actualizados recientemente</option>
              <option value="scoreDesc">Valoración (mayor primero)</option>
              <option value="scoreAsc">Valoración (menor primero)</option>
              {section === "anime" && <option value="progressDesc">Porcentaje visto (mayor primero)</option>}
              {section === "anime" && <option value="progressAsc">Porcentaje visto (menor primero)</option>}
              <option value="startDesc">Inicio (más reciente)</option>
              <option value="startAsc">Inicio (más antiguo)</option>
              <option value="finishDesc">Finalización (más reciente)</option>
              <option value="finishAsc">Finalización (más antigua)</option>
            </select></SelectControl>} sortPreference={{ isDefault: sort === defaultSort, isFallback: sort === "titleAsc", save: saveSortAsDefault }} />}
      </div>
      {sortedItems.length === 0 ? (
        <MediaEmpty text={archived ? "El Archivo está vacío." : section === "anime" ? "No hay anime con estos filtros." : "No hay películas anime con estos filtros."} />
      ) : (
        <div className="library-grid">
          {sortedItems.map((item, index) => (
            <article className="library-card" key={item.id}>
              <button className="library-card-open" onClick={() => open(item.id, index + 1)} type="button">
                <div className="library-cover-wrap">
                  <CoverImage alt={`Portada de ${item.name}`} animated={item.animatedCover} hasCover={item.hasCover} positionX={item.coverPositionX} positionY={item.coverPositionY} titleId={item.id} zoom={item.coverZoom} />
                  {item.kind === "anime" && <span className="library-catalog-number">#{index + 1}</span>}
                </div>
                <div className="library-card-copy">
                  <AnimePreviewStatus status={item.status} progress={item.kind === "anime" ? item.progress : undefined} />
                  <h3>{item.name}</h3>
                  {item.genres.length > 0 && <div className="media-genre-tags">{item.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>}
                  <div className="media-library-card-footer">
                    {item.kind === "anime" ? <AnimePreviewProgress progress={item.progress} /> : <AnimeMovieLastViewed date={item.lastActivityOn} />}
                    <ScoreTile className="media-score-badge" score={item.score ?? item.averageContentScore} />
                  </div>
                </div>
              </button>
              {!archived && (
                <button
                  aria-label={item.favorite ? `Quitar ${item.name} de favoritos` : `Añadir ${item.name} a favoritos`}
                  className={`library-favorite-toggle${item.favorite ? " active" : ""}`}
                  disabled={busy}
                  onClick={() => void toggleFavorite(item)}
                  title={item.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                  type="button"
                >
                  <Star fill={item.favorite ? "currentColor" : "none"} size={17} />
                </button>
              )}
              {archived && <ArchiveItemActions busy={busy} itemLabel={item.name} remove={() => void remove(item.id, item.name)} restore={() => void restore(item.id)} />}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AnimeMovieLastViewed({ date }: { date: string | null }) {
  return <div className="anime-movie-last-viewed"><small>Último visionado</small><strong>{date ? formatDate(date) : "Sin visionados"}</strong></div>;
}

function StatisticsView({ contents, history, items, open, scope, setScope, showUnscored }: { contents: AnimeStatContent[]; history: MediaHistoryEntry[]; items: MediaTitle[]; open: (id: string) => void; scope: StatisticsScope; setScope: (value: StatisticsScope) => void; showUnscored?: () => void }) {
  const scopedTitles = items.filter((item) => item.kind === scope);
  const normalizedItems = scope === "content"
    ? contents.map((content) => ({ id: content.id, name: content.name, detail: content.titleName, status: content.status, statusLabel: statusLabel(content.status), score: content.score, favorite: false, genres: content.genres, totalUnits: content.effectiveTotal, startedOn: content.firstActivityOn, finishedOn: content.status === "completed" ? content.lastActivityOn : null }))
    : scopedTitles.map((item) => ({ id: item.id, name: item.name, status: item.status, statusLabel: statusLabel(item.status), score: item.score ?? (scope === "anime" ? item.averageContentScore : null), favorite: item.favorite, genres: item.genres, totalUnits: item.progress.total, startedOn: item.firstActivityOn, finishedOn: item.status === "completed" ? item.lastActivityOn : null }));
  const includedContentIds = new Set(contents.map((content) => content.id));
  const normalizedHistory = history.filter((entry) => (!entry.contentId || includedContentIds.has(entry.contentId)) && (scope === "content" ? Boolean(entry.contentId) : scopedTitles.some((item) => item.id === entry.titleId))).map((entry) => ({ id: entry.id, itemId: scope === "content" ? entry.contentId! : entry.titleId, activityOn: entry.watchedOn, completed: true, units: 1 }));
  return <section className="media-view">
    <MediaStatisticsDashboard
      extraFilters={<SelectControl><select aria-label="Ámbito de las estadísticas de Anime" onChange={(event) => setScope(event.target.value as StatisticsScope)} value={scope}><option value="anime">Anime</option><option value="movie">Películas</option><option value="content">Contenidos</option></select></SelectControl>}
      items={normalizedItems}
      noun={scope === "anime" ? "Anime" : scope === "movie" ? "Películas" : "Contenidos"}
      openItem={(id) => { if (scope === "content") { const content = contents.find((item) => item.id === id); if (content) void open(content.titleId); } else void open(id); }}
      refinedAnime
      repeatable={false}
      showUnscored={showUnscored}
      sessions={normalizedHistory}
      storageKey={`nubeos.anime.statistics.${scope}`}
      unitLabel={scope === "movie" ? "Visionados" : "Episodios"}
    />
  </section>;
}

function HistoryView({ entries, options, titles: titleOptions, selected, year, setYear, month, setMonth, title, setTitle, content, setContent, oldestFirst, setOldestFirst, busy, updateDate, deleteEntry }: {
  entries: MediaHistoryEntry[];
  options: MediaHistoryEntry[];
  titles: MediaTitle[];
  selected: MediaDetail | null;
  year: string; setYear: (value: string) => void;
  month: string; setMonth: (value: string) => void;
  title: string; setTitle: (value: string) => void;
  content: string; setContent: (value: string) => void;
  oldestFirst: boolean; setOldestFirst: (value: boolean) => void;
  busy: boolean;
  updateDate: (id: string, date: string) => Promise<void>;
  deleteEntry: (entry: MediaHistoryEntry) => Promise<void>;
}) {
  const years = [...new Set(options.map((entry) => entry.watchedOn.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const titles = [...new Map([
    ...titleOptions.map((item) => [item.id, item.name] as const),
    ...(selected ? [[selected.title.id, selected.title.name] as const] : []),
  ]).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  const contents = selected?.title.id === title
    ? [...selected.contents].sort((a, b) => a.position - b.position)
    : [];
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return (
    <section className="media-view">
      <div className="media-history-filters">
        <SelectControl><select aria-label="Filtrar historial por año" onChange={(event) => setYear(event.target.value)} value={year}><option value="">Todos los años</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Filtrar historial por mes" onChange={(event) => setMonth(event.target.value)} value={month}><option value="">Todos los meses</option>{months.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Filtrar historial por anime" onChange={(event) => { setTitle(event.target.value); setContent(""); }} value={title}><option value="">Todos los animes</option>{titles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Filtrar historial por contenido" disabled={!title || contents.length === 0} onChange={(event) => setContent(event.target.value)} value={content}><option value="">{!title ? "Elige primero un anime" : contents.length === 0 ? "Sin contenidos" : "Todos los contenidos"}</option>{contents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Orden del historial" onChange={(event) => setOldestFirst(event.target.value === "oldest")} value={oldestFirst ? "oldest" : "newest"}><option value="newest">Más reciente primero</option><option value="oldest">Más antiguo primero</option></select></SelectControl>
      </div>
      {entries.length === 0 ? <MediaEmpty text="No hay actividad con estos filtros." /> : <div className="media-global-history">{entries.map((entry) => <GlobalHistoryRow busy={busy} deleteEntry={() => deleteEntry(entry)} entry={entry} key={entry.id} updateDate={(date) => updateDate(entry.id, date)} />)}</div>}
    </section>
  );
}

function GlobalHistoryRow({ entry, busy, updateDate, deleteEntry }: { entry: MediaHistoryEntry; busy: boolean; updateDate: (date: string) => Promise<void>; deleteEntry: () => Promise<void> }) {
  const [date, setDate] = useState(entry.watchedOn);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setDate(entry.watchedOn); setEditing(false); }, [entry.watchedOn]);
  const activity = entry.contentKind === "season" ? `Episodio ${entry.episodeNumber}` : entry.contentKind ? contentKindLabel(entry.contentKind) : "Película";
  const context = entry.contentName ? `${activity} · ${conciseContentName(entry.contentName, entry.titleName)}` : activity;
  return <><article className="media-global-history-row"><CalendarDays size={18} /><div className="media-global-history-main"><strong>{entry.titleName}</strong><span>{context}</span><time>{formatDate(entry.watchedOn)}</time></div>{entry.contentId && entry.releasedOn && <div className="media-global-history-release"><small>Estreno</small><time>{formatDate(entry.releasedOn)}</time></div>}<div className="media-global-history-actions"><button aria-label="Editar entrada" title="Editar fecha" className="media-icon-button" disabled={busy} onClick={() => setEditing(true)} type="button"><Edit3 size={15} /></button><span title={entry.canDelete ? "Eliminar y actualizar progreso" : "Para conservar el progreso, elimina primero los episodios posteriores de este primer visionado. Los revisionados se pueden eliminar libremente."}><button aria-label="Eliminar entrada" className="media-icon-button danger" disabled={busy || !entry.canDelete} onClick={() => void deleteEntry()} type="button"><Trash2 size={15} /></button></span></div></article>
    {editing && <Modal className="media-watch-form-dialog" labelledBy={`edit-history-${entry.id}`} onClose={() => setEditing(false)}><form className="media-watch-form" onSubmit={(event) => { event.preventDefault(); void updateDate(date); }}><h2 id={`edit-history-${entry.id}`}>Editar visionado</h2><p>{entry.titleName} · {context}</p><label>Fecha del visionado<SmartDateInput disabled={busy} min={entry.releasedOn ?? undefined} max={todayMadrid()} onChange={setDate} value={date} /></label>{entry.releasedOn && <small>Estreno: {formatDate(entry.releasedOn)}</small>}<footer><button className="secondary-button" onClick={() => setEditing(false)} type="button">Cancelar</button><button className="primary-button" disabled={busy || !date || date === entry.watchedOn || date > todayMadrid() || Boolean(entry.releasedOn && date < entry.releasedOn)} type="submit">Guardar</button></footer></form></Modal>}</>;
}

function Tab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Film; label: string; onClick: () => void }) {
  return <button aria-selected={active} className={active ? "active" : ""} onClick={onClick} role="tab" type="button"><Icon aria-hidden="true" size={16} /> {label}</button>;
}

function MediaEmpty({ loading = false, text }: { loading?: boolean; text?: string }) {
  return <div className="media-empty"><Film size={28} /><strong>{loading ? "Cargando biblioteca…" : text}</strong>{!loading && <span>Añade o ajusta tus títulos cuando quieras.</span>}</div>;
}
