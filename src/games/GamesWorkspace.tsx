import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, BarChart3, CalendarDays, Edit3, Gamepad2, History, ImagePlus, Library, Move, Plus, RotateCcw, Search, Star, Trash2, X } from "lucide-react";
import ArchiveItemActions from "../ui/ArchiveItemActions";
import CoverCropEditor from "../ui/CoverCropEditor";
import FavoriteFilter from "../ui/FavoriteFilter";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import { TrackerDetailTabs, TrackerMetricGrid } from "../ui/TrackerDetail";
import { pastedCoverAsJpeg } from "../ui/pastedCover";
import { formatScore, scoreColor } from "../ui/score";
import type { Game, GameDetail, GameHistoryEntry, GameInput, GameRun, GameRunInput, GameStatistics, GameStatus, PendingGameCover } from "./api";
import { gameErrorMessage, gamesApi } from "./api";
import GameCoverImage from "./GameCoverImage";
import { formatGameDate, gameStatusLabel, gameStatuses, today } from "./presentation";
import "./games.css";

type View = "library" | "playing" | "history" | "statistics";
type Sort = "updated" | "title" | "score";
const emptyInput: GameInput = { name: "", status: "pending", score: null, opinion: null, favorite: false, coverToken: null, removeCover: false };

export default function GamesWorkspace() {
  const [view, setView] = useState<View>("library");
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<GameStatistics | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [historyYears, setHistoryYears] = useState<string[]>([]);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<GameStatus | "">("");
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState<Sort>("updated");
  const [historyGame, setHistoryGame] = useState("");
  const [historyYear, setHistoryYear] = useState("");
  const [selected, setSelected] = useState<GameDetail | null>(null);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [runForm, setRunForm] = useState<{ gameId: string; run?: GameRun } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (showLoading = false) => {
    const id = ++requestId.current; if (showLoading) setLoading(true);
    try {
      const [items, statistics, entries, allEntries] = await Promise.all([
        gamesApi.list({ archived }), gamesApi.statistics(), gamesApi.history({ gameId: historyGame || null, year: historyYear ? Number(historyYear) : null }), gamesApi.history({}),
      ]);
      if (id === requestId.current) {
        setGames(items); setStats(statistics); setHistory(entries);
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
      && (!query || game.name.toLocaleLowerCase("es").includes(query)) && (!status || game.status === status) && (!favorites || game.favorite))
      .sort((a, b) => sort === "title" ? a.name.localeCompare(b.name, "es") : sort === "score" ? (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, "es") : b.updatedAt.localeCompare(a.updatedAt));
  }, [favorites, games, search, sort, status, view]);

  async function action(operation: () => Promise<unknown>) {
    setBusy(true); try { await operation(); setError(null); await load(false); return true; }
    catch (reason) { setError(gameErrorMessage(reason)); return false; } finally { setBusy(false); }
  }
  async function openGame(id: string) { setBusy(true); try { setSelected(await gamesApi.get(id)); } catch (reason) { setError(gameErrorMessage(reason)); } finally { setBusy(false); } }
  function toggleArchive() { setArchived((value) => !value); setSelected(null); setSearch(""); setStatus(""); setFavorites(false); setView("library"); }

  return <section className="games-workspace">
    <div className="games-toolbar">
      <nav aria-label="Vistas de Videojuegos" className="games-tabs">
        <Tab active={view === "library"} icon={Library} label="Biblioteca" onClick={() => { setView("library"); setArchived(false); }} />
        <Tab active={view === "playing"} icon={Gamepad2} label="Jugando" onClick={() => { setView("playing"); setArchived(false); setFavorites(false); }} />
        <Tab active={view === "history"} icon={History} label="Historial" onClick={() => { setView("history"); setArchived(false); }} />
        <Tab active={view === "statistics"} icon={BarChart3} label="Estadísticas" onClick={() => { setView("statistics"); setArchived(false); }} />
      </nav>
      <div className="games-header-actions">
        <button className="games-text-action" onClick={toggleArchive} type="button">{archived ? <RotateCcw size={16} /> : <Archive size={16} />}{archived ? "Volver" : "Archivo"}</button>
        {!archived && <button className="primary-button" onClick={() => setForm("new")} type="button"><Plus size={17} /> Añadir videojuego</button>}
      </div>
    </div>
    {error && <div className="games-error" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button"><X size={15} /></button></div>}
    {view === "statistics" && !archived ? <Statistics data={stats} /> : view === "history" && !archived ? <HistoryView entries={history} games={games} years={historyYears} gameId={historyGame} year={historyYear} setGameId={setHistoryGame} setYear={setHistoryYear} edit={(entry) => setRunForm({ gameId: entry.run.gameId, run: entry.run })} remove={(entry) => { if (window.confirm(`¿Eliminar esta partida de “${entry.gameName}”?`)) void action(() => gamesApi.deleteRun(entry.run.id)); }} /> : <>
      <header className="games-view-heading"><span>{archived ? "ARCHIVO" : view === "playing" ? "EN CURSO" : "TU COLECCIÓN"}</span><h2>{archived ? "Videojuegos archivados" : view === "playing" ? "Jugando" : "Biblioteca"}</h2><p>{archived ? "Restaura o elimina definitivamente." : view === "playing" ? "Tus partidas activas y pausadas." : "Todo lo que quieres jugar, has jugado o quieres recordar."}</p></header>
      <div className={`games-filters${view !== "library" || archived ? " without-favorite" : ""}`}>
        <label className="games-search"><Search size={17} /><input onChange={(e) => setSearch(e.target.value)} placeholder="Buscar videojuegos" value={search} /></label>
        <SelectControl><select aria-label="Filtrar por estado" onChange={(e) => setStatus(e.target.value as GameStatus | "")} value={status}><option value="">Todos los estados</option>{gameStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl>
        <SelectControl><select aria-label="Ordenar videojuegos" onChange={(e) => setSort(e.target.value as Sort)} value={sort}><option value="updated">Actualizados recientemente</option><option value="title">Título (A–Z)</option><option value="score">Mejor puntuación</option></select></SelectControl>
        {view === "library" && !archived && <FavoriteFilter active={favorites} onChange={setFavorites} />}
      </div>
      {loading ? <Empty text="Cargando videojuegos…" /> : visible.length === 0 ? <Empty text={archived ? "El Archivo está vacío." : view === "playing" ? "No tienes ninguna partida activa." : "Todavía no has añadido ningún videojuego."} /> : <div className="games-grid">{visible.map((game) => <GameCard key={game.id} game={game} archived={archived} busy={busy} open={() => void openGame(game.id)} favorite={() => void action(() => gamesApi.favorite(game.id, !game.favorite))} restore={() => void action(() => gamesApi.restore(game.id))} remove={() => { if (window.confirm(`¿Eliminar definitivamente “${game.name}”?`)) void action(() => gamesApi.delete(game.id)); }} />)}</div>}
    </>}

    {selected && <GameDetailModal detail={selected} busy={busy} archived={archived} close={() => setSelected(null)} edit={() => setForm("edit")} archive={() => void action(() => gamesApi.archive(selected.id)).then((ok) => { if (ok) setSelected(null); })} restore={() => void action(() => gamesApi.restore(selected.id)).then((ok) => { if (ok) setSelected(null); })} start={() => void action(async () => setSelected(await gamesApi.startRun(selected.id, today())))} finish={(run) => void action(async () => setSelected(await gamesApi.finishRun(run.id, today())))} addRun={() => setRunForm({ gameId: selected.id })} editRun={(run) => setRunForm({ gameId: selected.id, run })} deleteRun={(run) => { if (window.confirm("¿Eliminar esta partida del historial?")) void action(async () => setSelected(await gamesApi.deleteRun(run.id))); }} setCoverCrop={async (x, y, zoom) => action(async () => { await gamesApi.setCoverCrop(selected.id, x, y, zoom); setSelected(await gamesApi.get(selected.id)); })} />}
    {form && <GameForm game={form === "edit" ? selected : null} busy={busy} close={() => setForm(null)} save={async (input) => { setBusy(true); try { const saved = form === "edit" && selected ? await gamesApi.update(selected.id, input) : await gamesApi.create(input); if (form === "edit") setSelected(await gamesApi.get(saved.id)); await load(false); setError(null); return true; } catch (reason) { setError(gameErrorMessage(reason)); return false; } finally { setBusy(false); } }} />}
    {runForm && <RunForm run={runForm.run ?? null} busy={busy} close={() => setRunForm(null)} save={async (input) => { const ok = await action(async () => { const detail = runForm.run ? await gamesApi.updateRun(runForm.run.id, input) : await gamesApi.createRun(runForm.gameId, input); if (selected?.id === detail.id) setSelected(detail); }); return ok; }} />}
  </section>;
}

function Tab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Library; label: string; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick} type="button"><Icon size={16} />{label}</button>; }
function Empty({ text }: { text: string }) { return <div className="games-empty"><Gamepad2 size={30} /><strong>{text}</strong></div>; }

function GameCard({ game, archived, busy, open, favorite, restore, remove }: { game: Game; archived: boolean; busy: boolean; open: () => void; favorite: () => void; restore: () => void; remove: () => void }) {
  return <article className="game-card"><button className="game-card-open" onClick={open} type="button"><GameCoverImage alt={`Portada de ${game.name}`} gameId={game.id} hasCover={game.hasCover} positionX={game.coverPositionX} positionY={game.coverPositionY} zoom={game.coverZoom} /><div className="game-card-content"><span className={`game-status status-${game.status}`}>{gameStatusLabel(game.status)}</span><h3>{game.name}</h3><div className="game-card-meta"><span>{game.hasOpenRun ? "Partida en curso" : game.completedRuns === 0 ? "Sin partidas registradas" : `${game.completedRuns} ${game.completedRuns === 1 ? "partida" : "partidas"}`}</span><strong style={{ color: scoreColor(game.score) }}>{formatScore(game.score)}</strong></div></div></button>{!archived && <button aria-label={game.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} className={`game-favorite${game.favorite ? " active" : ""}`} disabled={busy} onClick={favorite} title={game.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} type="button"><Star fill={game.favorite ? "currentColor" : "none"} size={18} /></button>}{archived && <ArchiveItemActions busy={busy} itemLabel={game.name} remove={remove} restore={restore} />}</article>;
}

function GameDetailModal({ detail, busy, archived, close, edit, archive, restore, start, finish, addRun, editRun, deleteRun, setCoverCrop }: { detail: GameDetail; busy: boolean; archived: boolean; close: () => void; edit: () => void; archive: () => void; restore: () => void; start: () => void; finish: (run: GameRun) => void; addRun: () => void; editRun: (run: GameRun) => void; deleteRun: (run: GameRun) => void; setCoverCrop: (x: number, y: number, zoom: number) => Promise<boolean> }) {
  const openRun = detail.runs.find((run) => !run.finishedOn);
  const [detailView, setDetailView] = useState<"summary" | "history">("summary");
  const [positioningCover, setPositioningCover] = useState(false);
  return <><Modal className="game-detail-modal" labelledBy="game-detail-title" onClose={close}><header className="game-detail-header"><div className="game-detail-cover-wrap ui-cover-adjust-host"><GameCoverImage alt={`Portada de ${detail.name}`} className="detail" gameId={detail.id} hasCover={detail.hasCover} positionX={detail.coverPositionX} positionY={detail.coverPositionY} zoom={detail.coverZoom} />{!archived && detail.hasCover && <button aria-label="Ajustar encuadre de portada" className="ui-cover-adjust-button" onClick={() => setPositioningCover(true)} type="button"><Move size={14} /> Ajustar</button>}</div><div><span>VIDEOJUEGO</span><h2 id="game-detail-title">{detail.name}</h2><p>{gameStatusLabel(detail.status)}</p></div><div className="game-detail-actions"><button aria-label="Editar" className="game-icon-action" onClick={edit} title="Editar" type="button"><Edit3 size={17} /></button><button aria-label={archived ? "Restaurar" : "Archivar"} className="game-icon-action" disabled={busy} onClick={archived ? restore : archive} title={archived ? "Restaurar" : "Archivar"} type="button">{archived ? <RotateCcw size={17} /> : <Archive size={17} />}</button><button aria-label="Cerrar" className="game-icon-action" onClick={close} title="Cerrar" type="button"><X size={18} /></button></div></header>
    <TrackerDetailTabs onChange={setDetailView} value={detailView} />
    {detailView === "summary" ? <><TrackerMetricGrid metrics={[{ label: "Puntuación", value: formatScore(detail.score), color: scoreColor(detail.score) }, { label: "Partidas", value: detail.runs.length }, { label: "Estado", value: gameStatusLabel(detail.status) }]} /><section className="game-opinion"><h3>Opinión</h3><p>{detail.opinion || "Todavía no has escrito una opinión."}</p></section></> : <section className="game-runs"><header><div><h3>Historial de partidas</h3><p>Cada rejugada conserva sus propias fechas.</p></div>{!archived && <div>{openRun ? <button className="primary-button" disabled={busy} onClick={() => finish(openRun)} type="button">Terminar hoy</button> : <button className="primary-button" disabled={busy} onClick={start} type="button"><Gamepad2 size={16} /> Empezar hoy</button>}<button className="secondary-button" onClick={addRun} type="button"><Plus size={16} /> Registrar partida</button></div>}</header>
      {detail.runs.length === 0 ? <p className="game-muted">No hay partidas registradas.</p> : <div className="game-run-list">{detail.runs.map((run, index) => <article key={run.id}><div><strong>{run.finishedOn ? `Partida ${detail.runs.length - index}` : "Partida actual"}</strong><span>{formatGameDate(run.startedOn)} → {run.finishedOn ? formatGameDate(run.finishedOn) : "En curso"}</span></div>{!archived && <div><button aria-label="Editar partida" className="game-icon-action" onClick={() => editRun(run)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar partida" className="game-icon-action danger" onClick={() => deleteRun(run)} title="Eliminar" type="button"><Trash2 size={15} /></button></div>}</article>)}</div>}
    </section>}</Modal>{positioningCover && <CoverCropEditor busy={busy} close={() => setPositioningCover(false)} initial={{ x: detail.coverPositionX, y: detail.coverPositionY, zoom: detail.coverZoom }} landscape preview={(crop) => <GameCoverImage alt={`Portada de ${detail.name}`} gameId={detail.id} hasCover={detail.hasCover} positionX={crop.x} positionY={crop.y} zoom={crop.zoom} />} save={(crop) => setCoverCrop(crop.x, crop.y, crop.zoom)} title={detail.name} />}</>;
}

function GameForm({ game, busy, close, save }: { game: GameDetail | null; busy: boolean; close: () => void; save: (input: GameInput) => Promise<boolean> }) {
  const initial = useMemo<GameInput>(() => game ? { name: game.name, status: game.status, score: game.score, opinion: game.opinion, favorite: game.favorite, coverToken: null, removeCover: false } : emptyInput, [game]);
  const [draft, setDraft] = useState(initial); const [cover, setCover] = useState<PendingGameCover | null>(null); const [coverBusy, setCoverBusy] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial) || cover !== null;
  async function discard() { if (cover) await gamesApi.discardCover(cover.token).catch(() => undefined); }
  function requestClose() { if (!changed || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) { void discard(); close(); } }
  async function selectCover() { setCoverBusy(true); try { const selected = await gamesApi.selectCover(); if (!selected) return; await discard(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } finally { setCoverBusy(false); } }
  async function pasteCover(event: React.ClipboardEvent<HTMLElement>) { setCoverBusy(true); try { const bytes = await pastedCoverAsJpeg(event); if (!bytes) return; const selected = await gamesApi.preparePastedCover(bytes); await discard(); setCover(selected); setDraft({ ...draft, coverToken: selected.token, removeCover: false }); } catch (reason) { window.alert(gameErrorMessage(reason)); } finally { setCoverBusy(false); } }
  return <Modal className="game-form-modal" labelledBy="game-form-title" onClose={requestClose}><form onSubmit={async (event) => { event.preventDefault(); if (await save(draft)) { setCover(null); close(); } }}><header><div><h2 id="game-form-title">{game ? "Editar videojuego" : "Añadir videojuego"}</h2><p>Biblioteca personal</p></div><button aria-label="Cerrar" className="game-icon-action" onClick={requestClose} type="button"><X size={18} /></button></header>
    <fieldset><legend>Identificación</legend><label>Nombre<input autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre del videojuego" required value={draft.name} /></label></fieldset>
    <fieldset><legend>Seguimiento</legend><div className="game-form-grid"><label>Estado<SelectControl><select onChange={(e) => setDraft({ ...draft, status: e.target.value as GameStatus })} value={draft.status}>{gameStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></SelectControl></label><label>Puntuación (opcional)<div className="game-score-input" style={{ color: scoreColor(draft.score) }}><input inputMode="decimal" max={10} min={0} onChange={(e) => setDraft({ ...draft, score: e.target.value === "" ? null : e.target.valueAsNumber })} placeholder="8,5" step={0.1} type="number" value={draft.score ?? ""} /><span>/ 10</span></div></label></div></fieldset>
    <fieldset><legend>Opinión</legend><label><textarea onChange={(e) => setDraft({ ...draft, opinion: e.target.value || null })} placeholder="Qué te pareció..." rows={3} value={draft.opinion ?? ""} /></label></fieldset>
    <fieldset><legend>Portada</legend><div className="game-cover-field" onPaste={(event) => void pasteCover(event)} tabIndex={0}><div>{game?.hasCover && !draft.removeCover ? "Portada actual guardada" : cover ? cover.originalName : "Sin portada"}<span>Elige una imagen o pégala aquí con Ctrl+V. Se guardará como JPEG.</span></div><button className="secondary-button" disabled={coverBusy} onClick={() => void selectCover()} type="button"><ImagePlus size={16} />{coverBusy ? "Preparando…" : "Elegir imagen"}</button>{(game?.hasCover || cover) && <button className="secondary-button" onClick={() => { if (cover) void gamesApi.discardCover(cover.token).catch(() => undefined); setCover(null); setDraft({ ...draft, coverToken: null, removeCover: true }); }} type="button"><Trash2 size={16} /> Quitar</button>}</div></fieldset>
    <footer><button className="secondary-button" onClick={requestClose} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">{busy ? "Guardando…" : "Guardar"}</button></footer></form></Modal>;
}

function RunForm({ run, busy, close, save }: { run: GameRun | null; busy: boolean; close: () => void; save: (input: GameRunInput) => Promise<boolean> }) {
  const initial = useMemo<GameRunInput>(() => ({ startedOn: run?.startedOn ?? null, finishedOn: run?.finishedOn ?? null }), [run]); const [draft, setDraft] = useState(initial);
  const changed = JSON.stringify(initial) !== JSON.stringify(draft); function requestClose() { if (!changed || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) close(); }
  return <Modal className="game-run-modal" labelledBy="game-run-title" onClose={requestClose}><form onSubmit={async (event) => { event.preventDefault(); if (await save(draft)) close(); }}><header><div><h2 id="game-run-title">{run ? "Editar partida" : "Registrar partida"}</h2><p>Indica al menos una fecha.</p></div><button aria-label="Cerrar" className="game-icon-action" onClick={requestClose} type="button"><X size={18} /></button></header><div className="game-form-grid"><label>Fecha de inicio (opcional)<input onChange={(e) => setDraft({ ...draft, startedOn: e.target.value || null })} type="date" value={draft.startedOn ?? ""} /></label><label>Fecha final (opcional)<input onChange={(e) => setDraft({ ...draft, finishedOn: e.target.value || null })} type="date" value={draft.finishedOn ?? ""} /></label></div><footer><button className="secondary-button" onClick={requestClose} type="button">Cancelar</button><button className="primary-button" disabled={busy || (!draft.startedOn && !draft.finishedOn)} type="submit">Guardar</button></footer></form></Modal>;
}

function HistoryView({ entries, games, years, gameId, year, setGameId, setYear, edit, remove }: { entries: GameHistoryEntry[]; games: Game[]; years: string[]; gameId: string; year: string; setGameId: (value: string) => void; setYear: (value: string) => void; edit: (entry: GameHistoryEntry) => void; remove: (entry: GameHistoryEntry) => void }) {
  return <div><header className="games-view-heading"><span>TU HISTORIAL</span><h2>Partidas</h2><p>Primeras partidas y rejugadas, sin sobrescribir las anteriores.</p></header><div className="game-history-filters"><SelectControl><select aria-label="Filtrar por videojuego" onChange={(e) => setGameId(e.target.value)} value={gameId}><option value="">Todos los videojuegos</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></SelectControl><SelectControl><select aria-label="Filtrar por año" onChange={(e) => setYear(e.target.value)} value={year}><option value="">Todos los años</option>{years.map((item) => <option key={item}>{item}</option>)}</select></SelectControl></div>{entries.length === 0 ? <Empty text="Todavía no hay partidas en el historial." /> : <div className="game-history-list">{entries.map((entry) => <article key={entry.run.id}><CalendarDays size={18} /><div><strong>{entry.gameName}</strong><span>{formatGameDate(entry.run.startedOn)} → {entry.run.finishedOn ? formatGameDate(entry.run.finishedOn) : "En curso"}</span></div><div><button aria-label="Editar" className="game-icon-action" onClick={() => edit(entry)} title="Editar" type="button"><Edit3 size={15} /></button><button aria-label="Eliminar" className="game-icon-action danger" onClick={() => remove(entry)} title="Eliminar" type="button"><Trash2 size={15} /></button></div></article>)}</div>}</div>;
}

function Statistics({ data }: { data: GameStatistics | null }) { if (!data) return <Empty text="Cargando estadísticas…" />; return <div><header className="games-view-heading"><span>TU BIBLIOTECA</span><h2>Estadísticas</h2><p>Una vista sencilla de lo que juegas y rejuegas.</p></header><div className="game-stat-grid"><Stat label="Videojuegos" value={data.activeGames} /><Stat label="Jugando" value={data.playingGames} /><Stat label="Terminados" value={data.completedGames} /><Stat label="Rejugados" value={data.replayedGames} /><Stat label="Partidas" value={data.completedRuns} /><Stat label="Favoritos" value={data.favoriteGames} /><Stat label="Puntuación media" value={data.averageScore === null ? "—" : formatScore(data.averageScore)} color={scoreColor(data.averageScore)} /></div><section className="game-status-stats"><h3>Por estado</h3>{data.byStatus.map((item) => <div key={item.status}><span>{gameStatusLabel(item.status)}</span><strong>{item.count}</strong></div>)}</section></div>; }
function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) { return <div className="game-stat"><span>{label}</span><strong style={color ? { color } : undefined}>{value}</strong></div>; }
