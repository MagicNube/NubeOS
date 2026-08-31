import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Archive, BarChart3, CalendarDays, Edit3, Gamepad2, History, ImagePlus, Library, Move, Plus, RotateCcw, Search, Star, Trash2, X } from "lucide-react";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import CoverCropEditor from "../ui/CoverCropEditor";
import FavoriteFilter from "../ui/FavoriteFilter";
import Modal from "../ui/Modal";
import ScoreTile from "../ui/ScoreTile";
import SelectControl from "../ui/SelectControl";
import SmartDateInput from "../ui/SmartDateInput";
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import MediaStatisticsDashboard from "../ui/MediaStatisticsDashboard";
import { notifyCoverChanged } from "../ui/coverRefresh";
import { confirmInferredStatusChange } from "../ui/inferredStatus";
import { pastedCoverAsJpeg } from "../ui/pastedCover";
import { formatScore, scoreColor } from "../ui/score";
import type { Game, GameDetail, GameHistoryEntry, GameInput, GameRun, GameRunInput, GameStatus, PendingGameCover } from "./api";
import { gameErrorMessage, gamesApi } from "./api";
import GameCoverImage from "./GameCoverImage";
import { formatGameDate, gameStatusLabel, gameStatuses, today } from "./presentation";
import "./games.css";

type View = "library" | "playing" | "history" | "statistics";
type Sort = "updated" | "title" | "score" | "startAsc" | "startDesc" | "finishAsc" | "finishDesc";
const emptyInput: GameInput = { name: "", genres: [], status: "pending", score: null, opinion: null, favorite: false, coverToken: null, removeCover: false };
const gameGenres = ["Acción", "Aventura", "RPG", "Estrategia", "Simulación", "Deportes", "Carreras", "Plataformas", "Puzles", "Terror", "Shooter", "Metroidvania", "Roguelike", "Novela visual", "Otro"];

function gameInputWithStatus(game: GameDetail, status: GameStatus): GameInput {
  return {
    name: game.name,
    genres: game.genres,
    status,
    score: game.score,
    opinion: game.opinion,
    favorite: game.favorite,
    coverToken: null,
    removeCover: false,
  };
}

export default function GamesWorkspace() {
  const [view, setView] = useState<View>("library");
  const [games, setGames] = useState<Game[]>([]);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [allHistory, setAllHistory] = useState<GameHistoryEntry[]>([]);
  const [historyYears, setHistoryYears] = useState<string[]>([]);
  const [archived, setArchived] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [playingSearch, setPlayingSearch] = useState("");
  const [libraryStatus, setLibraryStatus] = useState<GameStatus | "">("");
  const [playingStatus, setPlayingStatus] = useState<GameStatus | "">("");
  const [libraryScore, setLibraryScore] = useState<"" | "unscored">("");
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState<Sort>(() => (localStorage.getItem("nubeos.games.sort") as Sort) || "updated");
  useEffect(() => { localStorage.setItem("nubeos.games.sort", sort); }, [sort]);
  const [historyGame, setHistoryGame] = useState("");
  const [historyYear, setHistoryYear] = useState("");
  const [selected, setSelected] = useState<GameDetail | null>(null);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [runForm, setRunForm] = useState<{ gameId: string; run?: GameRun } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const playingFilters = view === "playing";
  const search = playingFilters ? playingSearch : librarySearch;
  const status = playingFilters ? playingStatus : libraryStatus;
  const setSearch = playingFilters ? setPlayingSearch : setLibrarySearch;
  const setStatus = playingFilters ? setPlayingStatus : setLibraryStatus;

  const load = useCallback(async (showLoading = false) => {
    const id = ++requestId.current; if (showLoading) setLoading(true);
    try {
      const [items, entries, allEntries] = await Promise.all([
        gamesApi.list({ archived }), gamesApi.history({ gameId: historyGame || null, year: historyYear ? Number(historyYear) : null }), gamesApi.history({}),
      ]);
      if (id === requestId.current) {
        setGames(items); setHistory(entries); setAllHistory(allEntries);
        setHistoryYears([...new Set(allEntries.flatMap((entry) => [entry.run.finishedOn, entry.run.startedOn]).filter(Boolean).map((date) => date!.slice(0, 4)))].sort().reverse());
        setError(null);
      }
    } catch (reason) { if (id === requestId.current) setError(gameErrorMessage(reason)); }
    finally { if (id === requestId.current) setLoading(false); }
  }, [archived, historyGame, historyYear]);

  useEffect(() => { void load(true); return () => { requestId.current += 1; }; }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return games.filter((game) => (view !== "playing" || game.status === "playing" || game.status === "paused")
      && (!query || game.name.toLocaleLowerCase("es").includes(query)) && (!status || game.status === status)
      && (view !== "library" || !libraryScore || game.score === null) && (!favorites || game.favorite))
      .sort((a, b) => {
        if (sort === "title") return a.name.localeCompare(b.name, "es");
        if (sort === "score") return (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, "es");
        if (sort.startsWith("start") || sort.startsWith("finish")) {
          const value = (id: string) => allHistory.filter((entry) => entry.run.gameId === id).map((entry) => sort.startsWith("start") ? entry.run.startedOn : entry.run.finishedOn).filter((date): date is string => date !== null).sort().reverse()[0];
          const left = value(a.id), right = value(b.id);
          if (!left) return right ? 1 : 0;
          if (!right) return -1;
          return sort.endsWith("Asc") ? left.localeCompare(right) : right.localeCompare(left);
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [allHistory, favorites, games, libraryScore, search, sort, status, view]);

  async function action(operation: () => Promise<unknown>) {
    setBusy(true); try { await operation(); setError(null); await load(false); return true; }
    catch (reason) { setError(gameErrorMessage(reason)); return false; } finally { setBusy(false); }
  }
  async function openGame(id: string) { setBusy(true); try { setSelected(await gamesApi.get(id)); } catch (reason) { setError(gameErrorMessage(reason)); } finally { setBusy(false); } }
  async function mutateRunKeepingChoice(game: GameDetail, operation: () => Promise<GameDetail>) {
    let detail = await operation();
    if (detail.status !== game.status && !await confirmInferredStatusChange(game.name, gameStatusLabel(game.status), gameStatusLabel(detail.status))) {
      await gamesApi.update(game.id, gameInputWithStatus(detail, game.status));
      detail = await gamesApi.get(game.id);
    }
    return detail;
  }
  function toggleArchive() { setArchived((value) => !value); setSelected(null); setLibrarySearch(""); setLibraryStatus(""); setLibraryScore(""); setFavorites(false); setView("library"); }
  const collectionActions = <div className="games-header-actions">
    <button className="games-text-action" onClick={toggleArchive} type="button">{archived ? <RotateCcw size={16} /> : <Archive size={16} />}{archived ? "Volver" : "Archivo"}</button>
    {!archived && <button className="primary-button" onClick={() => setForm("new")} type="button"><Plus size={17} /> Añadir videojuego</button>}
  </div>;

  return <section className="games-workspace">
    <div className="games-toolbar">
      <nav aria-label="Vistas de Videojuegos" className="games-tabs">
        <Tab active={view === "library"} icon={Library} label="Biblioteca" onClick={() => { setView("library"); setArchived(false); }} />
        <Tab active={view === "playing"} icon={Gamepad2} label="Jugando" onClick={() => { setView("playing"); setArchived(false); }} />
        <Tab active={view === "history"} icon={History} label="Historial" onClick={() => { setView("history"); setArchived(false); }} />
        <Tab active={view === "statistics"} icon={BarChart3} label="Estadísticas" onClick={() => { setView("statistics"); setArchived(false); }} />
      </nav>
    </div>
    {error && <div className="games-error" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={15} /></button></div>}
    {view === "statistics" && !archived ? <Statistics actions={collectionActions} entries={allHistory} games={games} open={(id) => void openGame(id)} showUnscored={() => { setLibraryScore("unscored"); setView("library"); setArchived(false); }} /> : view === "history" && !archived ? <HistoryView actions={collectionActions} entries={history} games={games} years={historyYears} gameId={historyGame} year={historyYear} setGameId={setHistoryGame} setYear={setHistoryYear} edit={(entry) => setRunForm({ gameId: entry.run.gameId, run: entry.run })} remove={(entry) => { if (window.confirm(`¿Eliminar esta partida de “${entry.gameName}”?`)) void action(async () => { const game = await gamesApi.get(entry.run.gameId); await mutateRunKeepingChoice(game, () => gamesApi.deleteRun(entry.run.id)); }); }} /> : <>
      <div className="games-collection-heading"><header className="games-view-heading"><span>{archived ? "ARCHIVO" : view === "playing" ? "EN CURSO" : "TU COLECCIÓN"}</span><h2>{archived ? "Videojuegos archivados" : view === "playing" ? "Jugando" : "Biblioteca"}</h2><p>{archived ? "Restaura o elimina definitivamente." : view === "playing" ? "Tus partidas activas y pausadas." : "Todo lo que quieres jugar, has jugado o quieres recordar."}</p></header>{collectionActions}</div>
      <div className={`games-filters${view !== "library" || archived ? " without-favorite" : ""}`}>
        <label className="games-search"><Search size={17} /><input onChange={(e) => setSearch(e.target.value)} placeholder="Buscar videojuegos" value={search} /></label>
        <SelectControl><select aria-label="Filtrar por estado" onChange={(e) => setStatus(e.target.value as GameStatus | "")} value={status}><option value="">{view === "playing" ? "Jugando y en pausa" : "Todos los estados"}</option>{gameStatuses.filter((item) => view !== "playing" || item.value === "playing" || item.value === "paused").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
        {view === "library" && <SelectControl><select aria-label="Filtrar por puntuación" onChange={(event) => setLibraryScore(event.target.value as "" | "unscored")} value={libraryScore}><option value="">Todas las puntuaciones</option><option value="unscored">Sin puntuar</option></select></SelectControl>}
        <SelectControl><select aria-label="Ordenar videojuegos" onChange={(e) => setSort(e.target.value as Sort)} value={sort}><option value="updated">Actualizados recientemente</option><option value="title">Título (A–Z)</option><option value="score">Mejor puntuación</option><option value="startDesc">Inicio (más reciente)</option><option value="startAsc">Inicio (más antiguo)</option><option value="finishDesc">Finalización (más reciente)</option><option value="finishAsc">Finalización (más antigua)</option></select></SelectControl>
        {view === "library" && !archived && <FavoriteFilter active={favorites} onChange={setFavorites} />}
      </div>
      {loading ? <Empty text="Cargando videojuegos…" /> : visible.length === 0 ? <Empty text={archived ? "El Archivo está vacío." : view === "playing" ? "No tienes ninguna partida activa." : "Todavía no has añadido ningún videojuego."} /> : <div className="games-grid">{visible.map((game) => <GameCard key={game.id} game={game} lastRun={allHistory.find((entry) => entry.run.gameId === game.id)?.run} archived={archived} busy={busy} open={() => void openGame(game.id)} favorite={() => void action(() => gamesApi.favorite(game.id, !game.favorite))} restore={() => void action(() => gamesApi.restore(game.id))} remove={() => { if (window.confirm(`¿Eliminar definitivamente “${game.name}”?`)) void action(() => gamesApi.delete(game.id)); }} />)}</div>}
    </>}

    {selected && <GameDetailModal detail={selected} busy={busy} archived={archived} close={() => setSelected(null)} edit={() => setForm("edit")} favorite={() => void action(async () => { await gamesApi.favorite(selected.id, !selected.favorite); setSelected(await gamesApi.get(selected.id)); })} archive={() => void action(() => gamesApi.archive(selected.id)).then((ok) => { if (ok) setSelected(null); })} restore={() => void action(() => gamesApi.restore(selected.id)).then((ok) => { if (ok) setSelected(null); })} start={() => void action(async () => setSelected(await mutateRunKeepingChoice(selected, () => gamesApi.startRun(selected.id, today()))))} finish={(run) => void action(async () => setSelected(await mutateRunKeepingChoice(selected, () => gamesApi.finishRun(run.id, today()))))} addRun={() => setRunForm({ gameId: selected.id })} editRun={(run) => setRunForm({ gameId: selected.id, run })} deleteRun={(run) => { if (window.confirm("¿Eliminar esta partida del historial?")) void action(async () => setSelected(await mutateRunKeepingChoice(selected, () => gamesApi.deleteRun(run.id)))); }} setCoverCrop={async (x, y, zoom) => action(async () => { await gamesApi.setCoverCrop(selected.id, x, y, zoom); setSelected(await gamesApi.get(selected.id)); })} />}
    {form && <GameForm game={form === "edit" ? selected : null} busy={busy} close={() => setForm(null)} save={async (input) => { setBusy(true); try { const saved = form === "edit" && selected ? await gamesApi.update(selected.id, input) : await gamesApi.create(input); if (form === "edit") setSelected(await gamesApi.get(saved.id)); await load(false); setError(null); return true; } catch (reason) { setError(gameErrorMessage(reason)); return false; } finally { setBusy(false); } }} />}
    {runForm && <RunForm run={runForm.run ?? null} busy={busy} close={() => setRunForm(null)} save={async (input) => { const ok = await action(async () => { const game = selected?.id === runForm.gameId ? selected : await gamesApi.get(runForm.gameId); const detail = await mutateRunKeepingChoice(game, () => runForm.run ? gamesApi.updateRun(runForm.run.id, input) : gamesApi.createRun(runForm.gameId, input)); if (selected?.id === detail.id) setSelected(detail); }); return ok; }} />}
  </section>;
}

function Tab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Library; label: string; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick} type="button"><Icon size={16} />{label}</button>; }
function Empty({ text }: { text: string }) { return <div className="games-empty"><Gamepad2 size={30} /><strong>{text}</strong></div>; }

function GameCard({ game, lastRun, archived, busy, open, favorite, restore, remove }: { game: Game; lastRun?: GameRun; archived: boolean; busy: boolean; open: () => void; favorite: () => void; restore: () => void; remove: () => void }) {
  return <article className="game-card"><button className="game-card-open" onClick={open} type="button"><GameCoverImage alt={`Portada de ${game.name}`} gameId={game.id} hasCover={game.hasCover} positionX={game.coverPositionX} positionY={game.coverPositionY} zoom={game.coverZoom} /><div className="game-card-content"><span className={`game-status status-${game.status}`}>{gameStatusLabel(game.status)}</span><h3>{game.name}</h3><div className="game-card-meta">{lastRun ? <div className="game-card-dates"><div><small>Inicio</small><strong>{formatGameDate(lastRun.startedOn)}</strong></div><div><small>Fin</small><strong>{lastRun.finishedOn ? formatGameDate(lastRun.finishedOn) : "En curso"}</strong></div></div> : <span>Sin partidas registradas</span>}<ScoreTile className="game-card-score" score={game.score} /></div></div></button>{!archived && <button aria-label={game.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`game-favorite${game.favorite ? " active" : ""}`} disabled={busy} onClick={favorite} title={game.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={game.favorite ? "currentColor" : "none"} size={18} /></button>}{archived && <ArchiveItemActions busy={busy} itemLabel={game.name} remove={remove} restore={restore} />}</article>;
}

function GameDetailModal({ detail, busy, archived, close, edit, favorite, archive, restore, start, finish, addRun, editRun, deleteRun, setCoverCrop }: { detail: GameDetail; busy: boolean; archived: boolean; close: () => void; edit: () => void; favorite: () => void; archive: () => void; restore: () => void; start: () => void; finish: (run: GameRun) => void; addRun: () => void; editRun: (run: GameRun) => void; deleteRun: (run: GameRun) => void; setCoverCrop: (x: number, y: number, zoom: number) => Promise<boolean> }) {
  const openRun = detail.runs.find((run) => !run.finishedOn);
  const [detailView, setDetailView] = useState<"summary" | "history">("summary");
  const [positioningCover, setPositioningCover] = useState(false);
  return <><Modal className="game-detail-modal" labelledBy="game-detail-title" onClose={close}><header className="game-detail-header"><div className="game-detail-cover-wrap ui-cover-adjust-host"><GameCoverImage alt={`Portada de ${detail.name}`} className="detail" gameId={detail.id} hasCover={detail.hasCover} positionX={detail.coverPositionX} positionY={detail.coverPositionY} zoom={detail.coverZoom} />{!archived && detail.hasCover && <button aria-label="Ajustar encuadre de portada" className="ui-cover-adjust-button" onClick={() => setPositioningCover(true)} type="button"><Move size={14} /> Ajustar</button>}</div><div><span>VIDEOJUEGO</span><h2 id="game-detail-title">{detail.name}</h2><p>{gameStatusLabel(detail.status)}</p></div><div className="game-detail-actions">{!archived && <button aria-label={detail.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`game-icon-action game-favorite-action${detail.favorite ? " active" : ""}`} disabled={busy} onClick={favorite} title={detail.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={detail.favorite ? "currentColor" : "none"} size={17} /></button>}<button aria-label="Editar" className="game-icon-action" onClick={edit} title="Editar" type="button"><Edit3 size={17} /></button><button aria-label={archived ? "Restaurar" : "Archivar"} className="game-icon-action" disabled={busy} onClick={archived ? restore : archive} title={archived ? "Restaurar" : "Archivar"} type="button">{archived ? <RotateCcw size={17} /> : <Archive size={17} />}</button><button aria-label="Cerrar" className="game-icon-action" onClick={close} title="Cerrar" type="button"><X size={18} /></button></div></header>
    <TrackerDetailTabs onChange={setDetailView} value={detailView} />
    {detailView === "summary" ? <><TrackerMetricGrid metrics={[{ label: "Puntuación", value: formatScore(detail.score), score: detail.score }, { label: "Partidas", value: detail.runs.length }, { label: "Estado", value: gameStatusLabel(detail.status) }]} /><section className="game-opinion"><h3>Opinión</h3><p>{detail.opinion || "Todavía no has escrito una opinión."}</p></section></> : <section className="game-runs"><header><strong className="tracker-history-count"><History size={17} /> {detail.runs.length} {detail.runs.length === 1 ? "partida registrada" : "partidas registradas"}</strong>{!archived && <div>{openRun ? <button className="secondary-button" disabled={busy} onClick={() => finish(openRun)} type="button">Terminar hoy</button> : <button className="secondary-button" disabled={busy} onClick={start} type="button"><Gamepad2 size={16} /> Empezar hoy</button>}<button className="primary-button" onClick={addRun} type="button"><Plus size={16} /> Registrar partida</button></div>}</header>
      {detail.runs.length === 0 ? <p className="game-muted">No hay partidas registradas.</p> : <div className="game-run-list">{detail.runs.map((run, index) => <article key={run.id}><div><strong>{run.finishedOn ? `Partida ${detail.runs.length - index}` : "Partida actual"}{run.finishedOn && !run.completed && <span className="tracker-run-incomplete">Sin terminar</span>}</strong><span>{formatGameDate(run.startedOn)} → {run.finishedOn ? formatGameDate(run.finishedOn) : "En curso"}</span></div>{!archived && <div><button aria-label="Editar partida" className="game-icon-action" onClick={() => editRun(run)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar partida" className="game-icon-action danger" onClick={() => deleteRun(run)} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
    </section>}</Modal>{positioningCover && <CoverCropEditor busy={busy} close={() => setPositioningCover(false)} initial={{ x: detail.coverPositionX, y: detail.coverPositionY, zoom: detail.coverZoom }} landscape preview={(crop) => <GameCoverImage alt={`Portada de ${detail.name}`} gameId={detail.id} hasCover={detail.hasCover} positionX={crop.x} positionY={crop.y} zoom={crop.zoom} />} save={(crop) => setCoverCrop(crop.x, crop.y, crop.zoom)} title={detail.name} />}</>;
}

function GameForm({ game, busy, close, save }: { game: GameDetail | null; busy: boolean; close: () => void; save: (input: GameInput) => Promise<boolean> }) {
  const initial = useMemo<GameInput>(() => game ? { name: game.name, genres: game.genres, status: game.status, score: game.score, opinion: game.opinion, favorite: game.favorite, coverToken: null, removeCover: false } : emptyInput, [game]);
  const [draft, setDraft] = useState(initial); const [cover, setCover] = useState<PendingGameCover | null>(null); const [coverBusy, setCoverBusy] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial) || cover !== null;
  async function discard() { if (cover) await gamesApi.discardCover(cover.token).catch(() => undefined); }
  function requestClose() { if (!changed || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) { void discard(); close(); } }
  async function selectCover() { setCoverBusy(true); try { const selected = await gamesApi.selectCover(); if (!selected) return; await discard(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } finally { setCoverBusy(false); } }
  async function pasteCover(event: React.ClipboardEvent<HTMLElement>) { setCoverBusy(true); try { const bytes = await pastedCoverAsJpeg(event); if (!bytes) return; const selected = await gamesApi.preparePastedCover(bytes); await discard(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } catch (reason) { window.alert(gameErrorMessage(reason)); } finally { setCoverBusy(false); } }
  return <Modal className="game-form-modal" labelledBy="game-form-title" onClose={requestClose}><form onSubmit={async (event) => { event.preventDefault(); if (await save(draft)) { if (game && (cover || draft.removeCover)) notifyCoverChanged(game.id); setCover(null); close(); } }}><header><div><h2 id="game-form-title">{game ? "Editar videojuego" : "Añadir videojuego"}</h2><p>Biblioteca personal</p></div><button aria-label="Cerrar" className="game-icon-action" onClick={requestClose} type="button"><X size={18} /></button></header>
    <fieldset><legend>Identificación</legend><label>Nombre<input autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre del videojuego" required value={draft.name} /></label><div className="game-genre-field"><span>Géneros</span><div>{gameGenres.map((genre) => <button className={draft.genres.includes(genre) ? "active" : ""} key={genre} onClick={() => setDraft({ ...draft, genres: draft.genres.includes(genre) ? draft.genres.filter((item) => item !== genre) : [...draft.genres, genre] })} type="button">{genre}</button>)}</div></div></fieldset>
    <fieldset><legend>Seguimiento</legend><div className="game-form-grid"><label>Estado<SelectControl><select onChange={(e) => setDraft({ ...draft, status: e.target.value as GameStatus })} value={draft.status}>{gameStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl></label><label>Puntuación (opcional)<div className="game-score-input" style={{ color: scoreColor(draft.score) }}><input inputMode="decimal" max={10} min={0} onChange={(e) => setDraft({ ...draft, score: e.target.value === "" ? null : e.target.valueAsNumber })} placeholder="8,5" step={0.1} type="number" value={draft.score ?? ""} /><span>/ 10</span></div></label><label>Favorito<button aria-pressed={draft.favorite} className={`media-form-favorite${draft.favorite ? " active" : ""}`} onClick={() => setDraft({ ...draft, favorite: !draft.favorite })} type="button"><Star fill={draft.favorite ? "currentColor" : "none"} size={18} />{draft.favorite ? "En favoritos" : "Añadir a favoritos"}</button></label></div></fieldset>
    <fieldset><legend>Opinión</legend><label><textarea onChange={(e) => setDraft({ ...draft, opinion: e.target.value || null })} placeholder="Qué te pareció..." rows={3} value={draft.opinion ?? ""} /></label></fieldset>
    <fieldset><legend>Portada</legend><div className="game-cover-field" onPaste={(event) => void pasteCover(event)} tabIndex={0}><div>{cover ? cover.originalName : game?.hasCover && !draft.removeCover ? "Portada actual guardada" : "Sin portada"}<span>Elige una imagen o pégala aquí con Ctrl+V. Se guardará como JPEG.</span></div><button className="secondary-button" disabled={coverBusy} onClick={() => void selectCover()} type="button"><ImagePlus size={16} />{coverBusy ? "Preparando…" : "Elegir imagen"}</button>{(game?.hasCover || cover) && !draft.removeCover && <button aria-label="Quitar portada" className="game-icon-action" onClick={() => { if (cover) void gamesApi.discardCover(cover.token).catch(() => undefined); setCover(null); setDraft({ ...draft, coverToken: null, removeCover: Boolean(game?.hasCover) }); }} title="Quitar portada" type="button"><Trash2 size={16} /></button>}</div></fieldset>
    <footer><button className="secondary-button" onClick={requestClose} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar"}</button></footer></form></Modal>;
}

function RunForm({ run, busy, close, save }: { run: GameRun | null; busy: boolean; close: () => void; save: (input: GameRunInput) => Promise<boolean> }) {
  const initial = useMemo<GameRunInput>(() => ({ startedOn: run?.startedOn ?? null, finishedOn: run?.finishedOn ?? null, completed: run?.completed ?? false }), [run]); const [draft, setDraft] = useState(initial);
  const changed = JSON.stringify(initial) !== JSON.stringify(draft); function requestClose() { if (!changed || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) close(); }
  return <Modal className="game-run-modal" labelledBy="game-run-title" onClose={requestClose}><form onSubmit={async (event) => { event.preventDefault(); if (await save(draft)) close(); }}><header><div><h2 id="game-run-title">{run ? "Editar partida" : "Registrar partida"}</h2><p>La fecha final cierra el periodo; no implica necesariamente terminar el juego.</p></div><button aria-label="Cerrar" className="game-icon-action" onClick={requestClose} type="button"><X size={18} /></button></header><div className="game-form-grid"><label>Fecha de inicio<SmartDateInput max={today()} onChange={(value) => setDraft({ ...draft, startedOn: value || null })} required value={draft.startedOn ?? ""} /></label><label>Fecha final (opcional)<SmartDateInput max={today()} min={draft.startedOn ?? undefined} onChange={(value) => { const finishedOn = value || null; setDraft({ ...draft, finishedOn, completed: Boolean(finishedOn) }); }} value={draft.finishedOn ?? ""} /></label></div>{draft.finishedOn && <label className="tracker-run-completion" title="El periodo quedará cerrado y se sugerirá marcar el juego como Pausado."><input checked={!draft.completed} onChange={(e) => setDraft({ ...draft, completed: !e.target.checked })} type="checkbox" /><span>No terminé el videojuego</span></label>}<footer><button className="secondary-button" onClick={requestClose} type="button">Cancelar</button><button className="primary-button" disabled={busy || !draft.startedOn} type="submit">Guardar</button></footer></form></Modal>;
}

function HistoryView({ actions, entries, games, years, gameId, year, setGameId, setYear, edit, remove }: { actions: ReactNode; entries: GameHistoryEntry[]; games: Game[]; years: string[]; gameId: string; year: string; setGameId: (value: string) => void; setYear: (value: string) => void; edit: (entry: GameHistoryEntry) => void; remove: (entry: GameHistoryEntry) => void }) {
  return <div><div className="games-collection-heading"><header className="games-view-heading"><span>TU HISTORIAL</span><h2>Partidas</h2><p>Primeras partidas y rejugadas, sin sobrescribir las anteriores.</p></header>{actions}</div><div className="game-history-filters"><SelectControl><select aria-label="Filtrar por videojuego" onChange={(e) => setGameId(e.target.value)} value={gameId}><option value="">Todos los videojuegos</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></SelectControl><SelectControl><select aria-label="Filtrar por año" onChange={(e) => setYear(e.target.value)} value={year}><option value="">Todos los años</option>{years.map((item) => <option key={item}>{item}</option>)}</select></SelectControl></div>{entries.length === 0 ? <Empty text="Todavía no hay partidas en el historial." /> : <div className="game-history-list">{entries.map((entry) => <article key={entry.run.id}><CalendarDays size={18} /><div><strong>{entry.gameName}{entry.run.finishedOn && !entry.run.completed && <span className="tracker-run-incomplete">Sin terminar</span>}</strong><span>{formatGameDate(entry.run.startedOn)} → {entry.run.finishedOn ? formatGameDate(entry.run.finishedOn) : "En curso"}</span></div><div><button aria-label="Editar" className="game-icon-action" onClick={() => edit(entry)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar" className="game-icon-action danger" onClick={() => remove(entry)} title="Eliminar" type="button"><Trash2 size={15} /></button></div></article>)}</div>}</div>;
}

function Statistics({ actions, entries, games, open, showUnscored }: { actions: ReactNode; entries: GameHistoryEntry[]; games: Game[]; open: (id: string) => void; showUnscored: () => void }) { return <div><div className="games-collection-heading"><header className="games-view-heading"><span>TU BIBLIOTECA</span><h2>Estadísticas</h2><p>Partidas, rejugadas y evolución de tus gustos.</p></header>{actions}</div><MediaStatisticsDashboard
  items={games.map((game) => { const runs = entries.filter((entry) => entry.run.gameId === game.id).map((entry) => entry.run); const starts = runs.map((run) => run.startedOn).filter((date): date is string => Boolean(date)).sort(); const finishes = runs.filter((run) => run.completed).map((run) => run.finishedOn).filter((date): date is string => Boolean(date)).sort(); return { id: game.id, name: game.name, status: game.status, statusLabel: gameStatusLabel(game.status), score: game.score, favorite: game.favorite, genres: game.genres, startedOn: starts[0] ?? null, finishedOn: finishes[finishes.length - 1] ?? null }; })}
  noun="Videojuegos"
  openItem={open}
  showUnscored={showUnscored}
  sessions={entries.map((entry) => ({ id: entry.run.id, itemId: entry.run.gameId, startedOn: entry.run.startedOn, finishedOn: entry.run.finishedOn, completed: entry.run.completed }))}
  storageKey="nubeos.games.statistics"
  unitLabel="Partidas"
/></div>; }
