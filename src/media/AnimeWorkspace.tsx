import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  BarChart3,
  Film,
  History as HistoryIcon,
  Library,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import ScoreTile from "../ui/ScoreTile";
import FavoriteFilter from "../ui/FavoriteFilter";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import MediaStatisticsDashboard from "../ui/MediaStatisticsDashboard";
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
import MediaDetailView from "./MediaDetail";
import { MediaContentForm, MediaTitleForm } from "./MediaForms";
import { resolveInferredMediaStatus } from "./statusChoice";
import {
  progressLabel,
  contentKindLabel,
  formatDate,
  statusLabel,
  todayMadrid,
  trackingStatuses,
} from "./presentation";
import "./media.css";

type View = "watching" | "library" | "statistics" | "history";
type StatisticsScope = "anime" | "movie" | "content";
type AnimeStatContent = MediaContent & { titleId: string; titleName: string; genres: string[] };
type LibrarySort = "updated" | "catalogAsc" | "catalogDesc" | "scoreDesc" | "scoreAsc" | "titleAsc" | "startAsc" | "startDesc" | "finishAsc" | "finishDesc";
type LibrarySection = "anime" | "movies";

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
  const [movieViewings, setMovieViewings] = useState<MovieViewing[]>([]);
  const [titleForm, setTitleForm] = useState<"new" | "edit" | null>(null);
  const [contentForm, setContentForm] = useState<MediaContent | "new" | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingStatus | "">("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<"" | "unscored">("");
  const [librarySort, setLibrarySort] = useState<LibrarySort>(() => (localStorage.getItem("nubeos.anime.sort.anime") as LibrarySort) || (localStorage.getItem("nubeos.anime.sort") as LibrarySort) || "catalogAsc");
  const [librarySection, setLibrarySection] = useState<LibrarySection>("anime");
  useEffect(() => { localStorage.setItem(`nubeos.anime.sort.${librarySection}`, librarySort); }, [librarySection, librarySort]);
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
          const [data, options] = await Promise.all([
            mediaApi.history({ area: "anime", year: historyYear ? Number(historyYear) : null, month: historyMonth ? Number(historyMonth) : null, titleId: historyTitle || null, contentId: historyContent || null, oldestFirst: historyOldestFirst }),
            mediaApi.history({ area: "anime" }),
          ]);
          if (requestId.current === id) { setHistory(data); setHistoryOptions(options); }
        } else {
          const data = await mediaApi.list({
            archived: view === "library" ? archived : false,
            search: view === "library" ? search || null : null,
            area: "anime",
            kind: null,
            status: view === "watching" ? "watching" : status || null,
            favoritesOnly: view === "library" && favoritesOnly,
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
    [archived, favoritesOnly, historyContent, historyMonth, historyOldestFirst, historyTitle, historyYear, search, status, view],
  );

  useEffect(() => {
    if (view !== "history") return;
    let cancelled = false;
    void Promise.all([
      mediaApi.list({ area: "anime", archived: false }),
      mediaApi.list({ area: "anime", archived: true }),
    ]).then(([active, archivedItems]) => {
      if (!cancelled) setHistoryTitles([...active, ...archivedItems]);
    }).catch((reason) => {
      if (!cancelled) setError(mediaErrorMessage(reason));
    });
    return () => { cancelled = true; };
  }, [view]);

  useEffect(() => {
    if (view !== "history" || !historyTitle) {
      setHistorySelection(null);
      return;
    }
    let cancelled = false;
    void mediaApi.get(historyTitle).then((selected) => {
      if (!cancelled) setHistorySelection(selected);
    }).catch((reason) => {
      if (!cancelled) setError(mediaErrorMessage(reason));
    });
    return () => { cancelled = true; };
  }, [historyTitle, view]);

  useEffect(() => {
    const delay = view === "library" ? 150 : 0;
    const timeout = window.setTimeout(() => void load(initialLoading), delay);
    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [load]);

  async function run<T>(operation: () => Promise<T>): Promise<T | null> {
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

  async function openDetail(id: string) {
    const result = await run(async () => {
      const selected = await mediaApi.get(id);
      const viewings = selected.title.kind === "movie" ? await mediaApi.movieViewings(id) : [];
      return { selected, viewings };
    });
    if (result) {
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
    setDetail(result);
    await load(false);
    return true;
  }

  async function mutateHistoryDetail(operation: () => Promise<MediaDetail>) {
    if (!detail) return false;
    const before = detail;
    const result = await run(async () => resolveInferredMediaStatus(before, await operation()));
    if (!result) return false;
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
    setMovieViewings(result.viewings);
    setDetail(result.detail);
    await load(false);
    return result.viewings;
  }

  function changeView(next: View) {
    if (next === view) return;
    setInitialLoading(true);
    if (next === "library" || next === "watching") setItems([]);
    setView(next);
    setArchived(false);
    setDetail(null);
  }

  function changeLibrarySection(next: LibrarySection) {
    if (next === librarySection) return;
    setLibrarySort((localStorage.getItem(`nubeos.anime.sort.${next}`) as LibrarySort) || (next === "anime" ? "catalogAsc" : "scoreDesc"));
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
      <button className="primary-button" onClick={() => setTitleForm("new")} type="button"><Plus size={17} /> Añadir anime</button>
    </div>
  );

  return (
    <section className="media-workspace anime-workspace">
      <div className="media-primary-toolbar">
        <div className="media-tabs" role="tablist">
          <Tab active={view === "library"} icon={Library} label="Biblioteca" onClick={() => changeView("library")} />
          <Tab active={view === "watching"} icon={Film} label="En curso" onClick={() => changeView("watching")} />
          <Tab active={view === "history"} icon={HistoryIcon} label="Historial" onClick={() => changeView("history")} />
          <Tab active={view === "statistics"} icon={BarChart3} label="Estadísticas" onClick={() => changeView("statistics")} />
        </div>
      </div>

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
              actions={collectionActions}
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
                  const before = target.type === "title" ? await mediaApi.get(item.id) : null;
                  const next = await mediaApi.increment(target.type, target.id, todayMadrid());
                  return before ? resolveInferredMediaStatus(before, next) : next;
                });
                if (result) await load(false);
              }}
            />
          )}
          {view === "library" && (
            <LibraryView
              actions={collectionActions}
              archived={archived}
              section={librarySection}
              setSection={changeLibrarySection}
              search={search}
              setSearch={setSearch}
              status={status}
              setStatus={setStatus}
              favoritesOnly={favoritesOnly}
              setFavoritesOnly={setFavoritesOnly}
              scoreFilter={scoreFilter}
              setScoreFilter={setScoreFilter}
              sort={librarySort}
              setSort={setLibrarySort}
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
                if (!window.confirm(`¿Eliminar definitivamente “${name}” y todo su historial?`)) return;
                if (await runAction(() => mediaApi.delete(id))) await load(false);
              }}
            />
          )}
          {view === "statistics" && (
            <StatisticsView actions={collectionActions} contents={statisticsContents} history={statisticsHistory} items={statisticsItems} open={openDetail} scope={statisticsScope} setScope={setStatisticsScope} showUnscored={statisticsScope === "content" ? undefined : () => { changeLibrarySection(statisticsScope === "movie" ? "movies" : "anime"); setScoreFilter("unscored"); changeView("library"); }} />
          )}
          {view === "history" && <HistoryView actions={collectionActions} busy={busy} content={historyContent} entries={history} month={historyMonth} oldestFirst={historyOldestFirst} options={historyOptions} selected={historySelection} setContent={setHistoryContent} setMonth={setHistoryMonth} setOldestFirst={setHistoryOldestFirst} setTitle={setHistoryTitle} setYear={setHistoryYear} title={historyTitle} titles={historyTitles} year={historyYear} updateDate={async (id, date) => { if (await runAction(() => mediaApi.updateHistoryDate(id, date))) await load(false); }} deleteEntry={async (entry) => { if (!window.confirm("¿Eliminar esta visualización y actualizar el progreso?")) return; if (await runAction(() => mediaApi.deleteHistoryEntry(entry.id))) await load(false); }} />}
        </>
      )}

      {detail && (
        <MediaDetailView
          detail={detail}
          movieViewings={movieViewings}
          busy={busy}
          close={() => setDetail(null)}
          editTitle={() => setTitleForm("edit")}
          addContent={() => setContentForm("new")}
          editContent={setContentForm}
          increment={async (type, id) => {
            await mutateHistoryDetail(() => mediaApi.increment(type, id, todayMadrid()));
          }}
          setProgress={async (type, id, watched, date) => {
            return mutateHistoryDetail(() => mediaApi.setProgress(type, id, watched, date));
          }}
          removeContent={async (content) => {
            if (!window.confirm(`¿Eliminar “${content.name}” y su historial?`)) return;
            if (await runAction(() => mediaApi.deleteContent(content.id))) {
              await refreshDetail(content.titleId);
              await load(false);
            }
          }}
          omitContent={async (content) => {
            await mutateDetail(() =>
              mediaApi.updateContent(
                content.id,
                contentInput(content, {
                  canonStatus: content.canonStatus === "omitted" ? "canon" : "omitted",
                }),
              ),
            );
          }}
          reorder={async (ids) => {
            if (await runAction(() => mediaApi.reorderContents(detail.title.id, ids))) await refreshDetail();
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
            if (!window.confirm(`¿Eliminar definitivamente “${detail.title.name}” y todo su historial?`)) return;
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
          updateHistoryDates={async (sessionIds, watchedOn) => {
            const updated = await runAction(() => Promise.all(sessionIds.map((sessionId) => mediaApi.updateHistoryDate(sessionId, watchedOn))));
            if (!updated) return false;
            await refreshDetail();
            await load(false);
            return true;
          }}
          deleteHistoryGroup={async (sessionIds) => {
            const before = detail;
            const result = await run(async () => {
              for (const sessionId of sessionIds) await mediaApi.deleteHistoryEntry(sessionId);
              return resolveInferredMediaStatus(before, await mediaApi.get(before.title.id));
            });
            if (!result) return false;
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
            mutateDetail(() =>
              contentForm === "new"
                ? mediaApi.createContent(detail.title.id, input)
                : mediaApi.updateContent(contentForm.id, input),
            )
          }
        />
      )}
    </section>
  );
}

function WatchingView({
  actions,
  items,
  busy,
  open,
  increment,
}: {
  actions: ReactNode;
  items: MediaTitle[];
  busy: boolean;
  open: (id: string) => void;
  increment: (item: MediaTitle) => Promise<void>;
}) {
  return (
    <section className="media-view">
      <div className="library-heading-row anime-collection-heading"><ViewHeading eyebrow="CONTINUAR" title="En curso" subtitle="Retoma lo último sin perder el hilo." />{actions}</div>
      {items.length === 0 ? (
        <MediaEmpty text="No tienes ningún título marcado como Viendo." />
      ) : (
        <div className="library-grid anime-watching-grid">
          {items.map((item) => {
            const target = item.kind === "movie" ? item.watchedUnits < 1 : Boolean(item.nextContent?.canIncrement);
            return (
              <article className="library-card anime-watching-card" key={item.id}>
                <button className="library-card-open" onClick={() => open(item.id)} type="button">
                  <div className="library-cover-wrap">
                    <CoverImage alt={`Portada de ${item.name}`} animated={item.animatedCover} hasCover={item.hasCover} positionX={item.coverPositionX} positionY={item.coverPositionY} titleId={item.id} zoom={item.coverZoom} />
                    {item.kind === "anime" && item.catalogNumber && <span className="library-catalog-number">#{item.catalogNumber}</span>}
                    {item.favorite && <Star className="library-favorite" fill="currentColor" size={17} />}
                  </div>
                  <div className="library-card-copy">
                    <span className={`media-status status-${item.status}`}>{statusLabel(item.status)}</span>
                    <h3>{item.name}</h3>
                    {item.genres.length > 0 && <div className="media-genre-tags">{item.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>}
                    <div className="media-library-card-footer">
                      <strong>{progressLabel(item.progress)}</strong>
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
  actions,
  archived,
  section,
  setSection,
  search,
  setSearch,
  status,
  setStatus,
  favoritesOnly,
  setFavoritesOnly,
  scoreFilter,
  setScoreFilter,
  sort,
  setSort,
  items,
  open,
  busy,
  toggleFavorite,
  restore,
  remove,
}: {
  actions: ReactNode;
  archived: boolean;
  section: LibrarySection;
  setSection: (value: LibrarySection) => void;
  search: string;
  setSearch: (value: string) => void;
  status: TrackingStatus | "";
  setStatus: (value: TrackingStatus | "") => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (value: boolean) => void;
  scoreFilter: "" | "unscored";
  setScoreFilter: (value: "" | "unscored") => void;
  sort: LibrarySort;
  setSort: (value: LibrarySort) => void;
  items: MediaTitle[];
  open: (id: string) => void;
  busy: boolean;
  toggleFavorite: (item: MediaTitle) => Promise<void>;
  restore: (id: string) => Promise<void>;
  remove: (id: string, name: string) => Promise<void>;
}) {
  const sortedItems = useMemo(() => {
    const expectedKind = section === "anime" ? "anime" : "movie";
    const result = items.filter((item) => item.kind === expectedKind && (!scoreFilter || (item.score ?? item.averageContentScore) === null));
    const score = (item: MediaTitle) => item.score ?? item.averageContentScore;
    result.sort((left, right) => {
      if (sort === "updated") return 0;
      if (sort === "titleAsc") return left.name.localeCompare(right.name, "es");
      if (sort.startsWith("start") || sort.startsWith("finish")) {
        const first = sort.startsWith("start") ? left.firstActivityOn : left.lastActivityOn;
        const second = sort.startsWith("start") ? right.firstActivityOn : right.lastActivityOn;
        if (!first) return second ? 1 : 0;
        if (!second) return -1;
        return sort.endsWith("Asc") ? first.localeCompare(second) : second.localeCompare(first);
      }
      if (sort === "catalogAsc" || sort === "catalogDesc") {
        if (left.catalogNumber === null) return right.catalogNumber === null ? 0 : 1;
        if (right.catalogNumber === null) return -1;
        const direction = sort === "catalogAsc" ? 1 : -1;
        return (left.catalogNumber - right.catalogNumber) * direction;
      }
      const leftScore = score(left);
      const rightScore = score(right);
      if (leftScore === null) return rightScore === null ? 0 : 1;
      if (rightScore === null) return -1;
      return sort === "scoreDesc" ? rightScore - leftScore : leftScore - rightScore;
    });
    return result;
  }, [items, scoreFilter, section, sort]);

  return (
    <section className="media-view">
      <div className="library-heading-row anime-collection-heading">
        <ViewHeading
          eyebrow={archived ? "ARCHIVO" : "TU COLECCIÓN"}
          title={archived ? (section === "anime" ? "Anime archivado" : "Películas archivadas") : (section === "anime" ? "Biblioteca de anime" : "Películas")}
          subtitle={archived ? "Restaura o elimina definitivamente." : section === "anime" ? "Tus franquicias, con su catálogo y contenidos relacionados." : "Películas independientes que no pertenecen a una franquicia."}
        />
      </div>
      <div className="anime-library-navigation">
        <div className="media-library-sections" role="tablist" aria-label="Tipo de biblioteca anime">
          <button className={section === "anime" ? "active" : ""} onClick={() => setSection("anime")} role="tab" type="button">Anime</button>
          <button className={section === "movies" ? "active" : ""} onClick={() => setSection("movies")} role="tab" type="button">Películas</button>
        </div>
        {actions}
      </div>
      <div className="media-filters">
        <label className="media-search">
          <Search size={17} />
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título" value={search} />
        </label>
        <SelectControl>
          <select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as TrackingStatus | "")} value={status}>
            <option value="">Todos los estados</option>
            {trackingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </SelectControl>
        <SelectControl><select aria-label="Filtrar por puntuación" onChange={(event) => setScoreFilter(event.target.value as "" | "unscored")} value={scoreFilter}><option value="">Todas las puntuaciones</option><option value="unscored">Sin puntuar</option></select></SelectControl>
        <SelectControl>
          <select aria-label="Ordenar biblioteca" onChange={(event) => setSort(event.target.value as LibrarySort)} value={sort}>
            <option value="updated">Actualizados recientemente</option>
            {section === "anime" && <option value="catalogAsc">Catálogo (ascendente)</option>}
            {section === "anime" && <option value="catalogDesc">Catálogo (descendente)</option>}
            <option value="scoreDesc">Valoración (mayor primero)</option>
            <option value="scoreAsc">Valoración (menor primero)</option>
            <option value="titleAsc">Título (A–Z)</option>
            <option value="startDesc">Inicio (más reciente)</option>
            <option value="startAsc">Inicio (más antiguo)</option>
            <option value="finishDesc">Finalización (más reciente)</option>
            <option value="finishAsc">Finalización (más antigua)</option>
          </select>
        </SelectControl>
        <FavoriteFilter active={favoritesOnly} onChange={setFavoritesOnly} />
      </div>
      {sortedItems.length === 0 ? (
        <MediaEmpty text={archived ? "El Archivo está vacío." : section === "anime" ? "No hay anime con estos filtros." : "No hay películas anime con estos filtros."} />
      ) : (
        <div className="library-grid">
          {sortedItems.map((item) => (
            <article className="library-card" key={item.id}>
              <button className="library-card-open" onClick={() => open(item.id)} type="button">
                <div className="library-cover-wrap">
                  <CoverImage alt={`Portada de ${item.name}`} animated={item.animatedCover} hasCover={item.hasCover} positionX={item.coverPositionX} positionY={item.coverPositionY} titleId={item.id} zoom={item.coverZoom} />
                  {item.kind === "anime" && item.catalogNumber && <span className="library-catalog-number">#{item.catalogNumber}</span>}
                </div>
                <div className="library-card-copy">
                  <span className={`media-status status-${item.status}`}>{statusLabel(item.status)}</span>
                  <h3>{item.name}</h3>
                  {item.genres.length > 0 && <div className="media-genre-tags">{item.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>}
                  <div className="media-library-card-footer">
                    <strong>{progressLabel(item.progress)}</strong>
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

function StatisticsView({ actions, contents, history, items, open, scope, setScope, showUnscored }: { actions: ReactNode; contents: AnimeStatContent[]; history: MediaHistoryEntry[]; items: MediaTitle[]; open: (id: string) => void; scope: StatisticsScope; setScope: (value: StatisticsScope) => void; showUnscored?: () => void }) {
  const scopedTitles = items.filter((item) => item.kind === scope);
  const normalizedItems = scope === "content"
    ? contents.map((content) => ({ id: content.id, name: content.name, detail: content.titleName, status: content.status, statusLabel: statusLabel(content.status), score: content.score, favorite: false, genres: content.genres, startedOn: content.firstActivityOn, finishedOn: content.status === "completed" ? content.lastActivityOn : null }))
    : scopedTitles.map((item) => ({ id: item.id, name: item.name, status: item.status, statusLabel: statusLabel(item.status), score: item.score ?? (scope === "anime" ? item.averageContentScore : null), favorite: item.favorite, genres: item.genres, startedOn: item.firstActivityOn, finishedOn: item.status === "completed" ? item.lastActivityOn : null }));
  const normalizedHistory = history.filter((entry) => scope === "content" ? Boolean(entry.contentId) : scopedTitles.some((item) => item.id === entry.titleId)).map((entry) => ({ id: entry.id, itemId: scope === "content" ? entry.contentId! : entry.titleId, activityOn: entry.watchedOn, completed: true, units: 1 }));
  return <section className="media-view">
    <div className="library-heading-row anime-collection-heading"><ViewHeading eyebrow="TU HISTORIAL" title="Estadísticas" subtitle="Franquicias, películas y contenidos sin mezclar sus escalas." />{actions}</div>
    <MediaStatisticsDashboard
      extraFilters={<SelectControl><select aria-label="Ámbito de las estadísticas de Anime" onChange={(event) => setScope(event.target.value as StatisticsScope)} value={scope}><option value="anime">Anime</option><option value="movie">Películas</option><option value="content">Contenidos</option></select></SelectControl>}
      items={normalizedItems}
      noun={scope === "anime" ? "Anime" : scope === "movie" ? "Películas" : "Contenidos"}
      openItem={(id) => { if (scope === "content") { const content = contents.find((item) => item.id === id); if (content) void open(content.titleId); } else void open(id); }}
      repeatable={false}
      showUnscored={showUnscored}
      sessions={normalizedHistory}
      storageKey={`nubeos.anime.statistics.${scope}`}
      unitLabel="Episodios registrados"
    />
  </section>;
}

function HistoryView({ actions, entries, options, titles: titleOptions, selected, year, setYear, month, setMonth, title, setTitle, content, setContent, oldestFirst, setOldestFirst, busy, updateDate, deleteEntry }: {
  actions: ReactNode;
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
  const scopeEntries = options.filter((entry) =>
    (!title || entry.titleId === title) && (!content || entry.contentId === content),
  );
  const firstActivity = scopeEntries.reduce<string | null>(
    (first, entry) => !first || entry.watchedOn < first ? entry.watchedOn : first,
    null,
  );
  const selectedWatched = content
    ? contents.find((item) => item.id === content)?.watchedEpisodes ?? 0
    : selected?.title.progress.watched ?? 0;
  const firstActivityLabel = firstActivity
    ? formatDate(firstActivity)
    : selectedWatched > 0
      ? "Progreso conservado sin fecha registrada"
      : "Sin actividad registrada";
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return (
    <section className="media-view">
      <div className="library-heading-row anime-collection-heading"><ViewHeading eyebrow="TU ACTIVIDAD" title="Historial" subtitle="Qué viste y cuándo, episodio a episodio." />{actions}</div>
      <div className="media-history-filters">
        <SelectControl><select aria-label="Filtrar historial por año" onChange={(event) => setYear(event.target.value)} value={year}><option value="">Todos los años</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Filtrar historial por mes" onChange={(event) => setMonth(event.target.value)} value={month}><option value="">Todos los meses</option>{months.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Filtrar historial por anime" onChange={(event) => { setTitle(event.target.value); setContent(""); }} value={title}><option value="">Todos los animes</option>{titles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Filtrar historial por contenido" disabled={!title || contents.length === 0} onChange={(event) => setContent(event.target.value)} value={content}><option value="">{!title ? "Elige primero un anime" : contents.length === 0 ? "Sin contenidos" : "Todos los contenidos"}</option>{contents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Orden del historial" onChange={(event) => setOldestFirst(event.target.value === "oldest")} value={oldestFirst ? "oldest" : "newest"}><option value="newest">Más reciente primero</option><option value="oldest">Más antiguo primero</option></select></SelectControl>
      </div>
      <div className="media-history-summary">
        <HistoryIcon size={17} />
        <div><span>Primera actividad</span><strong>{firstActivityLabel}</strong></div>
      </div>
      {entries.length === 0 ? <MediaEmpty text="No hay actividad con estos filtros." /> : <div className="media-global-history">{entries.map((entry) => <GlobalHistoryRow busy={busy} deleteEntry={() => deleteEntry(entry)} entry={entry} key={entry.id} updateDate={(date) => updateDate(entry.id, date)} />)}</div>}
    </section>
  );
}

function GlobalHistoryRow({ entry, busy, updateDate, deleteEntry }: { entry: MediaHistoryEntry; busy: boolean; updateDate: (date: string) => Promise<void>; deleteEntry: () => Promise<void> }) {
  const [date, setDate] = useState(entry.watchedOn);
  useEffect(() => setDate(entry.watchedOn), [entry.watchedOn]);
  const description = entry.contentKind === "season"
    ? `Episodio ${entry.episodeNumber} visto`
    : entry.contentKind
      ? `${contentKindLabel(entry.contentKind)} “${entry.contentName}” ${entry.contentKind === "movie" ? "vista" : "visto"}`
      : `Película “${entry.titleName}” vista`;
  return <article className="media-global-history-row"><HistoryIcon size={16} /><div><strong>{description}</strong><span>{entry.contentName ? `${entry.titleName} (${entry.contentName})` : entry.titleName}</span></div><time>{formatDate(entry.watchedOn)}</time><SmartDateInput aria-label={`Fecha de ${description}`} disabled={busy} max={todayMadrid()} onChange={setDate} value={date} /><button aria-label="Guardar fecha" className="media-history-save" disabled={busy || date === entry.watchedOn} onClick={() => void updateDate(date)} type="button">Guardar</button><button aria-label="Eliminar entrada" className="media-icon-button danger" disabled={busy || !entry.canDelete} onClick={() => void deleteEntry()} title={entry.canDelete ? "Eliminar y actualizar progreso" : "Solo puede eliminarse el último episodio"} type="button"><Trash2 size={15} /></button></article>;
}

function Tab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Film; label: string; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick} role="tab" type="button"><Icon size={16} /> {label}</button>;
}

function ViewHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="media-view-heading"><span>{eyebrow}</span><h2>{title}</h2><p>{subtitle}</p></header>;
}

function MediaEmpty({ loading = false, text }: { loading?: boolean; text?: string }) {
  return <div className="media-empty"><Film size={28} /><strong>{loading ? "Cargando biblioteca…" : text}</strong>{!loading && <span>Añade o ajusta tus títulos cuando quieras.</span>}</div>;
}
