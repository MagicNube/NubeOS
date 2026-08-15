import { Plus, X } from "lucide-react";
import { useState } from "react";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import type {
  HabitCategory,
  HabitIcon,
  HabitInput,
  HabitKind,
  HabitRecord,
  HabitSchedule,
} from "./api";
import {
  categories,
  iconOptions,
  nextMonday,
  todayIso,
  weekdays,
} from "./presentation";

type Draft = {
  name: string;
  kind: HabitKind;
  category: HabitCategory;
  icon: HabitIcon;
  startsOn: string;
  scheduleType: HabitSchedule["type"];
  target: string;
  weekdays: number[];
  monthlyDays: number[];
  monthlyDayInput: string;
};

function emptyDraft(): Draft {
  return {
    name: "",
    kind: "habit",
    category: "other",
    icon: "check",
    startsOn: todayIso(),
    scheduleType: "daily",
    target: "1",
    weekdays: [],
    monthlyDays: [],
    monthlyDayInput: "",
  };
}

export default function HabitForm({
  habit,
  busy,
  close,
  save,
}: {
  habit: HabitRecord | null;
  busy: boolean;
  close: () => void;
  save: (input: HabitInput) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    habit ? draftFromHabit(habit) : emptyDraft(),
  );
  const schedule = scheduleFromDraft(draft);
  const target = parsedTarget(draft);
  const candidateDay = Number.parseInt(draft.monthlyDayInput, 10);
  const canAddMonthlyDay =
    Number.isInteger(candidateDay) &&
    candidateDay >= 1 &&
    candidateDay <= 28 &&
    !draft.monthlyDays.includes(candidateDay) &&
    draft.monthlyDays.length < target;

  function toggleDay(day: number) {
    setDraft((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((value) => value !== day)
        : [...current.weekdays, day].sort(),
    }));
  }

  function changeScheduleType(type: HabitSchedule["type"]) {
    setDraft((current) => ({
      ...current,
      scheduleType: type,
      startsOn:
        !habit &&
        current.startsOn === todayIso() &&
        (type === "specificWeekdays" || type === "weeklyTarget")
          ? nextMonday(current.startsOn)
          : current.startsOn,
      weekdays:
        type === "specificWeekdays" && current.scheduleType === "daily"
          ? weekdays.map((day) => day.value)
          : type === "specificWeekdays" || type === "weeklyTarget"
            ? current.weekdays
            : [],
    }));
  }

  function changeTarget(value: string) {
    const nextTarget = Math.max(1, Number.parseInt(value || "1", 10));
    setDraft((current) => ({
      ...current,
      target: value,
      monthlyDays: current.monthlyDays.slice(0, nextTarget),
    }));
  }

  function addMonthlyDay() {
    if (!canAddMonthlyDay) return;
    setDraft((current) => ({
      ...current,
      monthlyDays: [...current.monthlyDays, candidateDay].sort(
        (left, right) => left - right,
      ),
      monthlyDayInput: "",
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      draft.scheduleType === "specificWeekdays" &&
      draft.weekdays.length === 0
    )
      return;
    save({
      name: draft.name,
      kind: draft.kind,
      category: draft.category,
      icon: draft.icon,
      startsOn: draft.startsOn,
      schedule,
    });
  }

  return (
    <Modal
      className="habit-form-modal"
      labelledBy="habit-form-title"
      onClose={close}
    >
      <form className="habit-form" onSubmit={submit}>
        <div className="habit-form-heading">
          <div>
            <p className="section-kicker">
              {habit ? "EDITAR ACTIVIDAD" : "NUEVA ACTIVIDAD"}
            </p>
            <h2 id="habit-form-title">
              {habit ? habit.name : "Crea algo que quieras mantener"}
            </h2>
          </div>
          <button aria-label="Cerrar" onClick={close} type="button">
            <X size={19} />
          </button>
        </div>

        <div className="habit-form-grid">
          <label className="habit-name-field">
            Nombre
            <input
              autoFocus
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Ej. Estudiar japonés"
              required
            />
          </label>
          <label>
            Tipo
            <SelectControl>
              <select
                value={draft.kind}
                onChange={(event) =>
                  setDraft({ ...draft, kind: event.target.value as HabitKind })
                }
              >
                <option value="habit">Hábito</option>
                <option value="routine">Tarea recurrente</option>
              </select>
            </SelectControl>
          </label>
          <label>
            Categoría
            <SelectControl>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    category: event.target.value as HabitCategory,
                  })
                }
              >
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SelectControl>
          </label>
          <label>
            Empieza el
            <input
              min={habit?.startsOn ?? todayIso()}
              onChange={(event) =>
                setDraft({ ...draft, startsOn: event.target.value })
              }
              required
              type="date"
              value={draft.startsOn}
            />
          </label>
          <label>
            Frecuencia
            <SelectControl>
              <select
                value={draft.scheduleType}
                onChange={(event) =>
                  changeScheduleType(
                    event.target.value as HabitSchedule["type"],
                  )
                }
              >
                <option value="daily">Todos los días</option>
                <option value="specificWeekdays">Días de la semana</option>
                <option value="weeklyTarget">X veces por semana</option>
                <option value="monthlyTarget">X veces al mes</option>
              </select>
            </SelectControl>
          </label>
        </div>

        {(draft.scheduleType === "specificWeekdays" ||
          draft.scheduleType === "weeklyTarget") && (
          <fieldset className="habit-weekday-field">
            <legend>
              {draft.scheduleType === "specificWeekdays"
                ? "Días que cuentan"
                : "Días habituales (opcional)"}
            </legend>
            <div>
              {weekdays.map((day) => (
                <button
                  aria-pressed={draft.weekdays.includes(day.value)}
                  className={draft.weekdays.includes(day.value) ? "active" : ""}
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  title={day.label}
                  type="button"
                >
                  {day.short}
                </button>
              ))}
            </div>
            <p>
              {draft.scheduleType === "weeklyTarget"
                ? "Podrás completarlo cualquier día; estos solo indican tu rutina habitual."
                : "Desmarca, por ejemplo, el domingo para excluirlo de un hábito diario."}
            </p>
          </fieldset>
        )}

        {(draft.scheduleType === "weeklyTarget" ||
          draft.scheduleType === "monthlyTarget") && (
          <div className="habit-target-fields">
            <label>
              Objetivo (
              {draft.scheduleType === "weeklyTarget" ? "por semana" : "por mes"}
              )
              <input
                inputMode="numeric"
                min="1"
                max={draft.scheduleType === "weeklyTarget" ? "7" : "31"}
                onChange={(event) => changeTarget(event.target.value)}
                placeholder="1"
                required
                type="number"
                value={draft.target}
              />
            </label>
          </div>
        )}

        {draft.scheduleType === "monthlyTarget" && (
          <fieldset className="habit-month-days-field">
            <legend>Días orientativos (opcional)</legend>
            <div className="habit-month-day-entry">
              <input
                inputMode="numeric"
                max="28"
                min="1"
                onChange={(event) =>
                  setDraft({ ...draft, monthlyDayInput: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMonthlyDay();
                  }
                }}
                placeholder="Día del mes (1–28)"
                type="number"
                value={draft.monthlyDayInput}
              />
              <button
                aria-label="Añadir día orientativo"
                disabled={!canAddMonthlyDay}
                onClick={addMonthlyDay}
                type="button"
              >
                <Plus size={17} /> Añadir
              </button>
            </div>
            {draft.monthlyDays.length > 0 && (
              <div className="habit-month-day-chips">
                {draft.monthlyDays.map((day) => (
                  <button
                    aria-label={`Quitar el día ${day}`}
                    key={day}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        monthlyDays: draft.monthlyDays.filter(
                          (value) => value !== day,
                        ),
                      })
                    }
                    type="button"
                  >
                    Día {day} <X size={13} />
                  </button>
                ))}
              </div>
            )}
            <p>
              Puedes añadir hasta {target}. Solo indican cuándo pasa a estar
              pendiente cada realización; podrás completarla antes.
            </p>
          </fieldset>
        )}

        <div className="habit-icon-field">
          <span>Icono</span>
          <div>
            {iconOptions.map(({ value, label, icon: Icon }) => (
              <button
                aria-label={label}
                aria-pressed={draft.icon === value}
                className={draft.icon === value ? "active" : ""}
                key={value}
                onClick={() => setDraft({ ...draft, icon: value })}
                title={label}
                type="button"
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {habit && (
          <p className="habit-edit-note">
            Los cambios de frecuencia empiezan hoy. La fecha de inicio solo
            puede cambiar mientras no haya registros.
          </p>
        )}
        <div className="habit-form-actions">
          <button className="secondary-button" onClick={close} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={
              busy ||
              !draft.name.trim() ||
              !draft.startsOn ||
              (draft.scheduleType === "specificWeekdays" &&
                draft.weekdays.length === 0)
            }
            type="submit"
          >
            {habit ? "Guardar cambios" : "Crear actividad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function parsedTarget(draft: Draft) {
  const target = Math.max(1, Number.parseInt(draft.target || "1", 10));
  return Math.min(draft.scheduleType === "weeklyTarget" ? 7 : 31, target);
}

function scheduleFromDraft(draft: Draft): HabitSchedule {
  const target = parsedTarget(draft);
  if (draft.scheduleType === "daily") return { type: "daily" };
  if (draft.scheduleType === "specificWeekdays")
    return { type: "specificWeekdays", weekdays: draft.weekdays };
  if (draft.scheduleType === "weeklyTarget")
    return {
      type: "weeklyTarget",
      target,
      preferredWeekdays: draft.weekdays,
    };
  return {
    type: "monthlyTarget",
    target,
    preferredDays: draft.monthlyDays.slice(0, target),
  };
}

function draftFromHabit(habit: HabitRecord): Draft {
  const schedule = habit.schedule;
  return {
    name: habit.name,
    kind: habit.kind,
    category: habit.category,
    icon: habit.icon,
    startsOn: habit.startsOn,
    scheduleType: schedule.type,
    target:
      schedule.type === "weeklyTarget" || schedule.type === "monthlyTarget"
        ? String(schedule.target)
        : "1",
    weekdays:
      schedule.type === "specificWeekdays"
        ? schedule.weekdays
        : schedule.type === "weeklyTarget"
          ? schedule.preferredWeekdays
          : [],
    monthlyDays:
      schedule.type === "monthlyTarget" ? schedule.preferredDays : [],
    monthlyDayInput: "",
  };
}
