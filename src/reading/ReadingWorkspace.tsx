import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, BarChart3, BookOpen, Edit3, ImagePlus, Library, Plus, RotateCcw, Search,
  Star, Trash2, X,
} from "lucide-react";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import FavoriteFilter from "../ui/FavoriteFilter";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import { formatScore, scoreColor } from "../ui/score";
import type { PendingReadingCover, ReadingBook, ReadingBookInput, ReadingStatistics, ReadingStatus } from "./api";
import { readingApi, readingErrorMessage } from "./api";
import { formatReadingDate, readingStatusLabel, readingStatuses } from "./presentation";
import "./reading.css";
import ReadingCoverImage from "./ReadingCoverImage";

type View = "current" | "library" | "statistics";
type Sort = "updated" | "title" | "author" | "score";

const emptyInput: ReadingBookInput = {
  title: "", author: "", genres: [], status: "pending", score: null,
  opinion: null, favorite: false, startedOn: null, finishedOn: null, coverToken: null, removeCover: false,
};

const readingGenres = ["Fantasía", "Ciencia ficción", "Romance", "Misterio y suspense", "Terror", "Aventura", "Novela histórica", "Desarrollo personal", "Psicología", "Otro"];

export default function ReadingWorkspace() {
  const [view, setView] = useState<View>("library");
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [statistics, setStatistics] = useState<ReadingStatistics | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReadingStatus | "">("");
  const [genre, setGenre] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("updated");
  const [selected, setSelected] = useState<ReadingBook | null>(null);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (showLoading = false) => {
    const id = ++requestId.current;
    if (showLoading) setLoading(true);
    try {
      const [items, stats] = await Promise.all([
        readingApi.list({ archived }),
        readingApi.statistics(),
      ]);
      if (id === requestId.current) {
        setBooks(items);
        setStatistics(stats);
        setError(null);
      }
    } catch (reason) {
      if (id === requestId.current) setError(readingErrorMessage(reason));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [archived]);

  useEffect(() => { void load(true); return () => { requestId.current += 1; }; }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    const filtered = books.filter((book) =>
      (view !== "current" || book.status === "reading" || book.status === "paused")
      && (!query || book.title.toLocaleLowerCase("es").includes(query) || book.author.toLocaleLowerCase("es").includes(query))
      && (!status || book.status === status)
      && (!genre || book.genres.includes(genre))
      && (!favoritesOnly || book.favorite));
    return filtered.sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, "es");
      if (sort === "author") return left.author.localeCompare(right.author, "es");
      if (sort === "score") return (right.score ?? -1) - (left.score ?? -1) || left.title.localeCompare(right.title, "es");
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [books, favoritesOnly, genre, search, sort, status, view]);

  async function action(operation: () => Promise<unknown>) {
    setBusy(true);
    try { await operation(); setError(null); await load(false); return true; }
    catch (reason) { setError(readingErrorMessage(reason)); return false; }
    finally { setBusy(false); }
  }

  function showArchive() {
    setArchived((value) => !value);
    setSelected(null);
    setSearch(""); setStatus(""); setGenre(""); setFavoritesOnly(false);
  }

  return (
    <section className="reading-workspace">
      <div className="reading-toolbar">
        <nav aria-label="Vistas de Lectura" className="reading-tabs">
          <button className={view === "library" ? "active" : ""} onClick={() => { setView("library"); setArchived(false); }} type="button"><Library size={16} /> Biblioteca</button>
          <button className={view === "current" ? "active" : ""} onClick={() => { setView("current"); setArchived(false); setFavoritesOnly(false); }} type="button"><BookOpen size={16} /> Leyendo</button>
          <button className={view === "statistics" ? "active" : ""} onClick={() => { setView("statistics"); setArchived(false); }} type="button"><BarChart3 size={16} /> Estadísticas</button>
        </nav>
        <div className="reading-header-actions">
          <button className="reading-text-action" onClick={showArchive} type="button">
            {archived ? <RotateCcw size={16} /> : <Archive size={16} />}{archived ? "Volver" : "Archivo"}
          </button>
          {!archived && <button className="primary-button" onClick={() => setForm("new")} type="button"><Plus size={17} /> Añadir libro</button>}
        </div>
      </div>

      {error && <div className="reading-error" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={15} /></button></div>}

      {view === "statistics" && !archived ? (
        <Statistics data={statistics} />
      ) : (
        <>
          <header className="reading-view-heading">
            <span>{archived ? "ARCHIVO" : view === "current" ? "AHORA" : "TU COLECCIÓN"}</span>
            <h2>{archived ? "Libros archivados" : view === "current" ? "Leyendo" : "Biblioteca"}</h2>
            <p>{archived ? "Restaura o elimina definitivamente." : view === "current" ? "Lo que estás leyendo o has dejado temporalmente en pausa." : "Pendientes, terminados y todo lo que quieres conservar."}</p>
          </header>
          <div className={`reading-filters${view !== "library" || archived ? " without-favorite" : ""}`}>
            <label className="reading-search"><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título o autor" value={search} /></label>
            <SelectControl><select aria-label="Filtrar por estado" onChange={(event) => setStatus(event.target.value as ReadingStatus | "")} value={status}><option value="">Todos los estados</option>{readingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
            <SelectControl><select aria-label="Filtrar por género" onChange={(event) => setGenre(event.target.value)} value={genre}><option value="">Todos los géneros</option>{readingGenres.map((item) => <option key={item} value={item}>{item}</option>)}</select></SelectControl>
            <SelectControl><select aria-label="Ordenar libros" onChange={(event) => setSort(event.target.value as Sort)} value={sort}><option value="updated">Actualizados recientemente</option><option value="title">Título (A–Z)</option><option value="author">Autor (A–Z)</option><option value="score">Mejor puntuación</option></select></SelectControl>
            {view === "library" && !archived && <FavoriteFilter active={favoritesOnly} onChange={setFavoritesOnly} />}
          </div>
          {loading ? <Empty text="Cargando libros…" /> : visible.length === 0 ? <Empty text={archived ? "El Archivo está vacío." : view === "current" ? "No tienes ningún libro en lectura." : "Todavía no has añadido ningún libro."} /> : (
            <div className="reading-grid">
              {visible.map((book) => <BookCard
                archived={archived} book={book} busy={busy} key={book.id}
                open={() => setSelected(book)}
                favorite={() => void action(async () => { const updated = await readingApi.favorite(book.id, !book.favorite); setSelected((current) => current?.id === updated.id ? updated : current); })}
                restore={() => void action(() => readingApi.restore(book.id))}
                remove={() => { if (window.confirm(`¿Eliminar definitivamente “${book.title}”?`)) void action(() => readingApi.delete(book.id)); }}
              />)}
            </div>
          )}
        </>
      )}

      {selected && <BookDetail
        archived={archived} book={selected} busy={busy} close={() => setSelected(null)} edit={() => setForm("edit")}
        archive={() => void action(() => readingApi.archive(selected.id)).then((ok) => { if (ok) setSelected(null); })}
        restore={() => void action(() => readingApi.restore(selected.id)).then((ok) => { if (ok) setSelected(null); })}
      />}
      {form && <BookForm
        book={form === "edit" ? selected : null} busy={busy} close={() => setForm(null)}
        save={async (input) => {
          setBusy(true);
          try {
            const saved = form === "edit" && selected ? await readingApi.update(selected.id, input) : await readingApi.create(input);
            if (form === "edit") setSelected(saved);
            setError(null); await load(false); return true;
          } catch (reason) { setError(readingErrorMessage(reason)); return false; }
          finally { setBusy(false); }
        }}
      />}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <div className="reading-empty"><BookOpen size={28} /><strong>{text}</strong></div>; }

function BookCard({ book, archived, busy, open, favorite, restore, remove }: { book: ReadingBook; archived: boolean; busy: boolean; open: () => void; favorite: () => void; restore: () => void; remove: () => void }) {
  return <article className="reading-card">
    <button className="reading-card-open" onClick={open} type="button">
      <ReadingCoverImage alt={`Portada de ${book.title}`} bookId={book.id} hasCover={book.hasCover} />
      <div className="reading-card-heading"><span className={`reading-status status-${book.status}`}>{readingStatusLabel(book.status)}</span><h3>{book.title}</h3><p>{book.author}</p></div>
      <div className="reading-genres">{book.genres.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>
      <div className="reading-card-footer"><div><small>{book.startedOn ? `Inicio ${formatReadingDate(book.startedOn)}` : "Sin fecha de inicio"}</small>{book.finishedOn && <small>Fin {formatReadingDate(book.finishedOn)}</small>}</div><strong className="reading-score" style={{ borderColor: scoreColor(book.score), color: scoreColor(book.score) }}>{book.score === null ? "—" : formatScore(book.score)}</strong></div>
    </button>
    {!archived && <button aria-label={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`reading-card-favorite${book.favorite ? " active" : ""}`} disabled={busy} onClick={favorite} title={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={book.favorite ? "currentColor" : "none"} size={18} /></button>}
    {archived && <ArchiveItemActions busy={busy} itemLabel={book.title} remove={remove} restore={restore} />}
  </article>;
}

function BookDetail({ book, archived, busy, close, edit, archive, restore }: { book: ReadingBook; archived: boolean; busy: boolean; close: () => void; edit: () => void; archive: () => void; restore: () => void }) {
  return <Modal className="reading-detail-modal" labelledBy="reading-detail-title" onClose={close}>
    <div className="reading-detail-header"><ReadingCoverImage alt={`Portada de ${book.title}`} bookId={book.id} className="detail" hasCover={book.hasCover} /><div className="reading-detail-title"><span>LIBRO</span><h2 id="reading-detail-title">{book.title}</h2><p>{book.author}</p></div><div><button aria-label="Editar libro" className="reading-icon-action" onClick={edit} title="Editar" type="button"><Edit3 size={17} /></button><button aria-label={archived ? "Restaurar libro" : "Archivar libro"} className="reading-icon-action" disabled={busy} onClick={archived ? restore : archive} title={archived ? "Restaurar" : "Archivar"} type="button">{archived ? <RotateCcw size={17} /> : <Archive size={17} />}</button><button aria-label="Cerrar" className="reading-icon-action" onClick={close} title="Cerrar" type="button"><X size={18} /></button></div></div>
    <div className="reading-detail-grid">
      <div><span>Estado</span><strong>{readingStatusLabel(book.status)}</strong></div>
      <div><span>Puntuación</span><strong style={{ color: scoreColor(book.score) }}>{formatScore(book.score)}</strong></div>
      <div><span>Inicio</span><strong>{formatReadingDate(book.startedOn)}</strong></div>
      <div><span>Fin</span><strong>{formatReadingDate(book.finishedOn)}</strong></div>
    </div>
    <section className="reading-detail-section"><h3>Géneros</h3><div className="reading-genres">{book.genres.length ? book.genres.map((genre) => <span key={genre}>{genre}</span>) : <p>Sin géneros</p>}</div></section>
    <section className="reading-detail-section"><h3>Opinión</h3><p>{book.opinion || "Todavía no has escrito una opinión."}</p></section>
  </Modal>;
}

function BookForm({ book, busy, close, save }: { book: ReadingBook | null; busy: boolean; close: () => void; save: (input: ReadingBookInput) => Promise<boolean> }) {
  const initial = useMemo<ReadingBookInput>(() => book ? { title: book.title, author: book.author, genres: book.genres, status: book.status, score: book.score, opinion: book.opinion, favorite: book.favorite, startedOn: book.startedOn, finishedOn: book.finishedOn, coverToken: null, removeCover: false } : emptyInput, [book]);
  const [draft, setDraft] = useState(initial);
  const [cover, setCover] = useState<PendingReadingCover | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial) || cover !== null;
  async function discardPending() { if (cover) await readingApi.discardCover(cover.token).catch(() => undefined); }
  function requestClose() { if (!changed || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) { void discardPending(); close(); } }
  async function selectCover() { setCoverBusy(true); try { const selected = await readingApi.selectCover(); if (!selected) return; await discardPending(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } finally { setCoverBusy(false); } }
  function toggleGenre(value: string) { setDraft({ ...draft, genres: draft.genres.includes(value) ? draft.genres.filter((item) => item !== value) : [...draft.genres, value] }); }
  return <Modal className="reading-form-modal" labelledBy="reading-form-title" onClose={requestClose}>
    <form onSubmit={async (event) => { event.preventDefault(); const ok = await save(draft); if (ok) { setCover(null); close(); } }}>
      <div className="reading-form-header"><div><h2 id="reading-form-title">{book ? "Editar libro" : "Añadir libro"}</h2><p>Biblioteca personal</p></div><button aria-label="Cerrar" className="reading-icon-action" onClick={requestClose} type="button"><X size={18} /></button></div>
      <fieldset><legend>Identificación</legend><div className="reading-form-grid"><label>Título<input autoFocus onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Título del libro" required value={draft.title} /></label><label>Autor<input onChange={(event) => setDraft({ ...draft, author: event.target.value })} placeholder="Nombre del autor" required value={draft.author} /></label><div className="reading-genre-field wide"><span>Géneros</span><div>{readingGenres.map((item) => <button className={draft.genres.includes(item) ? "active" : ""} key={item} onClick={() => toggleGenre(item)} type="button">{item}</button>)}</div></div></div></fieldset>
      <fieldset><legend>Portada</legend><div className="reading-cover-field"><div>{book?.hasCover && !draft.removeCover ? "Portada actual guardada" : cover ? cover.originalName : "Sin portada"}<span>JPEG, PNG o WebP (máximo 8 MB)</span></div><button className="secondary-button" disabled={coverBusy} onClick={() => void selectCover()} type="button"><ImagePlus size={16} /> {coverBusy ? "Seleccionando…" : "Elegir imagen"}</button>{(book?.hasCover || cover) && <button className="secondary-button" onClick={() => { if (cover) void readingApi.discardCover(cover.token).catch(() => undefined); setCover(null); setDraft({ ...draft, coverToken: null, removeCover: true }); }} type="button"><Trash2 size={16} /> Quitar</button>}</div></fieldset>
      <fieldset><legend>Seguimiento</legend><div className="reading-form-grid"><label>Estado<SelectControl><select onChange={(event) => setDraft({ ...draft, status: event.target.value as ReadingStatus })} value={draft.status}>{readingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl></label><label>Puntuación (opcional)<div className="reading-score-input" style={{ color: scoreColor(draft.score) }}><input inputMode="decimal" max={10} min={0} onChange={(event) => setDraft({ ...draft, score: event.target.value === "" ? null : event.target.valueAsNumber })} placeholder="8,5" step={0.1} type="number" value={draft.score ?? ""} /><span>/ 10</span></div></label><label>Fecha de inicio (opcional)<input onChange={(event) => setDraft({ ...draft, startedOn: event.target.value || null })} type="date" value={draft.startedOn ?? ""} /></label><label>Fecha final (opcional)<input onChange={(event) => setDraft({ ...draft, finishedOn: event.target.value || null })} type="date" value={draft.finishedOn ?? ""} /></label></div></fieldset>
      <fieldset><legend>Opinión</legend><label><textarea onChange={(event) => setDraft({ ...draft, opinion: event.target.value || null })} placeholder="Qué te pareció..." rows={3} value={draft.opinion ?? ""} /></label></fieldset>
      <div className="reading-form-footer"><button className="secondary-button" onClick={requestClose} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar"}</button></div>
    </form>
  </Modal>;
}

function Statistics({ data }: { data: ReadingStatistics | null }) {
  if (!data) return <Empty text="Cargando estadísticas…" />;
  return <div className="reading-statistics"><header className="reading-view-heading"><span>TU BIBLIOTECA</span><h2>Estadísticas</h2><p>Una vista sencilla de lo que lees y terminas.</p></header><div className="reading-stat-grid"><Stat label="Libros" value={data.activeBooks} /><Stat label="En lectura" value={data.currentlyReading} /><Stat label="Terminados" value={data.completedBooks} /><Stat label="Favoritos" value={data.favoriteBooks} /><Stat label="Puntuación media" value={data.averageScore === null ? "—" : formatScore(data.averageScore)} color={scoreColor(data.averageScore)} /></div><div className="reading-stat-columns"><section><h3>Por estado</h3>{data.byStatus.map((item) => <div className="reading-stat-row" key={item.status}><span>{readingStatusLabel(item.status)}</span><strong>{item.count}</strong></div>)}</section><section><h3>Géneros principales</h3>{data.topGenres.length ? data.topGenres.map((item) => <div className="reading-stat-row" key={item.genre}><span>{item.genre}</span><strong>{item.count}</strong></div>) : <p>Sin datos todavía.</p>}</section></div></div>;
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) { return <div className="reading-stat"><span>{label}</span><strong style={color ? { color } : undefined}>{value}</strong></div>; }
