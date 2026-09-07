import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, BarChart3, BookOpen, CalendarDays, Edit3, History, ImagePlus, Library, Move, Plus, RotateCcw, Search,
  Star, Trash2, X,
} from "lucide-react";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import CoverCropEditor from "../ui/CoverCropEditor";
import FavoriteFilter from "../ui/FavoriteFilter";
import Modal from "../ui/Modal";
import ScoreTile from "../ui/ScoreTile";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import MediaStatisticsDashboard from "../ui/MediaStatisticsDashboard";
import FilterDisclosure from "../ui/FilterDisclosure";
import FilterBuilder from "../ui/FilterBuilder";
import MultiSelectControl from "../ui/MultiSelectControl";
import { useAppView } from "../ui/AppViewContext";
import { readDefaultSort, saveDefaultSort } from "../ui/sortPreference";
import { notifyCoverChanged } from "../ui/coverRefresh";
import { confirmInferredStatusChange } from "../ui/inferredStatus";
import { pastedCoverAsJpeg } from "../ui/pastedCover";
import { formatScore, scoreColor } from "../ui/score";
import type { PendingReadingCover, ReadingBook, ReadingBookInput, ReadingDetail, ReadingHistoryEntry, ReadingRun, ReadingRunInput, ReadingStatus } from "./api";
import { readingApi, readingErrorMessage } from "./api";
import { formatReadingDate, readingStatusLabel, readingStatuses, readingToday } from "./presentation";
import "./reading.css";
import ReadingCoverImage from "./ReadingCoverImage";

type View = "current" | "library" | "history" | "statistics";
type Sort = "updated" | "title" | "author" | "score" | "startAsc" | "startDesc" | "finishAsc" | "finishDesc";
const readingSorts: readonly Sort[] = ["title", "updated", "author", "score", "startDesc", "startAsc", "finishDesc", "finishAsc"];
const readingSortStorageKey = "nubeos.reading.sort.default.v3";

const emptyInput: ReadingBookInput = {
  title: "", author: "", genres: [], status: "pending", score: null,
  opinion: null, favorite: false, startedOn: null, finishedOn: null, coverToken: null, removeCover: false,
};

const readingGenres = [
  "Fantasía", "Ciencia ficción", "Ficción contemporánea", "Ficción literaria", "Realismo mágico", "Distopía",
  "Romance", "Misterio y suspense", "Policíaca y crimen", "Terror", "Aventura", "Novela histórica", "Clásicos",
  "Juvenil", "Cuentos", "Poesía", "Teatro", "Humor", "Ensayo", "Biografía y memorias", "Filosofía", "No ficción",
  "Desarrollo personal", "Psicología", "Otro",
];

function bookInputWithStatus(book: ReadingBook, status: ReadingStatus): ReadingBookInput {
  return { title: book.title, author: book.author, genres: book.genres, status, score: book.score, opinion: book.opinion, favorite: book.favorite, startedOn: book.startedOn, finishedOn: book.finishedOn, coverToken: null, removeCover: false };
}

export default function ReadingWorkspace() {
  const [view, setView] = useState<View>("library");
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [allHistory, setAllHistory] = useState<ReadingHistoryEntry[]>([]);
  const [historyYears, setHistoryYears] = useState<string[]>([]);
  const [historyBook, setHistoryBook] = useState("");
  const [historyYear, setHistoryYear] = useState("");
  const [archived, setArchived] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");
  const [libraryStatuses, setLibraryStatuses] = useState<ReadingStatus[]>([]);
  const [libraryGenre, setLibraryGenre] = useState("");
  const [libraryScore, setLibraryScore] = useState<"" | "scored" | "unscored">("");
  const [scoreMinimum, setScoreMinimum] = useState("");
  const [scoreMaximum, setScoreMaximum] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [startedYear, setStartedYear] = useState("");
  const [finishedYear, setFinishedYear] = useState("");
  const [readingCount, setReadingCount] = useState<"" | "none" | "one" | "multiple">("");
  const [currentGenre, setCurrentGenre] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collectionPanel, setCollectionPanel] = useState<"filters" | "sort" | null>(null);
  const [defaultSort, setDefaultSort] = useState<Sort>(() => readDefaultSort(readingSortStorageKey, "title", readingSorts));
  const [sort, setSort] = useState<Sort>(() => readDefaultSort(readingSortStorageKey, "title", readingSorts));
  const [selected, setSelected] = useState<ReadingDetail | null>(null);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [runForm, setRunForm] = useState<{ bookId: string; run?: ReadingRun } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const currentFilters = view === "current";
  const search = currentFilters ? currentSearch : librarySearch;
  const statuses: ReadingStatus[] = currentFilters ? ["reading"] : libraryStatuses;
  const genre = currentFilters ? currentGenre : libraryGenre;
  const setSearch = currentFilters ? setCurrentSearch : setLibrarySearch;
  const setGenre = currentFilters ? setCurrentGenre : setLibraryGenre;
  const runsByBook = useMemo(() => {
    const counts = new Map<string, number>();
    allHistory.forEach((entry) => counts.set(entry.run.bookId, (counts.get(entry.run.bookId) ?? 0) + 1));
    return counts;
  }, [allHistory]);
  const authorOptions = useMemo(() => [...new Set(books.map((book) => book.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [books]);

  const load = useCallback(async (showLoading = false) => {
    const id = ++requestId.current;
    if (showLoading) setLoading(true);
    try {
      const [items, entries, entriesForYears] = await Promise.all([
        readingApi.list({ archived }),
        readingApi.history({ bookId: historyBook || null, year: historyYear ? Number(historyYear) : null }),
        readingApi.history({}),
      ]);
      if (id === requestId.current) {
        setBooks(items);
        setHistory(entries);
        setAllHistory(entriesForYears);
        setHistoryYears([...new Set(entriesForYears.flatMap((entry) => [entry.run.finishedOn, entry.run.startedOn]).filter(Boolean).map((date) => date!.slice(0, 4)))].sort().reverse());
        setError(null);
      }
    } catch (reason) {
      if (id === requestId.current) setError(readingErrorMessage(reason));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [archived, historyBook, historyYear]);

  useEffect(() => { void load(true); return () => { requestId.current += 1; }; }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    const filtered = books.filter((book) =>
      (view !== "current" || book.status === "reading")
      && (!query || book.title.toLocaleLowerCase("es").includes(query) || book.author.toLocaleLowerCase("es").includes(query))
      && (statuses.length === 0 || statuses.includes(book.status))
      && (!genre || book.genres.includes(genre))
      && (!authorFilter || book.author === authorFilter)
      && (!startedYear || book.startedOn?.startsWith(startedYear))
      && (!finishedYear || book.finishedOn?.startsWith(finishedYear))
      && (!libraryScore || (libraryScore === "unscored" ? book.score === null : book.score !== null))
      && (!scoreMinimum || (book.score !== null && book.score >= Number(scoreMinimum)))
      && (!scoreMaximum || (book.score !== null && book.score <= Number(scoreMaximum)))
      && (!readingCount || (readingCount === "none" ? !runsByBook.get(book.id) : readingCount === "one" ? runsByBook.get(book.id) === 1 : (runsByBook.get(book.id) ?? 0) >= 2))
      && (!favoritesOnly || book.favorite));
    return filtered.sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, "es");
      if (sort === "author") return left.author.localeCompare(right.author, "es") || left.title.localeCompare(right.title, "es");
      if (sort === "score") return (right.score ?? -1) - (left.score ?? -1) || left.title.localeCompare(right.title, "es");
      if (sort.startsWith("start") || sort.startsWith("finish")) {
        const first = sort.startsWith("start") ? left.startedOn : left.finishedOn;
        const second = sort.startsWith("start") ? right.startedOn : right.finishedOn;
        if (!first) return second ? 1 : left.title.localeCompare(right.title, "es");
        if (!second) return -1;
        return (sort.endsWith("Asc") ? first.localeCompare(second) : second.localeCompare(first)) || left.title.localeCompare(right.title, "es");
      }
      return right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, "es");
    });
  }, [authorFilter, books, favoritesOnly, finishedYear, genre, libraryScore, readingCount, runsByBook, scoreMaximum, scoreMinimum, search, sort, startedYear, statuses, view]);

  async function action(operation: () => Promise<unknown>) {
    setBusy(true);
    try { await operation(); setError(null); await load(false); return true; }
    catch (reason) { setError(readingErrorMessage(reason)); return false; }
    finally { setBusy(false); }
  }

  function showArchive() {
    setArchived((value) => !value);
    setSelected(null);
    setLibrarySearch(""); setLibraryStatuses([]); setLibraryGenre(""); setLibraryScore(""); setScoreMinimum(""); setScoreMaximum(""); setAuthorFilter(""); setStartedYear(""); setFinishedYear(""); setReadingCount(""); setFavoritesOnly(false);
  }

  async function openBook(id: string) { setBusy(true); try { setSelected(await readingApi.get(id)); } catch (reason) { setError(readingErrorMessage(reason)); } finally { setBusy(false); } }

  async function mutateRunKeepingChoice(book: ReadingDetail, operation: () => Promise<ReadingDetail>) {
    let detail = await operation();
    if (detail.status !== book.status && !await confirmInferredStatusChange(book.title, readingStatusLabel(book.status), readingStatusLabel(detail.status))) {
      await readingApi.update(book.id, bookInputWithStatus(detail, book.status));
      detail = await readingApi.get(book.id);
    }
    return detail;
  }

  async function registerRunKeepingChoice(book: ReadingDetail, input: ReadingRunInput) {
    return mutateRunKeepingChoice(book, () => readingApi.createRun(book.id, input));
  }

  const collectionActions = <div className="reading-header-actions">
    <button className="reading-text-action" onClick={showArchive} type="button">{archived ? <RotateCcw size={16} /> : <Archive size={16} />}{archived ? "Volver" : "Archivo"}</button>
    {!archived && <button className="primary-button" onClick={() => setForm("new")} type="button"><Plus size={17} /> Añadir libro</button>}
  </div>;

  const pageTitle = archived
    ? "Archivo"
    : view === "current"
      ? "Leyendo"
      : view === "history"
        ? "Historial"
        : view === "statistics"
          ? "Estadísticas"
          : "Biblioteca";
  useAppView(pageTitle);
  const activeFilterCount = Number(view === "library" && libraryStatuses.length > 0)
    + Number(Boolean(genre))
    + Number(Boolean(libraryScore)) + Number(Boolean(scoreMinimum)) + Number(Boolean(scoreMaximum))
    + Number(Boolean(authorFilter)) + Number(Boolean(startedYear)) + Number(Boolean(finishedYear)) + Number(Boolean(readingCount));

  return (
    <section className="reading-workspace">
      <header className="entertainment-page-header">
        <h1 className="entertainment-module-title">Lectura</h1>
        <div className="entertainment-navigation-row">
          <nav aria-label="Vistas de Lectura" className="reading-tabs">
            <button aria-current={!archived && view === "library" ? "page" : undefined} className={!archived && view === "library" ? "active" : ""} onClick={() => { setView("library"); setArchived(false); }} type="button"><Library aria-hidden="true" size={16} /> Biblioteca</button>
            <button aria-current={!archived && view === "current" ? "page" : undefined} className={!archived && view === "current" ? "active" : ""} onClick={() => { setView("current"); setArchived(false); }} type="button"><BookOpen aria-hidden="true" size={16} /> Leyendo</button>
            <button aria-current={!archived && view === "history" ? "page" : undefined} className={!archived && view === "history" ? "active" : ""} onClick={() => { setView("history"); setArchived(false); }} type="button"><History aria-hidden="true" size={16} /> Historial</button>
            <button aria-current={!archived && view === "statistics" ? "page" : undefined} className={!archived && view === "statistics" ? "active" : ""} onClick={() => { setView("statistics"); setArchived(false); }} type="button"><BarChart3 aria-hidden="true" size={16} /> Estadísticas</button>
          </nav>
          {collectionActions}
        </div>
      </header>

      {error && <div className="reading-error" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={15} /></button></div>}

      {view === "statistics" && !archived ? (
        <Statistics books={books} entries={allHistory} open={(id) => void openBook(id)} showUnscored={() => { setLibraryScore("unscored"); setView("library"); setArchived(false); }} />
      ) : view === "history" && !archived ? (
        <ReadingHistory entries={history} books={books} bookId={historyBook} year={historyYear} years={historyYears} setBookId={setHistoryBook} setYear={setHistoryYear} edit={(entry) => setRunForm({ bookId: entry.run.bookId, run: entry.run })} remove={(entry) => { if (window.confirm(`¿Eliminar esta lectura de “${entry.bookTitle}”?`)) void action(async () => { const book = await readingApi.get(entry.run.bookId); await mutateRunKeepingChoice(book, () => readingApi.deleteRun(entry.run.id)); }); }} />
      ) : (
        <>
          <div className={`reading-filters${view !== "library" || archived ? " without-favorite" : ""}`}>
            <label className="reading-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título o autor" value={search} /></label>
            {view === "library" && !archived && <FavoriteFilter active={favoritesOnly} onChange={setFavoritesOnly} />}
            <FilterDisclosure change={setCollectionPanel} controlsId="reading-library-filters" count={activeFilterCount} open={collectionPanel} sortActive={sort !== "title"} />
            {collectionPanel && <FilterBuilder id="reading-library-filters" mode={collectionPanel} filters={[
              ...(view === "library" ? [{ id: "status", label: "Estado", active: libraryStatuses.length > 0, clear: () => setLibraryStatuses([]), control: <MultiSelectControl label="Todos los estados" onChange={setLibraryStatuses} options={readingStatuses} value={libraryStatuses} /> }] : []),
              { id: "genre", label: "Género", active: Boolean(genre), clear: () => setGenre(""), control: <SelectControl><select aria-label="Filtrar por género" onChange={(event) => setGenre(event.target.value)} value={genre}><option value="">Todos los géneros</option>{readingGenres.map((item) => <option key={item} value={item}>{item}</option>)}</select></SelectControl> },
              { id: "author", label: "Autor", active: Boolean(authorFilter), clear: () => setAuthorFilter(""), control: <SelectControl><select aria-label="Filtrar por autor" onChange={(event) => setAuthorFilter(event.target.value)} value={authorFilter}><option value="">Todos los autores</option>{authorOptions.map((author) => <option key={author}>{author}</option>)}</select></SelectControl> },
              { id: "score", label: "Puntuación", active: Boolean(libraryScore), clear: () => setLibraryScore(""), control: <SelectControl><select aria-label="Filtrar por disponibilidad de puntuación" onChange={(event) => setLibraryScore(event.target.value as "" | "scored" | "unscored")} value={libraryScore}><option value="">Todas las puntuaciones</option><option value="scored">Solo puntuadas</option><option value="unscored">Sin puntuar</option></select></SelectControl> },
              { id: "score-min", label: "Puntuación mínima", active: Boolean(scoreMinimum), clear: () => setScoreMinimum(""), control: <SelectControl><select aria-label="Puntuación mínima" onChange={(event) => setScoreMinimum(event.target.value)} value={scoreMinimum}><option value="">Cualquiera</option>{[5,6,7,8,9].map((value) => <option key={value} value={value}>{value} o más</option>)}</select></SelectControl> },
              { id: "score-max", label: "Puntuación máxima", active: Boolean(scoreMaximum), clear: () => setScoreMaximum(""), control: <SelectControl><select aria-label="Puntuación máxima" onChange={(event) => setScoreMaximum(event.target.value)} value={scoreMaximum}><option value="">Cualquiera</option>{[5,6,7,8,9].map((value) => <option key={value} value={value}>{value} o menos</option>)}</select></SelectControl> },
              { id: "start-year", label: "Año de inicio", active: Boolean(startedYear), clear: () => setStartedYear(""), control: <SelectControl><select aria-label="Filtrar por año de inicio" onChange={(event) => setStartedYear(event.target.value)} value={startedYear}><option value="">Cualquier año</option>{historyYears.map((year) => <option key={year}>{year}</option>)}</select></SelectControl> },
              { id: "finish-year", label: "Año de finalización", active: Boolean(finishedYear), clear: () => setFinishedYear(""), control: <SelectControl><select aria-label="Filtrar por año de finalización" onChange={(event) => setFinishedYear(event.target.value)} value={finishedYear}><option value="">Cualquier año</option>{historyYears.map((year) => <option key={year}>{year}</option>)}</select></SelectControl> },
              { id: "readings", label: "Número de lecturas", active: Boolean(readingCount), clear: () => setReadingCount(""), control: <SelectControl><select aria-label="Filtrar por número de lecturas" onChange={(event) => setReadingCount(event.target.value as "" | "none" | "one" | "multiple")} value={readingCount}><option value="">Cualquier cantidad</option><option value="none">Sin lecturas</option><option value="one">Leído una vez</option><option value="multiple">Releído</option></select></SelectControl> },
            ]} sortControl={<SelectControl><select aria-label="Ordenar libros" onChange={(event) => setSort(event.target.value as Sort)} value={sort}><option value="title">Título (A–Z)</option><option value="updated">Actualizados recientemente</option><option value="author">Autor (A–Z)</option><option value="score">Mejor puntuación</option><option value="startDesc">Inicio (más reciente)</option><option value="startAsc">Inicio (más antiguo)</option><option value="finishDesc">Finalización (más reciente)</option><option value="finishAsc">Finalización (más antigua)</option></select></SelectControl>} sortPreference={{ isDefault: sort === defaultSort, isFallback: sort === "title", save: () => { saveDefaultSort(readingSortStorageKey, sort); setDefaultSort(sort); } }} />}
          </div>
          {loading ? <Empty text="Cargando libros…" /> : visible.length === 0 ? <Empty text={archived ? "El Archivo está vacío." : view === "current" ? "No tienes ningún libro en lectura." : "Todavía no has añadido ningún libro."} /> : (
            <div className="reading-grid">
              {visible.map((book) => <BookCard
                archived={archived} book={book} busy={busy} key={book.id}
                open={() => void openBook(book.id)}
                favorite={() => void action(async () => { const updated = await readingApi.favorite(book.id, !book.favorite); if (selected?.id === updated.id) setSelected(await readingApi.get(updated.id)); })}
                restore={() => void action(() => readingApi.restore(book.id))}
                remove={() => { if (window.confirm(`¿Eliminar definitivamente “${book.title}”?`)) void action(() => readingApi.delete(book.id)); }}
              />)}
            </div>
          )}
        </>
      )}

      {selected && <BookDetail
        archived={archived} book={selected} busy={busy} close={() => setSelected(null)} edit={() => setForm("edit")}
        favorite={() => void action(async () => { await readingApi.favorite(selected.id, !selected.favorite); setSelected(await readingApi.get(selected.id)); })}
        archive={() => void action(() => readingApi.archive(selected.id)).then((ok) => { if (ok) setSelected(null); })}
        restore={() => void action(() => readingApi.restore(selected.id)).then((ok) => { if (ok) setSelected(null); })}
        start={() => void action(async () => setSelected(await registerRunKeepingChoice(selected, { startedOn: readingToday(), finishedOn: null, completed: false })))}
        finish={(run) => void action(async () => setSelected(await mutateRunKeepingChoice(selected, () => readingApi.finishRun(run.id, readingToday()))))}
        addRun={() => setRunForm({ bookId: selected.id })}
        editRun={(run) => setRunForm({ bookId: selected.id, run })}
        deleteRun={(run) => { if (window.confirm("¿Eliminar esta lectura del historial?")) void action(async () => setSelected(await mutateRunKeepingChoice(selected, () => readingApi.deleteRun(run.id)))); }}
        setCoverCrop={async (x, y, zoom) => action(async () => { await readingApi.setCoverCrop(selected.id, x, y, zoom); setSelected(await readingApi.get(selected.id)); })}
      />}
      {form && <BookForm
        authors={[...new Set(books.map((book) => book.author.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right, "es"))}
        book={form === "edit" ? selected : null} busy={busy} close={() => setForm(null)}
        save={async (input) => {
          setBusy(true);
          try {
            const saved = form === "edit" && selected ? await readingApi.update(selected.id, input) : await readingApi.create(input);
            if (form === "edit") setSelected(await readingApi.get(saved.id));
            setError(null); await load(false); return true;
          } catch (reason) { setError(readingErrorMessage(reason)); return false; }
          finally { setBusy(false); }
        }}
      />}
      {runForm && <ReadingRunForm run={runForm.run ?? null} busy={busy} close={() => setRunForm(null)} save={async (input) => action(async () => { const book = selected?.id === runForm.bookId ? selected : await readingApi.get(runForm.bookId); const detail = await mutateRunKeepingChoice(book, () => runForm.run ? readingApi.updateRun(runForm.run.id, input) : readingApi.createRun(runForm.bookId, input)); if (selected?.id === detail.id) setSelected(detail); })} />}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="reading-empty"><BookOpen size={28} /><strong>{text}</strong></div>; }

function BookCard({ book, archived, busy, open, favorite, restore, remove }: { book: ReadingBook; archived: boolean; busy: boolean; open: () => void; favorite: () => void; restore: () => void; remove: () => void }) {
  return <article className="reading-card">
    <button className="reading-card-open" onClick={open} type="button">
      <ReadingCoverImage alt={`Portada de ${book.title}`} bookId={book.id} hasCover={book.hasCover} positionX={book.coverPositionX} positionY={book.coverPositionY} zoom={book.coverZoom} />
      <div className="reading-card-content">
        <div className="reading-card-heading"><span className={`reading-status status-${book.status}`}>{readingStatusLabel(book.status)}</span><h3>{book.title}</h3><p>{book.author}</p></div>
        <div className="reading-genres">{book.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>
        <div className="reading-card-footer">
          <div className="reading-card-dates">
            <div><small>Inicio</small><strong>{formatReadingDate(book.startedOn)}</strong></div>
            <div><small>Fin</small><strong>{formatReadingDate(book.finishedOn)}</strong></div>
          </div>
          <ScoreTile className="reading-score" score={book.score} />
        </div>
      </div>
    </button>
    {!archived && <button aria-label={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`reading-card-favorite${book.favorite ? " active" : ""}`} disabled={busy} onClick={favorite} title={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={book.favorite ? "currentColor" : "none"} size={18} /></button>}
    {archived && <ArchiveItemActions busy={busy} itemLabel={book.title} remove={remove} restore={restore} />}
  </article>;
}

function BookDetail({ book, archived, busy, close, edit, favorite, archive, restore, start, finish, addRun, editRun, deleteRun, setCoverCrop }: { book: ReadingDetail; archived: boolean; busy: boolean; close: () => void; edit: () => void; favorite: () => void; archive: () => void; restore: () => void; start: () => void; finish: (run: ReadingRun) => void; addRun: () => void; editRun: (run: ReadingRun) => void; deleteRun: (run: ReadingRun) => void; setCoverCrop: (x: number, y: number, zoom: number) => Promise<boolean> }) {
  const openRun = book.runs.find((run) => !run.finishedOn);
  const [detailView, setDetailView] = useState<"summary" | "history">("summary");
  const [positioningCover, setPositioningCover] = useState(false);
  return <><Modal className="reading-detail-modal" labelledBy="reading-detail-title" onClose={close}>
    <div className="reading-detail-header"><div className="reading-detail-cover-wrap ui-cover-adjust-host"><ReadingCoverImage alt={`Portada de ${book.title}`} bookId={book.id} className="detail" hasCover={book.hasCover} positionX={book.coverPositionX} positionY={book.coverPositionY} zoom={book.coverZoom} />{!archived && book.hasCover && <button aria-label="Ajustar encuadre de portada" className="ui-cover-adjust-button" onClick={() => setPositioningCover(true)} type="button"><Move size={14} /> Ajustar</button>}</div><div className="reading-detail-title"><span>LIBRO</span><h2 id="reading-detail-title">{book.title}</h2><p>{book.author}</p></div><div>{!archived && <button aria-label={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`reading-icon-action reading-favorite-action${book.favorite ? " active" : ""}`} disabled={busy} onClick={favorite} title={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={book.favorite ? "currentColor" : "none"} size={17} /></button>}<button aria-label="Editar libro" className="reading-icon-action" onClick={edit} title="Editar" type="button"><Edit3 size={17} /></button><button aria-label={archived ? "Restaurar libro" : "Archivar libro"} className="reading-icon-action" disabled={busy} onClick={archived ? restore : archive} title={archived ? "Restaurar" : "Archivar"} type="button">{archived ? <RotateCcw size={17} /> : <Archive size={17} />}</button><button aria-label="Cerrar" className="reading-icon-action" onClick={close} title="Cerrar" type="button"><X size={18} /></button></div></div>
    <TrackerDetailTabs onChange={setDetailView} value={detailView} />
    {detailView === "summary" ? <><TrackerMetricGrid metrics={[{ label: "Puntuación", value: formatScore(book.score), score: book.score }, { label: "Lecturas", value: book.runs.length }, { label: "Estado", value: readingStatusLabel(book.status) }]} /><section className="reading-detail-section"><h3>Géneros</h3><div className="reading-genres">{book.genres.length ? book.genres.map((genre) => <span key={genre}>{genre}</span>) : <p>Sin géneros</p>}</div></section><section className="reading-detail-section"><h3>Opinión</h3><p>{book.opinion || "Todavía no has escrito una opinión."}</p></section></> : <section className="reading-detail-section reading-runs"><header><strong className="tracker-history-count"><History size={17} /> {book.runs.length} {book.runs.length === 1 ? "lectura registrada" : "lecturas registradas"}</strong>{!archived && <div>{openRun ? <button className="secondary-button" disabled={busy} onClick={() => finish(openRun)} type="button">Terminar hoy</button> : <button className="secondary-button" disabled={busy} onClick={start} type="button"><BookOpen size={16} /> Empezar hoy</button>}<button className="primary-button" onClick={addRun} type="button"><Plus size={16} /> Registrar lectura</button></div>}</header>{book.runs.length === 0 ? <p>No hay lecturas registradas.</p> : <div className="reading-run-list">{book.runs.map((run, index) => <article key={run.id}><div><strong>{run.finishedOn ? `Lectura ${book.runs.length - index}` : "Lectura actual"}{run.finishedOn && !run.completed && <span className="tracker-run-incomplete">Sin terminar</span>}</strong><span>{formatReadingDate(run.startedOn)} → {run.finishedOn ? formatReadingDate(run.finishedOn) : "En curso"}</span></div>{!archived && <div><button className="reading-icon-action" onClick={() => editRun(run)} title="Editar" type="button"><Edit3 size={15} /></button><button className="reading-icon-action" onClick={() => deleteRun(run)} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}</section>}
  </Modal>{positioningCover && <CoverCropEditor busy={busy} close={() => setPositioningCover(false)} initial={{ x: book.coverPositionX, y: book.coverPositionY, zoom: book.coverZoom }} landscape={false} preview={(crop) => <ReadingCoverImage alt={`Portada de ${book.title}`} bookId={book.id} hasCover={book.hasCover} positionX={crop.x} positionY={crop.y} zoom={crop.zoom} />} save={(crop) => setCoverCrop(crop.x, crop.y, crop.zoom)} title={book.title} />}</>;
}

function BookForm({ book, authors, busy, close, save }: { book: ReadingBook | null; authors: string[]; busy: boolean; close: () => void; save: (input: ReadingBookInput) => Promise<boolean> }) {
  const initial = useMemo<ReadingBookInput>(() => book ? { title: book.title, author: book.author, genres: book.genres, status: book.status, score: book.score, opinion: book.opinion, favorite: book.favorite, startedOn: book.startedOn, finishedOn: book.finishedOn, coverToken: null, removeCover: false } : emptyInput, [book]);
  const [draft, setDraft] = useState(initial);
  const [cover, setCover] = useState<PendingReadingCover | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial) || cover !== null;
  async function discardPending() { if (cover) await readingApi.discardCover(cover.token).catch(() => undefined); }
  function requestClose() { if (!changed || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) { void discardPending(); close(); } }
  async function selectCover() { setCoverBusy(true); try { const selected = await readingApi.selectCover(); if (!selected) return; await discardPending(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } finally { setCoverBusy(false); } }
  async function pasteCover(event: React.ClipboardEvent<HTMLElement>) { setCoverBusy(true); try { const bytes = await pastedCoverAsJpeg(event); if (!bytes) return; const selected = await readingApi.preparePastedCover(bytes); await discardPending(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } catch (reason) { window.alert(readingErrorMessage(reason)); } finally { setCoverBusy(false); } }
  function toggleGenre(value: string) { setDraft({ ...draft, genres: draft.genres.includes(value) ? draft.genres.filter((item) => item !== value) : [...draft.genres, value] }); }
  return <Modal className="reading-form-modal" labelledBy="reading-form-title" onClose={requestClose}>
    <form onSubmit={async (event) => { event.preventDefault(); const ok = await save(draft); if (ok) { if (book && (cover || draft.removeCover)) notifyCoverChanged(book.id); setCover(null); close(); } }}>
      <div className="reading-form-header"><div><h2 id="reading-form-title">{book ? "Editar libro" : "Añadir libro"}</h2><p>Biblioteca personal</p></div><button aria-label="Cerrar" className="reading-icon-action" onClick={requestClose} type="button"><X size={18} /></button></div>
      <fieldset><legend>Identificación</legend><div className="reading-form-grid"><label>Título<input autoFocus onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Título del libro" required value={draft.title} /></label><label>Autor<input list="reading-author-suggestions" onChange={(event) => setDraft({ ...draft, author: event.target.value })} placeholder="Nombre del autor" required value={draft.author} /><datalist id="reading-author-suggestions">{authors.map((author) => <option key={author} value={author} />)}</datalist></label><div className="reading-genre-field wide"><span>Géneros</span><div>{readingGenres.map((item) => <button className={draft.genres.includes(item) ? "active" : ""} key={item} onClick={() => toggleGenre(item)} type="button">{item}</button>)}</div></div></div></fieldset>
      <fieldset><legend>Seguimiento</legend><div className="reading-form-grid"><label>Estado<SelectControl><select onChange={(event) => setDraft({ ...draft, status: event.target.value as ReadingStatus })} value={draft.status}>{readingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl></label><label>Puntuación (opcional)<div className="reading-score-input" style={{ color: scoreColor(draft.score) }}><input inputMode="decimal" max={10} min={0} onChange={(event) => setDraft({ ...draft, score: event.target.value === "" ? null : event.target.valueAsNumber })} placeholder="8,5" step={0.1} type="number" value={draft.score ?? ""} /><span>/ 10</span></div></label><label>Favorito<button aria-pressed={draft.favorite} className={`media-form-favorite${draft.favorite ? " active" : ""}`} onClick={() => setDraft({ ...draft, favorite: !draft.favorite })} type="button"><Star fill={draft.favorite ? "currentColor" : "none"} size={18} />{draft.favorite ? "En favoritos" : "Añadir a favoritos"}</button></label></div><p className="reading-form-hint">Las fechas se gestionan como lecturas independientes desde el detalle del libro.</p></fieldset>
      <fieldset><legend>Opinión</legend><label><textarea onChange={(event) => setDraft({ ...draft, opinion: event.target.value || null })} placeholder="Qué te pareció..." rows={3} value={draft.opinion ?? ""} /></label></fieldset>
      <fieldset><legend>Portada</legend><div className="reading-cover-field" onPaste={(event) => void pasteCover(event)} tabIndex={0}><div>{cover ? cover.originalName : book?.hasCover && !draft.removeCover ? "Portada actual guardada" : "Sin portada"}<span>Elige una imagen o pégala aquí con Ctrl+V. Se guardará como JPEG.</span></div><button className="secondary-button" disabled={coverBusy} onClick={() => void selectCover()} type="button"><ImagePlus size={16} /> {coverBusy ? "Preparando…" : "Elegir imagen"}</button>{(book?.hasCover || cover) && !draft.removeCover && <button aria-label="Quitar portada" className="reading-icon-action" onClick={() => { if (cover) void readingApi.discardCover(cover.token).catch(() => undefined); setCover(null); setDraft({ ...draft, coverToken: null, removeCover: Boolean(book?.hasCover) }); }} title="Quitar portada" type="button"><Trash2 size={16} /></button>}</div></fieldset>
      <div className="reading-form-footer"><button className="secondary-button" onClick={requestClose} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  </Modal>;
}

function ReadingRunForm({ run, busy, close, save }: { run: ReadingRun | null; busy: boolean; close: () => void; save: (input: ReadingRunInput) => Promise<boolean> }) {
  const initial = useMemo<ReadingRunInput>(() => ({ startedOn: run?.startedOn ?? null, finishedOn: run?.finishedOn ?? null, completed: run?.completed ?? false }), [run]);
  const [draft, setDraft] = useState(initial);
  return <Modal className="reading-run-modal" labelledBy="reading-run-title" onClose={close}><form onSubmit={async (event) => { event.preventDefault(); if (await save(draft)) close(); }}><div className="reading-form-header"><div><h2 id="reading-run-title">{run ? "Editar lectura" : "Registrar lectura"}</h2><p>La fecha final cierra el periodo; no implica necesariamente terminar el libro.</p></div><button className="reading-icon-action" onClick={close} type="button"><X size={18} /></button></div><div className="reading-form-grid"><label>Fecha de inicio<SmartDateInput max={readingToday()} onChange={(value) => setDraft({ ...draft, startedOn: value || null })} required value={draft.startedOn ?? ""} /></label><label>Fecha final (opcional)<SmartDateInput max={readingToday()} min={draft.startedOn ?? undefined} onChange={(value) => { const finishedOn = value || null; setDraft({ ...draft, finishedOn, completed: Boolean(finishedOn) }); }} value={draft.finishedOn ?? ""} /></label></div>{draft.finishedOn && <label className="tracker-run-completion" title="El periodo quedará cerrado y se sugerirá marcar el libro como Pausado."><input checked={!draft.completed} onChange={(event) => setDraft({ ...draft, completed: !event.target.checked })} type="checkbox" /><span>No terminé el libro</span></label>}<div className="reading-form-footer"><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={busy || !draft.startedOn} type="submit">Guardar</button></div></form></Modal>;
}

function ReadingHistory({ entries, books, bookId, year, years, setBookId, setYear, edit, remove }: { entries: ReadingHistoryEntry[]; books: ReadingBook[]; bookId: string; year: string; years: string[]; setBookId: (value: string) => void; setYear: (value: string) => void; edit: (entry: ReadingHistoryEntry) => void; remove: (entry: ReadingHistoryEntry) => void }) {
  return <div><div className="reading-history-filters"><SelectControl><select onChange={(event) => setBookId(event.target.value)} value={bookId}><option value="">Todos los libros</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></SelectControl><SelectControl><select onChange={(event) => setYear(event.target.value)} value={year}><option value="">Todos los años</option>{years.map((item) => <option key={item}>{item}</option>)}</select></SelectControl></div>{entries.length === 0 ? <Empty text="Todavía no hay lecturas en el historial." /> : <div className="reading-history-list">{entries.map((entry) => <article key={entry.run.id}><CalendarDays size={18} /><div><strong>{entry.bookTitle}{entry.run.finishedOn && !entry.run.completed && <span className="tracker-run-incomplete">Sin terminar</span>}</strong><span>{entry.bookAuthor} · {formatReadingDate(entry.run.startedOn)} → {entry.run.finishedOn ? formatReadingDate(entry.run.finishedOn) : "En curso"}</span></div><div><button className="reading-icon-action" onClick={() => edit(entry)} title="Editar" type="button"><Edit3 size={15} /></button><button className="reading-icon-action" onClick={() => remove(entry)} title="Eliminar" type="button"><Trash2 size={15} /></button></div></article>)}</div>}</div>;
}

function Statistics({ books, entries, open, showUnscored }: { books: ReadingBook[]; entries: ReadingHistoryEntry[]; open: (id: string) => void; showUnscored: () => void }) {
  return <div className="reading-statistics"><MediaStatisticsDashboard
    calendarPeriods
    refined
    items={books.map((book) => ({ id: book.id, name: book.title, detail: book.author, status: book.status, statusLabel: readingStatusLabel(book.status), score: book.score, favorite: book.favorite, genres: book.genres, startedOn: book.startedOn, finishedOn: book.finishedOn }))}
    noun="Libros"
    openItem={open}
    showUnscored={showUnscored}
    sessions={entries.map((entry) => ({ id: entry.run.id, itemId: entry.run.bookId, startedOn: entry.run.startedOn, finishedOn: entry.run.finishedOn, completed: entry.run.completed }))}
    storageKey="nubeos.reading.statistics"
    unitLabel="Sesiones de lectura"
  /></div>;
}
