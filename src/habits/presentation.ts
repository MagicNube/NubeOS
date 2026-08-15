import {
  Backpack,
  Bath,
  BatteryCharging,
  BedDouble,
  BedSingle,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Droplets,
  Dumbbell,
  Heart,
  Home,
  Languages,
  Moon,
  Scissors,
  Shirt,
  ShowerHead,
  Sparkles,
  WashingMachine,
  Vibrate,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  HabitCategory,
  HabitIcon,
  HabitSchedule,
  HabitStatistic,
} from "./api";

export const weekdays = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
];

export const categories: Array<{ value: HabitCategory; label: string }> = [
  { value: "health", label: "Salud" },
  { value: "sport", label: "Deporte" },
  { value: "learning", label: "Aprendizaje" },
  { value: "personalCare", label: "Cuidado personal" },
  { value: "home", label: "Hogar" },
  { value: "organization", label: "Organización" },
  { value: "leisure", label: "Ocio" },
  { value: "other", label: "Otros" },
];

export const categoryLabel = Object.fromEntries(
  categories.map(({ value, label }) => [value, label]),
) as Record<HabitCategory, string>;

export const iconOptions: Array<{
  value: HabitIcon;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "check", label: "General", icon: CheckCircle2 },
  { value: "book", label: "Lectura", icon: BookOpen },
  { value: "languages", label: "Idiomas", icon: Languages },
  { value: "dumbbell", label: "Deporte", icon: Dumbbell },
  { value: "heart", label: "Salud", icon: Heart },
  { value: "sparkles", label: "Cuidado", icon: Sparkles },
  { value: "home", label: "Hogar", icon: Home },
  { value: "battery", label: "Carga", icon: BatteryCharging },
  { value: "droplets", label: "Agua", icon: Droplets },
  { value: "moon", label: "Descanso", icon: Moon },
  { value: "backpack", label: "Mochila", icon: Backpack },
  { value: "calendarRange", label: "Planificación", icon: CalendarRange },
  { value: "scissors", label: "Cuidado personal", icon: Scissors },
  { value: "washingMachine", label: "Lavadora", icon: WashingMachine },
  { value: "bedDouble", label: "Cama", icon: BedDouble },
  { value: "shirt", label: "Ropa", icon: Shirt },
  { value: "razor", label: "Máquina de afeitar", icon: Vibrate },
  { value: "bedSingle", label: "Sábanas", icon: BedSingle },
  { value: "bath", label: "Toallas", icon: Bath },
  { value: "shower", label: "Ducha", icon: ShowerHead },
];

export const iconById = Object.fromEntries(
  iconOptions.map((option) => [option.value, option.icon]),
) as Record<HabitIcon, LucideIcon>;

export function scheduleLabel(schedule: HabitSchedule) {
  if (schedule.type === "daily") return "Todos los días";
  if (schedule.type === "specificWeekdays") {
    return schedule.weekdays
      .map((day) => weekdays.find((item) => item.value === day)?.short)
      .join(", ");
  }
  if (schedule.type === "weeklyTarget")
    return `${schedule.target} ${schedule.target === 1 ? "vez" : "veces"} por semana`;
  return `${schedule.target} ${schedule.target === 1 ? "vez" : "veces"} al mes`;
}

export function isFlexible(schedule: HabitSchedule) {
  return schedule.type === "weeklyTarget" || schedule.type === "monthlyTarget";
}

export function progressPeriodLabel(schedule: HabitSchedule) {
  return schedule.type === "monthlyTarget" ? "este mes" : "esta semana";
}

export function completionText(done: number, target: number) {
  if (target === 0) return "Sin obligación";
  return done >= target ? "Objetivo cumplido" : `${target - done} pendientes`;
}

export function streakUnit(unit: HabitStatistic["streakUnit"], value: number) {
  if (unit === "day") return value === 1 ? "día" : "días";
  if (unit === "week") return value === 1 ? "semana" : "semanas";
  return value === 1 ? "mes" : "meses";
}

export function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}
export function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function todayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}
export function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return iso(date);
}
export function nextMonday(value: string) {
  const date = parseDate(value);
  const daysFromMonday = (date.getDay() + 6) % 7;
  return addDays(value, daysFromMonday === 0 ? 0 : 7 - daysFromMonday);
}
export function addMonths(value: string, months: number) {
  const date = parseDate(value);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return iso(date);
}
export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDate(value));
}
export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" })
    .format(parseDate(value))
    .replace(".", "");
}
export function formatMonth(value: string) {
  const text = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(parseDate(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export function weekdayShort(value: string) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "short" })
    .format(parseDate(value))
    .replace(".", "");
}
export function dayNumber(value: string) {
  return parseDate(value).getDate();
}
export function between(value: string, start: string, end: string) {
  return value >= start && value <= end;
}
export function sameMonth(left: string, right: string) {
  return left.slice(0, 7) === right.slice(0, 7);
}
