import { useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  GripVertical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import SelectControl from "../ui/SelectControl";
import { habitsApi } from "./api";
import type { HabitCategory, HabitKind, HabitRecord } from "./api";
import {
  categories,
  categoryLabel,
  formatShortDate,
  iconById,
  scheduleLabel,
  todayIso,
} from "./presentation";
import { HabitsEmpty } from "./TrackingViews";

export default function CatalogView({
  archived,
  setArchived,
  items,
  search,
  setSearch,
  category,
  setCategory,
  kind,
  setKind,
  edit,
  run,
  reload,
}: {
  archived: boolean;
  setArchived: (value: boolean) => void;
  items: HabitRecord[];
  search: string;
  setSearch: (value: string) => void;
  category: HabitCategory | "";
  setCategory: (value: HabitCategory | "") => void;
  kind: HabitKind | "";
  setKind: (value: HabitKind | "") => void;
  edit: (habit: HabitRecord) => void;
  run: (operation: () => Promise<unknown>) => Promise<boolean>;
  reload: (initial?: boolean) => Promise<void>;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const pointerDrag = useRef<{
    id: string;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const canReorder = !archived && !search && !category && !kind;

  async function drop(targetId: string, draggedId: string | null = dragging) {
    if (!draggedId || draggedId === targetId || !canReorder) return;
    const next = [...items];
    const from = next.findIndex((item) => item.id === draggedId);
    const to = next.findIndex((item) => item.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragging(null);
    await run(() => habitsApi.reorder(next.map((item) => item.id)));
    await reload(false);
  }
  function startPointerDrag(event: React.PointerEvent, id: string) {
    if (!canReorder || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDrag.current = {
      id,
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
  }
  function movePointerDrag(event: React.PointerEvent) {
    const state = pointerDrag.current;
    if (!state) return;
    if (
      !state.active &&
      Math.hypot(event.clientX - state.x, event.clientY - state.y) < 5
    )
      return;
    if (!state.active) {
      state.active = true;
      setDragging(state.id);
    }
    setDragPoint({ x: event.clientX, y: event.clientY });
    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-habit-id]"))
      .find((element) => element && element.dataset.habitId !== state.id);
    setDropTarget(target?.dataset.habitId ?? null);
    const content = document.querySelector<HTMLElement>(".content");
    if (content && event.clientY < 90) content.scrollBy({ top: -12 });
    if (content && event.clientY > window.innerHeight - 70)
      content.scrollBy({ top: 12 });
  }
  async function endPointerDrag() {
    const state = pointerDrag.current;
    pointerDrag.current = null;
    const target = dropTarget;
    setDropTarget(null);
    setDragPoint(null);
    setDragging(null);
    if (state?.active && target) await drop(target, state.id);
  }
  function cancelPointerDrag() {
    pointerDrag.current = null;
    setDropTarget(null);
    setDragPoint(null);
    setDragging(null);
  }

  return (
    <div className="habit-catalog">
      <div className="habit-catalog-heading">
        <div>
          <p className="section-kicker">
            {archived ? "ACTIVIDADES RETIRADAS" : "TU SISTEMA"}
          </p>
          <h2>{archived ? "Archivo" : "Tus actividades"}</h2>
        </div>
        <button
          className="ui-archive-toggle"
          onClick={() => setArchived(!archived)}
          type="button"
        >
          {archived ? <ArrowLeft size={17} /> : <Archive size={17} />}
          {archived ? "Volver" : "Archivo"}
        </button>
      </div>
      <div className="habit-filters">
        <label>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar actividades"
          />
        </label>
        <SelectControl>
          <select
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as HabitCategory | "")
            }
          >
            <option value="">Todas las categorías</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SelectControl>
        <SelectControl>
          <select
            aria-label="Filtrar por tipo"
            value={kind}
            onChange={(event) => setKind(event.target.value as HabitKind | "")}
          >
            <option value="">Hábitos y rutinas</option>
            <option value="habit">Hábitos</option>
            <option value="routine">Tareas recurrentes</option>
          </select>
        </SelectControl>
      </div>
      {items.length === 0 ? (
        <HabitsEmpty archived={archived} />
      ) : (
        <div className="habit-catalog-list">
          {items.map((habit) => {
            const Icon = iconById[habit.icon];
            return (
              <article
                className={`habit-catalog-row ${habit.status} ${dragging === habit.id ? "dragging" : ""} ${dropTarget === habit.id ? "drop-target" : ""}`}
                data-habit-id={habit.id}
                key={habit.id}
              >
                <GripVertical
                  className="habit-drag"
                  onPointerCancel={cancelPointerDrag}
                  onPointerDown={(event) => startPointerDrag(event, habit.id)}
                  onPointerMove={movePointerDrag}
                  onPointerUp={() => void endPointerDrag()}
                  size={18}
                />
                <div className="habit-row-icon">
                  <Icon size={19} />
                </div>
                <div className="habit-catalog-copy">
                  <strong>{habit.name}</strong>
                  <span>
                    {habit.kind === "habit" ? "Hábito" : "Tarea recurrente"}{" "}
                    <i>({categoryLabel[habit.category]})</i>
                  </span>
                  {habit.startsOn > todayIso() && (
                    <small>Empieza el {formatShortDate(habit.startsOn)}</small>
                  )}
                </div>
                <span className="habit-schedule-pill">
                  {scheduleLabel(habit.schedule)}
                </span>
                {habit.status === "paused" && (
                  <span className="habit-paused-pill">En pausa</span>
                )}
                <div className="habit-catalog-actions">
                  {archived ? (
                    <>
                      <button
                        onClick={() =>
                          void run(() => habitsApi.restore(habit.id))
                        }
                        title="Restaurar"
                        type="button"
                      >
                        <RotateCcw size={17} />
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar definitivamente “${habit.name}” y todo su historial?`,
                            )
                          )
                            void run(() => habitsApi.delete(habit.id));
                        }}
                        title="Eliminar definitivamente"
                        type="button"
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => edit(habit)}
                        title="Editar"
                        type="button"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        onClick={() =>
                          void run(() =>
                            habit.status === "paused"
                              ? habitsApi.resume(habit.id)
                              : habitsApi.pause(habit.id),
                          )
                        }
                        title={
                          habit.status === "paused" ? "Reanudar" : "Pausar"
                        }
                        type="button"
                      >
                        {habit.status === "paused" ? (
                          <Play size={17} />
                        ) : (
                          <Pause size={17} />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          void run(() => habitsApi.archive(habit.id))
                        }
                        title="Archivar"
                        type="button"
                      >
                        <Archive size={17} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {dragging && dragPoint && (
        <div
          className="habit-drag-preview"
          style={{ left: dragPoint.x + 14, top: dragPoint.y + 14 }}
        >
          {items.find((item) => item.id === dragging)?.name}
        </div>
      )}
      {!canReorder && !archived && items.length > 1 && (
        <p className="habit-reorder-help">
          Limpia los filtros para reordenar mediante arrastre.
        </p>
      )}
    </div>
  );
}
