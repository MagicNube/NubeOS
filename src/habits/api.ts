import { invoke } from "@tauri-apps/api/core";

export type HabitKind = "habit" | "routine";
export type HabitCategory =
  | "health"
  | "sport"
  | "learning"
  | "personalCare"
  | "home"
  | "organization"
  | "leisure"
  | "other";
export type HabitIcon =
  | "check"
  | "book"
  | "languages"
  | "dumbbell"
  | "heart"
  | "sparkles"
  | "home"
  | "battery"
  | "droplets"
  | "moon"
  | "backpack"
  | "calendarRange"
  | "scissors"
  | "washingMachine"
  | "bedDouble"
  | "shirt"
  | "razor"
  | "bedSingle"
  | "bath"
  | "shower";
export type HabitStatus = "active" | "paused" | "archived";
export type HabitLogState = "completed" | "skipped";

export type HabitSchedule =
  | { type: "daily" }
  | { type: "specificWeekdays"; weekdays: number[] }
  | { type: "weeklyTarget"; target: number; preferredWeekdays: number[] }
  | { type: "monthlyTarget"; target: number; preferredDays: number[] };

export type HabitRecord = {
  id: string;
  name: string;
  kind: HabitKind;
  category: HabitCategory;
  icon: HabitIcon;
  status: HabitStatus;
  position: number;
  createdOn: string;
  startsOn: string;
  schedule: HabitSchedule;
};

export type HabitInput = Omit<
  HabitRecord,
  "id" | "status" | "position" | "createdOn"
>;

export type HabitProgress = {
  completed: number;
  target: number;
  effectiveTarget: number;
  neutral: boolean;
  partial: boolean;
};
export type HabitOverviewCell = {
  date: string;
  applicable: boolean;
  preferred: boolean;
  state: HabitLogState | null;
  canEdit: boolean;
};
export type HabitOverviewRow = {
  habit: HabitRecord;
  cells: HabitOverviewCell[];
  progress: HabitProgress;
  lastCompletedOn: string | null;
  nextDueOn: string | null;
};
export type HabitOverview = {
  start: string;
  end: string;
  today: string;
  rows: HabitOverviewRow[];
};

export type HabitStatistic = {
  habit: HabitRecord;
  completedCount: number;
  effectiveOpportunities: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  streakUnit: "day" | "week" | "month";
  currentProgress: HabitProgress;
  lastCompletedOn: string | null;
  sampleSize: number;
};
export type HabitStatisticsOverview = {
  rangeStart: string;
  rangeEnd: string;
  items: HabitStatistic[];
  averageCompletionRate: number;
  mostConsistentId: string | null;
  needsAttentionId: string | null;
};

export type HabitStatisticsPeriod =
  | "week"
  | "month"
  | "year"
  | "all"
  | "custom";

export const habitsApi = {
  list: (input: {
    archived: boolean;
    search?: string | null;
    category?: HabitCategory | null;
    kind?: HabitKind | null;
  }) => invoke<HabitRecord[]>("list_habits", { input }),
  create: (input: HabitInput) => invoke<HabitRecord>("create_habit", { input }),
  update: (habitId: string, input: HabitInput) =>
    invoke<HabitRecord>("update_habit", { habitId, input }),
  setLog: (habitId: string, date: string, logState: HabitLogState | null) =>
    invoke<void>("set_habit_log", { habitId, date, logState }),
  pause: (habitId: string) => invoke<void>("pause_habit", { habitId }),
  resume: (habitId: string) => invoke<void>("resume_habit", { habitId }),
  archive: (habitId: string) => invoke<void>("archive_habit", { habitId }),
  restore: (habitId: string) => invoke<void>("restore_habit", { habitId }),
  delete: (habitId: string) => invoke<void>("delete_habit", { habitId }),
  reorder: (habitIds: string[]) => invoke<void>("reorder_habits", { habitIds }),
  overview: (view: "day" | "week" | "month", anchorDate: string) =>
    invoke<HabitOverview>("get_habits_overview", {
      input: { view, anchorDate },
    }),
  statistics: (input: {
    period: HabitStatisticsPeriod;
    fromDate?: string | null;
    toDate?: string | null;
  }) => invoke<HabitStatisticsOverview>("get_habit_statistics", { input }),
};

export function habitErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error)
    return String((error as { message: unknown }).message);
  return typeof error === "string"
    ? error
    : "No se ha podido completar la operación.";
}
