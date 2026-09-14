// Isolated browser regression: /tests/general-review.html. No Tauri or personal data.
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App";
import { habitsApi, type HabitRecord } from "../src/habits/api";
import { documentApi } from "../src/documents/api";
import { mealsApi } from "../src/meals/api";
import { productApi } from "../src/meals/products/api";
import { readingApi } from "../src/reading/api";
import { gamesApi } from "../src/games/api";
import { mediaApi } from "../src/media/api";
import { confirmAction } from "../src/ui/confirmAction";
import "../src/styles.css";

const RealDate = Date;
let now = "2026-09-13T21:59:00Z"; // Sunday, 23:59 in Madrid.
// Only the fixture clock is replaced; app code remains unchanged.
class FixedDate extends RealDate {
  constructor(...args: any[]) { super(...(args.length ? args : [now]) as [any]); }
  static now() { return new RealDate(now).getTime(); }
}
globalThis.Date = FixedDate as DateConstructor;
const day = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const macros = { proteinGrams: 12, carbohydrateGrams: 20, fatGrams: 3, kilocalories: 155 };
const items: HabitRecord[] = ["Gimnasio", "Leer", "Ordenar la mesa"].map((name, position) => ({
  id: `habit-${position}`, name, kind: position === 2 ? "routine" : "habit", category: position === 0 ? "sport" : "learning",
  icon: position === 0 ? "dumbbell" : "book", status: position === 1 ? "paused" : "active", position,
  createdOn: "2026-09-01", startsOn: "2026-09-01", schedule: { type: "weeklyTarget", target: 4, preferredWeekdays: [1, 3, 5, 6] },
}));
let rejectLog = true;
const writes: string[] = [], weeks: string[] = [];
habitsApi.list = async ({ archived, search, category, kind }) => items.filter(item => (item.status === "archived") === archived && (!search || item.name.toLowerCase().includes(search.toLowerCase())) && (!category || item.category === category) && (!kind || item.kind === kind));
habitsApi.overview = async (_view, date) => ({ start: date, end: date, today: day(), rows: items.filter(item => item.status === "active").map(habit => ({ habit: { ...habit }, cells: [{ date, applicable: true, preferred: true, state: null, canEdit: true }], progress: { completed: 0, target: 4, effectiveTarget: 4, neutral: false }, lastCompletedOn: null, nextDueOn: date })) });
habitsApi.setLog = async (_id, date) => { writes.push(date); if (rejectLog) throw "No se pudo guardar el hábito (prueba)."; };
habitsApi.pause = async id => { items.find(item => item.id === id)!.status = "paused"; };
habitsApi.resume = async id => { items.find(item => item.id === id)!.status = "active"; };
habitsApi.pauseAll = async () => { const active = items.filter(item => item.status === "active"); active.forEach(item => item.status = "paused"); return active.length; };
documentApi.list = async () => [];
documentApi.listTags = async () => [];
documentApi.expirySummary = async () => ({ expired: 0, expiringSoon: 0 });
mediaApi.list = async () => [];
readingApi.list = async () => [];
gamesApi.list = async () => [];
productApi.list = async () => [];
mealsApi.listMeals = async status => status === "archived" ? [{ id: "archived-recipe", name: "Arroz con verduras", status: "archived", ingredients: [], macros, recommendedSlots: [] }] : [];
mealsApi.listWeek = async weekStart => { weeks.push(weekStart); return { weekStart, dailyMacros: [], weeklyMacros: macros, instances: [
  { id: "direct", weekday: day() === "2026-09-13" ? 6 : 0, slot: "breakfast", position: 0, isModified: false, isRecipeUpdated: false, ingredients: [{ productId: "banana", productName: "Plátano", quantity: 1, unit: "units", macros }], macros },
  { id: "recipe", weekday: day() === "2026-09-13" ? 6 : 0, slot: "lunch", position: 0, sourceMealId: "archived-recipe", isModified: false, isRecipeUpdated: false, ingredients: [], macros },
] }; };
mealsApi.listShoppingList = async () => ({ entries: [], estimatedTotalCents: 0, pendingEstimatedTotalCents: 0 });

createRoot(document.getElementById("root")!).render(<App />);
const output = document.createElement("output");
output.id = "review-result";
output.style.cssText = "position:fixed;bottom:4px;right:8px;z-index:10000;padding:6px 10px;background:#18131f;color:#ddd6fe;font:12px system-ui;border:1px solid #8b5cf6;border-radius:6px;max-width:80vw";
output.textContent = "Comprobando…";
document.body.append(output);
const pause = () => new Promise(resolve => setTimeout(resolve, 30));
async function until(check: () => unknown) { for (let i = 0; i < 120; i++) { if (check()) return; await pause(); } throw Error("Timeout esperando la interfaz"); }
function check(value: unknown, message: string) { if (!value) throw Error(message); }
function button(label: string) { const value = [...document.querySelectorAll<HTMLButtonElement>("button")].find(element => element.textContent?.trim() === label || element.getAttribute("aria-label") === label); if (!value) throw Error(`Botón ausente: ${label}`); return value; }
async function run() {
  await until(() => document.querySelector(".dashboard-habit-list button"));
  check(document.querySelector("h1")?.textContent === "Inicio", "Cabecera Inicio");
  check(document.querySelector(".dashboard-meal-list")?.textContent?.includes("Plátano"), "Nombre producto directo");
  check(document.querySelector(".dashboard-meal-list")?.textContent?.includes("Arroz con verduras"), "Nombre receta archivada");
  (document.querySelector(".dashboard-habit-list button") as HTMLButtonElement).click();
  await until(() => document.querySelector('[role="alert"]'));
  check(document.querySelector('[role="alert"]')?.textContent?.includes("No se pudo guardar"), "Aviso error escritura");
  rejectLog = false;
  const count = writes.length;
  now = "2026-09-13T22:01:00Z"; // Monday, next week; click the stale row before refresh.
  (document.querySelector(".dashboard-habit-list button") as HTMLButtonElement).click();
  await until(() => weeks.includes("2026-09-14") && document.querySelector(".dashboard-habit-list button"));
  check(writes.length === count, "No escribir ayer al cambiar de día");
  (document.querySelector(".dashboard-habit-list button") as HTMLButtonElement).click();
  await until(() => writes.length > count);
  check(writes.at(-1) === "2026-09-14", "Escribir hoy después de refrescar");
  button("Hábitos").click();
  await until(() => [...document.querySelectorAll("button")].some(element => element.textContent === "Actividades"));
  button("Actividades").click();
  await until(() => document.querySelector('[data-habit-id="habit-0"] .habit-schedule-pill'));
  const schedule = () => document.querySelector('[data-habit-id="habit-0"] .habit-schedule-pill') as HTMLElement;
  const before = schedule().getBoundingClientRect().x;
  button("Pausar Gimnasio").click();
  await until(() => document.querySelector('[aria-label="Reanudar Gimnasio (en pausa)"]'));
  check(Math.abs(schedule().getBoundingClientRect().x - before) < 1, "La frecuencia no se mueve");
  check(getComputedStyle(schedule()).fontSize === "14px", "Frecuencia 14px");
  await until(() => getComputedStyle(button("Reanudar Gimnasio (en pausa)")).opacity === "1");
  const confirmation = confirmAction({ title: "Prueba de Atrás", message: "Datos ficticios", confirmLabel: "Eliminar", destructive: true });
  window.dispatchEvent(new MouseEvent("mouseup", { button: 3, bubbles: true, cancelable: true }));
  check(await confirmation === false, "Atrás cancela alertdialog");
  check(document.querySelector("h1")?.textContent === "Hábitos", "Atrás conserva módulo");
  const lower = confirmAction({ title: "Confirmación inferior", message: "Datos ficticios", confirmLabel: "Continuar" });
  const upper = confirmAction({ title: "Confirmación superior", message: "Datos ficticios", confirmLabel: "Eliminar", destructive: true });
  window.dispatchEvent(new MouseEvent("mouseup", { button: 3, bubbles: true, cancelable: true }));
  check(await upper === false, "Atrás cancela solo la capa superior");
  check(document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length === 1, "La capa inferior permanece");
  window.dispatchEvent(new MouseEvent("mouseup", { button: 3, bubbles: true, cancelable: true }));
  check(await lower === false, "Atrás cancela después la capa inferior");
  button("Pausar todos").click();
  await until(() => items.every(item => item.status === "paused"));
  check(items.length === 3, "Pausa masiva incluye tareas recurrentes");
  output.textContent = "Regresión General correcta · datos ficticios";
  output.dataset.result = "passed";
}
run().catch(error => { output.textContent = String(error); output.dataset.result = "failed"; console.error(error); });
