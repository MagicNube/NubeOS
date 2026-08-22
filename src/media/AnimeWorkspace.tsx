import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type {
  MediaContent,
  MediaContentInput,
  MediaDetail,
  MediaHistoryEntry,
  MediaKind,
  MediaStatistics,
  MediaTitle,
  MediaTitleInput,
  ProgressTarget,
  TrackingStatus,
} from "./api";
import { mediaApi, mediaErrorMessage } from "./api";
import CoverImage from "./CoverImage";
import MediaDetailView from "./MediaDetail";
import { MediaContentForm, MediaTitleForm } from "./MediaForms";
import {
  formatScore,
  progressLabel,
  scoreColor,
  scoreTone,
  contentKindLabel,
  formatDate,
  statusLabel,
  todayMadrid,
  trackingStatuses,
} from "./presentation";
import "./media.css";

type View = "watching" | "library" | "statistics" | "history";
type LibrarySort = "catalogAsc" | "catalogDesc" | "scoreDesc" | "scoreAsc" | "titleAsc";
type LibrarySection = "anime" | "movies";

function contentInput(content: MediaContent, overrides: Partial<MediaContentInput> = {}): MediaContentInput {
  return {
    name: content.name,
    kind: content.kind,
    status: content.status,
    canonStatus: content.canonStatus,
    totalEpisodes: content.totalEpisodes,
    studio: content.studio,
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
  const [view, setView] = useState<View>("watching");
  const [items, setItems] = useState<MediaTitle[]>([]);
  const [statistics, setStatistics] = useState<MediaStatistics | null>(null);
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [titleForm, setTitleForm] = useState<"new" | "edit" | null>(null);
  const [contentForm, setContentForm] = useState<MediaContent | "new" | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TrackingStatus | "">("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [librarySort, setLibrarySort] = useState<LibrarySort>("catalogAsc");
  const [librarySection, setLibrarySection] = useState<LibrarySection>("anime");
  const [studios, setStudios] = useState<string[]>([]);
  const [studio, setStudio] = useState("");
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
          const data = await mediaApi.statistics("anime");
          if (requestId.current === id) setStatistics(data);
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
            kind: view === "library" ? (librarySection === "anime" ? "anime" : "movie") : null,
            status: view === "watching" ? "watching" : status || null,
            studio: view === "library" ? studio || null : null,
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
    [archived, favoritesOnly, historyContent, historyMonth, historyOldestFirst, historyTitle, historyYear, librarySection, search, status, studio, view],
  );

  useEffect(() => { void mediaApi.listStudios().then(setStudios).catch(() => undefined); }, []);

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
    const result = await run(() => mediaApi.get(id));
    if (result) setDetail(result);
  }

  async function refreshDetail(id = detail?.title.id) {
    if (!id) return;
    const next = await mediaApi.get(id);
    setDetail(next);
  }

  async function mutateDetail(operation: () => Promise<MediaDetail>) {
    const result = await run(operation);
    if (!result) return false;
    setDetail(result);
    await load(false);
    return true;
  }

  function changeView(next: View) {
    setView(next);
    setArchived(false);
    setDetail(null);
  }

  function changeLibrarySection(next: LibrarySection) {
    if (next === librarySection) return;
    requestId.current += 1;
    setItems([]);
    setInitialLoading(true);
    setLibrarySection(next);
    setLibrarySort(next === "anime" ? "catalogAsc" : "scoreDesc");
  }

  function openHistory(titleId: string, contentId?: string) {
    if (detail?.title.id === titleId) setHistorySelection(detail);
    setHistoryTitle(titleId);
    setHistoryContent(contentId ?? "");
    setView("history");
    setArchived(false);
    setDetail(null);
  }

  return (
    <section className="media-workspace">
      <div className="media-primary-toolbar">
        <div className="media-tabs" role="tablist">
          <Tab active={view === "watching"} icon={Film} label="En curso" onClick={() => changeView("watching")} />
          <Tab active={view === "library"} icon={Library} label="Biblioteca" onClick={() => changeView("library")} />
          <Tab active={view === "statistics"} icon={BarChart3} label="Estadísticas" onClick={() => changeView("statistics")} />
          <Tab active={view === "history"} icon={HistoryIcon} label="Historial" onClick={() => changeView("history")} />
        </div>
        <div className="media-toolbar-actions">
          {view === "library" && (
            <button className="ui-archive-toggle" onClick={() => setArchived(!archived)} type="button">
              {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
              {archived ? "Volver" : "Archivo"}
            </button>
          )}
          <button className="primary-button" onClick={() => setTitleForm("new")} type="button">
            <Plus size={17} /> Añadir título
          </button>
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
                const result = await run(() => mediaApi.increment(target.type, target.id, todayMadrid()));
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
              status={status}
              setStatus={setStatus}
              favoritesOnly={favoritesOnly}
              setFavoritesOnly={setFavoritesOnly}
              sort={librarySort}
              setSort={setLibrarySort}
              studios={studios}
              studio={studio}
              setStudio={setStudio}
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
          {view === "statistics" && statistics && (
            <StatisticsView statistics={statistics} open={openDetail} />
          )}
          {view === "history" && <HistoryView busy={busy} content={historyContent} entries={history} month={historyMonth} oldestFirst={historyOldestFirst} options={historyOptions} selected={historySelection} setContent={setHistoryContent} setMonth={setHistoryMonth} setOldestFirst={setHistoryOldestFirst} setTitle={setHistoryTitle} setYear={setHistoryYear} title={historyTitle} titles={historyTitles} year={historyYear} updateDate={async (id, date) => { if (await runAction(() => mediaApi.updateHistoryDate(id, date))) await load(false); }} deleteEntry={async (entry) => { if (!window.confirm("¿Eliminar esta visualización y actualizar el progreso?")) return; if (await runAction(() => mediaApi.deleteHistoryEntry(entry.id))) await load(false); }} />}
        </>
      )}

      {detail && (
        <MediaDetailView
          detail={detail}
          busy={busy}
          close={() => setDetail(null)}
          editTitle={() => setTitleForm("edit")}
          addContent={() => setContentForm("new")}
          editContent={setContentForm}
          increment={async (type, id) => {
            await mutateDetail(() => mediaApi.increment(type, id, todayMadrid()));
          }}
          setProgress={async (type, id, watched, date) => {
            await mutateDetail(() => mediaApi.setProgress(type, id, watched, date));
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
          updateContentStatus={async (content, status) => {
            await mutateDetail(() => mediaApi.updateContent(content.id, contentInput(content, { status })));
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
          openHistory={openHistory}
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
  items,
  busy,
  open,
  increment,
}: {
  items: MediaTitle[];
  busy: boolean;
  open: (id: string) => void;
  increment: (item: MediaTitle) => Promise<void>;
}) {
  return (
    <section className="media-view">
      <ViewHeading eyebrow="CONTINUAR" title="En curso" subtitle="Retoma lo último sin perder el hilo." />
      {items.length === 0 ? (
        <MediaEmpty text="No tienes ningún título marcado como Viendo." />
      ) : (
        <div className="watching-grid">
          {items.map((item) => {
            const target = item.kind === "movie" ? item.watchedUnits < 1 : Boolean(item.nextContent?.canIncrement);
            return (
              <article className="watching-card" key={item.id}>
                <button className="watching-open" onClick={() => open(item.id)} type="button">
                  <div className="watching-cover-wrap">
                    <CoverImage alt={`Portada de ${item.name}`} hasCover={item.hasCover} titleId={item.id} />
                    {item.kind === "anime" && item.catalogNumber && <span className="library-catalog-number">#{item.catalogNumber}</span>}
                    {item.favorite && <Star className="library-favorite" fill="currentColor" size={17} />}
                  </div>
                  <div className="watching-copy">
                    <span>{item.kind === "movie" ? "Película de anime" : "Anime"}</span>
                    <h3>{item.name}</h3>
                    <p>{item.kind === "movie" ? "Película independiente" : item.nextContent?.name ?? "Sin contenido pendiente"}</p>
                    <div className="watching-progress">
                      <strong>{progressLabel(item.progress)}</strong>
                      {(item.score ?? item.averageContentScore) !== null && <b className={`media-score-badge score-${scoreTone(item.score ?? item.averageContentScore)}`} style={{ color: scoreColor(item.score ?? item.averageContentScore) }}>{formatScore(item.score ?? item.averageContentScore)}</b>}
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
  status,
  setStatus,
  favoritesOnly,
  setFavoritesOnly,
  sort,
  setSort,
  studios,
  studio,
  setStudio,
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
  status: TrackingStatus | "";
  setStatus: (value: TrackingStatus | "") => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (value: boolean) => void;
  sort: LibrarySort;
  setSort: (value: LibrarySort) => void;
  studios: string[];
  studio: string;
  setStudio: (value: string) => void;
  items: MediaTitle[];
  open: (id: string) => void;
  busy: boolean;
  toggleFavorite: (item: MediaTitle) => Promise<void>;
  restore: (id: string) => Promise<void>;
  remove: (id: string, name: string) => Promise<void>;
}) {
  const sortedItems = useMemo(() => {
    const result = [...items];
    const score = (item: MediaTitle) => item.score ?? item.averageContentScore;
    result.sort((left, right) => {
      if (sort === "titleAsc") return left.name.localeCompare(right.name, "es");
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
  }, [items, sort]);

  return (
    <section className="media-view">
      <div className="library-heading-row">
        <ViewHeading
          eyebrow={archived ? "ARCHIVO" : "TU COLECCIÓN"}
          title={archived ? (section === "anime" ? "Anime archivado" : "Películas anime archivadas") : (section === "anime" ? "Biblioteca de anime" : "Películas anime")}
          subtitle={archived ? "Restaura o elimina definitivamente." : section === "anime" ? "Tus franquicias, con su catálogo y contenidos relacionados." : "Películas independientes que no pertenecen a una franquicia."}
        />
      </div>
      <div className="media-library-sections" role="tablist" aria-label="Tipo de biblioteca anime">
        <button className={section === "anime" ? "active" : ""} onClick={() => setSection("anime")} role="tab" type="button">Anime</button>
        <button className={section === "movies" ? "active" : ""} onClick={() => setSection("movies")} role="tab" type="button">Películas anime</button>
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
        <SelectControl>
          <select aria-label="Filtrar por estudio" onChange={(event) => setStudio(event.target.value)} value={studio}>
            <option value="">Todos los estudios</option>
            {studios.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </SelectControl>
        <SelectControl>
          <select aria-label="Ordenar biblioteca" onChange={(event) => setSort(event.target.value as LibrarySort)} value={sort}>
            {section === "anime" && <option value="catalogAsc">Catálogo (ascendente)</option>}
            {section === "anime" && <option value="catalogDesc">Catálogo (descendente)</option>}
            <option value="scoreDesc">Valoración (mayor primero)</option>
            <option value="scoreAsc">Valoración (menor primero)</option>
            <option value="titleAsc">Título (A–Z)</option>
          </select>
        </SelectControl>
        <button className={favoritesOnly ? "favorite-filter active" : "favorite-filter"} onClick={() => setFavoritesOnly(!favoritesOnly)} type="button">
          <Star fill={favoritesOnly ? "currentColor" : "none"} size={16} /> Favoritos
        </button>
      </div>
      {items.length === 0 ? (
        <MediaEmpty text={archived ? "El Archivo está vacío." : section === "anime" ? "No hay anime con estos filtros." : "No hay películas anime con estos filtros."} />
      ) : (
        <div className="library-grid">
          {sortedItems.map((item) => (
            <article className="library-card" key={item.id}>
              <button className="library-card-open" onClick={() => open(item.id)} type="button">
                <div className="library-cover-wrap">
                  <CoverImage alt={`Portada de ${item.name}`} hasCover={item.hasCover} titleId={item.id} />
                  {item.kind === "anime" && item.catalogNumber && <span className="library-catalog-number">#{item.catalogNumber}</span>}
                  <span className={`media-status status-${item.status}`}>{statusLabel(item.status)}</span>
                </div>
                <div className="library-card-copy">
                  <span>{item.kind === "movie" ? "Película de anime" : "Anime"}</span>
                  <h3>{item.name}</h3>
                  {item.alternativeTitle && <p>{item.alternativeTitle}</p>}
                  {item.genres.length > 0 && <p>{item.genres.join(", ")}</p>}
                  {item.studios.length > 0 && <p>{item.studios.join(", ")}</p>}
                  <div>
                    <strong>{progressLabel(item.progress)}</strong>
                    <b className={`media-score-badge score-${scoreTone(item.score ?? item.averageContentScore)}`} style={{ color: scoreColor(item.score ?? item.averageContentScore) }}>{formatScore(item.score ?? item.averageContentScore)}</b>
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
              {archived && (
                <div className="library-archive-actions">
                  <button disabled={busy} onClick={() => void restore(item.id)} type="button"><RotateCcw size={15} /> Restaurar</button>
                  <button disabled={busy} onClick={() => void remove(item.id, item.name)} type="button"><Trash2 size={15} /> Eliminar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatisticsView({ statistics, open }: { statistics: MediaStatistics; open: (id: string) => void }) {
  const [topLimit, setTopLimit] = useState<5 | 10 | 25>(5);
  return (
    <section className="media-view">
      <ViewHeading eyebrow="TU HISTORIAL" title="Estadísticas" subtitle="Solo tu actividad de anime y sus películas." />
      <div className="media-stat-grid">
        <Stat label="Títulos activos" value={statistics.activeTitles} />
        <Stat label="Episodios vistos" value={statistics.watchedEpisodes} />
        <Stat label="Películas vistas" value={statistics.completedMovies} />
        <Stat label="Sesiones" value={statistics.sessions} />
        <Stat color={scoreColor(statistics.averageScore)} label="Puntuación media" value={statistics.averageScore === null ? "—" : formatScore(statistics.averageScore)} />
      </div>
      <div className="media-stat-panels">
        <section className="media-stat-panel">
          <h3>Biblioteca</h3>
          <div className="media-kind-breakdown">
            <span><b>{statistics.animeTitles}</b> Franquicias</span>
            <span><b>{statistics.movieTitles}</b> Películas anime</span>
            <span><b>{statistics.activeTitles}</b> Total</span>
          </div>
          <div className="media-status-breakdown">
            {statistics.byStatus.map((item) => (
              <div key={item.status}><span>{statusLabel(item.status)}</span><strong>{item.count}</strong></div>
            ))}
          </div>
        </section>
        <section className="media-stat-panel">
          <div className="media-stat-panel-heading">
            <h3>Mis top anime</h3>
            <SelectControl>
              <select aria-label="Cantidad de animes del top" onChange={(event) => setTopLimit(Number(event.target.value) as 5 | 10 | 25)} value={topLimit}>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
              </select>
            </SelectControl>
          </div>
          {statistics.topTitles.length === 0 ? (
            <p className="media-muted">Puntúa algún título para verlo aquí.</p>
          ) : (
            <div className="media-top-list">
              {statistics.topTitles.slice(0, topLimit).map((item, index) => (
                <button key={item.id} onClick={() => open(item.id)} type="button">
                  <span>{index + 1}</span><strong>{item.name}</strong><b style={{ color: scoreColor(item.score) }}>{formatScore(item.score)}</b>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
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
      <ViewHeading eyebrow="TU ACTIVIDAD" title="Historial" subtitle="Qué viste y cuándo, episodio a episodio." />
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
  return <article className="media-global-history-row"><HistoryIcon size={16} /><div><strong>{description}</strong><span>{entry.contentName ? `${entry.titleName} (${entry.contentName})` : entry.titleName}</span></div><time>{formatDate(entry.watchedOn)}</time><input aria-label={`Fecha de ${description}`} disabled={busy} max={todayMadrid()} onChange={(event) => setDate(event.target.value)} type="date" value={date} /><button aria-label="Guardar fecha" className="media-history-save" disabled={busy || date === entry.watchedOn} onClick={() => void updateDate(date)} type="button">Guardar</button><button aria-label="Eliminar entrada" className="media-icon-button danger" disabled={busy || !entry.canDelete} onClick={() => void deleteEntry()} title={entry.canDelete ? "Eliminar y actualizar progreso" : "Solo puede eliminarse el último episodio"} type="button"><Trash2 size={15} /></button></article>;
}

function Tab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Film; label: string; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick} role="tab" type="button"><Icon size={16} /> {label}</button>;
}

function ViewHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="media-view-heading"><span>{eyebrow}</span><h2>{title}</h2><p>{subtitle}</p></header>;
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return <div className="media-stat-card"><span>{label}</span><strong style={{ color }}>{value}</strong></div>;
}

function MediaEmpty({ loading = false, text }: { loading?: boolean; text?: string }) {
  return <div className="media-empty"><Film size={28} /><strong>{loading ? "Cargando biblioteca…" : text}</strong>{!loading && <span>Añade o ajusta tus títulos cuando quieras.</span>}</div>;
}
