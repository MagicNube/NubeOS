import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  ShoppingBasket,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";

type SlotId = "breakfast" | "lunch" | "snack" | "dinner" | "extra";
type FoodCategory = "verdura" | "fruta" | "yogures" | "carne" | "pescado" | "cereales" | "otro";
type Macros = { kcal: number; protein: number; carbs: number; fat: number };

type Food = Macros & {
  id: string;
  name: string;
  category: FoodCategory;
  packageGrams: number;
  purchaseUnit: string;
};

type RecipeIngredient = { foodId: string; grams: number };
type Meal = { id: string; name: string; ingredients: RecipeIngredient[] };
type PlanEntry = { id: string; mealId: string; grams: Record<string, number> };
type DayPlan = Record<SlotId, PlanEntry[]>;
type Plan = Record<string, DayPlan>;
type CalendarDay = { key: string; label: string; date: Date; number: string; isToday: boolean };

const slots: { id: SlotId; label: string; hint: string }[] = [
  { id: "breakfast", label: "Desayuno", hint: "08:00" },
  { id: "lunch", label: "Comida", hint: "14:00" },
  { id: "snack", label: "Merienda", hint: "18:00" },
  { id: "dinner", label: "Cena", hint: "21:00" },
  { id: "extra", label: "Extra", hint: "Flexible" },
];

const categoryLabels: Record<FoodCategory, string> = {
  verdura: "Verdura",
  fruta: "Fruta",
  yogures: "Yogures",
  carne: "Carne",
  pescado: "Pescado",
  cereales: "Cereales",
  otro: "Otro",
};

const categoryOrder: FoodCategory[] = ["verdura", "fruta", "yogures", "carne", "pescado", "cereales", "otro"];
const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthLabels = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const initialFoods: Food[] = [
  { id: "peppers", name: "Pimientos mix", category: "verdura", kcal: 30, protein: 1.2, carbs: 5.5, fat: 0.2, packageGrams: 360, purchaseUnit: "bolsa" },
  { id: "onion", name: "Cebolla", category: "verdura", kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, packageGrams: 180, purchaseUnit: "ud" },
  { id: "chicken-slices", name: "Pollo en lonchas", category: "carne", kcal: 110, protein: 23, carbs: 1, fat: 1.5, packageGrams: 200, purchaseUnit: "pack" },
  { id: "tortillas", name: "Tortillas de trigo", category: "cereales", kcal: 310, protein: 8, carbs: 52, fat: 7, packageGrams: 360, purchaseUnit: "pack" },
  { id: "greek-yogurt", name: "Yogur griego", category: "yogures", kcal: 76, protein: 10, carbs: 4, fat: 2, packageGrams: 500, purchaseUnit: "tarrina" },
  { id: "oats", name: "Copos de avena", category: "cereales", kcal: 372, protein: 13, carbs: 60, fat: 7, packageGrams: 500, purchaseUnit: "bolsa" },
  { id: "banana", name: "Plátano", category: "fruta", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, packageGrams: 120, purchaseUnit: "ud" },
  { id: "peanut-butter", name: "Crema de cacahuete", category: "otro", kcal: 588, protein: 25, carbs: 20, fat: 50, packageGrams: 350, purchaseUnit: "bote" },
  { id: "pasta", name: "Pasta", category: "cereales", kcal: 350, protein: 12, carbs: 70, fat: 1.5, packageGrams: 500, purchaseUnit: "pack" },
  { id: "chicken-breast", name: "Pechuga de pollo", category: "carne", kcal: 120, protein: 23, carbs: 0, fat: 2.6, packageGrams: 360, purchaseUnit: "bandeja" },
  { id: "pesto", name: "Pesto", category: "otro", kcal: 420, protein: 4, carbs: 7, fat: 42, packageGrams: 190, purchaseUnit: "bote" },
  { id: "cherry-tomato", name: "Tomate cherry", category: "verdura", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, packageGrams: 250, purchaseUnit: "tarrina" },
];

const initialMeals: Meal[] = [
  {
    id: "fajitas",
    name: "Fajitas de pollo",
    ingredients: [
      { foodId: "peppers", grams: 180 }, { foodId: "onion", grams: 90 }, { foodId: "chicken-slices", grams: 100 }, { foodId: "tortillas", grams: 180 },
    ],
  },
  {
    id: "yogurt-bowl",
    name: "Bowl de yogur proteico",
    ingredients: [
      { foodId: "greek-yogurt", grams: 250 }, { foodId: "oats", grams: 70 }, { foodId: "banana", grams: 120 }, { foodId: "peanut-butter", grams: 20 },
    ],
  },
  {
    id: "pasta-pesto",
    name: "Pasta de pollo y pesto",
    ingredients: [
      { foodId: "pasta", grams: 120 }, { foodId: "chicken-breast", grams: 180 }, { foodId: "pesto", grams: 35 }, { foodId: "cherry-tomato", grams: 125 },
    ],
  },
];

function localDate(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const result = localDate(date);
  result.setDate(result.getDate() + days);
  return result;
}

function mondayOf(date: Date) {
  const result = localDate(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function getWeek(weekStart: Date, todayKey: string): CalendarDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { key: dateKey(date), label: weekdayLabels[index], number: String(date.getDate()), date, isToday: dateKey(date) === todayKey };
  });
}

function formatWeekRange(days: CalendarDay[]) {
  const first = days[0].date;
  const last = days[6].date;
  if (first.getMonth() === last.getMonth()) return `${first.getDate()} — ${last.getDate()} ${monthLabels[last.getMonth()]}`;
  return `${first.getDate()} ${monthLabels[first.getMonth()]} — ${last.getDate()} ${monthLabels[last.getMonth()]}`;
}

function emptyDay(): DayPlan {
  return { breakfast: [], lunch: [], snack: [], dinner: [], extra: [] };
}

function initialEntry(id: string, mealId: string): PlanEntry {
  return { id, mealId, grams: {} };
}

function initialPlanForCurrentWeek(today: Date): Plan {
  const days = getWeek(mondayOf(today), dateKey(today));
  const plan: Plan = Object.fromEntries(days.map((day) => [day.key, emptyDay()]));
  plan[days[0].key] = { ...emptyDay(), breakfast: [initialEntry("monday-breakfast", "yogurt-bowl")], lunch: [initialEntry("monday-lunch", "fajitas")], dinner: [initialEntry("monday-dinner", "pasta-pesto")] };
  plan[days[1].key] = { ...emptyDay(), breakfast: [initialEntry("tuesday-breakfast", "yogurt-bowl")], lunch: [initialEntry("tuesday-lunch", "pasta-pesto")], dinner: [initialEntry("tuesday-dinner", "fajitas")] };
  plan[days[2].key] = { ...emptyDay(), breakfast: [initialEntry("wednesday-breakfast", "yogurt-bowl")], snack: [initialEntry("wednesday-snack", "yogurt-bowl")], dinner: [initialEntry("wednesday-dinner", "pasta-pesto")] };
  plan[days[3].key] = { ...emptyDay(), breakfast: [initialEntry("thursday-breakfast", "yogurt-bowl")], lunch: [initialEntry("thursday-lunch", "fajitas")], dinner: [initialEntry("thursday-dinner", "pasta-pesto")] };
  plan[days[4].key] = { ...emptyDay(), breakfast: [initialEntry("friday-breakfast", "yogurt-bowl")], lunch: [initialEntry("friday-lunch", "fajitas")] };
  plan[days[5].key] = { ...emptyDay(), snack: [initialEntry("saturday-snack", "yogurt-bowl")], dinner: [initialEntry("saturday-dinner", "pasta-pesto")] };
  plan[days[6].key] = { ...emptyDay(), breakfast: [initialEntry("sunday-breakfast", "yogurt-bowl")], lunch: [initialEntry("sunday-lunch", "pasta-pesto")] };
  return plan;
}

function storedValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function macroForFood(food: Food, grams: number): Macros {
  const factor = grams / 100;
  return { kcal: food.kcal * factor, protein: food.protein * factor, carbs: food.carbs * factor, fat: food.fat * factor };
}

function addMacros(current: Macros, next: Macros): Macros {
  return { kcal: current.kcal + next.kcal, protein: current.protein + next.protein, carbs: current.carbs + next.carbs, fat: current.fat + next.fat };
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".0", "");
}

function unitLabel(unit: string, quantity: number) {
  if (quantity === 1) return unit;
  if (unit === "ud") return "ud";
  return `${unit}s`;
}

function mealIngredients(entry: PlanEntry, meals: Meal[], foods: Food[]) {
  const meal = meals.find((item) => item.id === entry.mealId);
  if (!meal) return [] as { food: Food; grams: number }[];
  return meal.ingredients.flatMap((ingredient) => {
    const food = foods.find((item) => item.id === ingredient.foodId);
    if (!food) return [];
    return [{ food, grams: entry.grams[food.id] ?? ingredient.grams }];
  });
}

function entryMacros(entry: PlanEntry, meals: Meal[], foods: Food[]) {
  return mealIngredients(entry, meals, foods).reduce<Macros>((total, ingredient) => addMacros(total, macroForFood(ingredient.food, ingredient.grams)), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function SlotCell({
  entries,
  meals,
  foods,
  onAdd,
  onEdit,
  onRemove,
}: {
  entries: PlanEntry[];
  meals: Meal[];
  foods: Food[];
  onAdd: () => void;
  onEdit: (entry: PlanEntry) => void;
  onRemove: (entryId: string) => void;
}) {
  return (
    <div className={entries.length ? "slot-cell" : "slot-cell empty"}>
      {entries.map((entry) => {
        const meal = meals.find((item) => item.id === entry.mealId);
        if (!meal) return null;
        return (
          <div className="meal-chip" key={entry.id}>
            <button className="meal-chip-main" onClick={() => onEdit(entry)} title="Ver y ajustar cantidades" type="button"><span>{meal.name}</span><small>{Math.round(entryMacros(entry, meals, foods).kcal)} kcal</small></button>
            <button className="meal-chip-remove" aria-label={`Quitar ${meal.name}`} onClick={() => onRemove(entry.id)} type="button"><X size={13} /></button>
          </div>
        );
      })}
      <button className="add-to-slot" onClick={onAdd} type="button" aria-label="Añadir comida"><Plus size={15} /></button>
    </div>
  );
}

function FoodManager({ foods, onAdd, onClose }: { foods: Food[]; onAdd: (food: Food) => void; onClose: () => void }) {
  const [filter, setFilter] = useState<FoodCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "otro" as FoodCategory, kcal: "", protein: "", carbs: "", fat: "", packageGrams: "", purchaseUnit: "pack" });
  const filtered = filter === "all" ? foods : foods.filter((food) => food.category === filter);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.packageGrams) return;
    onAdd({
      id: `food-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      kcal: Number(form.kcal) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      packageGrams: Number(form.packageGrams),
      purchaseUnit: form.purchaseUnit.trim() || "pack",
    });
    setForm({ name: "", category: "otro", kcal: "", protein: "", carbs: "", fat: "", packageGrams: "", purchaseUnit: "pack" });
    setShowForm(false);
  }

  return (
    <Modal onClose={onClose} title="Alimentos" kicker="TU BASE DE DATOS" wide>
      <div className="manager-actions"><div className="filter-row"><button className={filter === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setFilter("all")} type="button">Todos</button>{categoryOrder.map((category) => <button className={filter === category ? "filter-chip active" : "filter-chip"} key={category} onClick={() => setFilter(category)} type="button">{categoryLabels[category]}</button>)}</div><button className="secondary-button" onClick={() => setShowForm(!showForm)} type="button"><Plus size={16} /> Nuevo alimento</button></div>
      {showForm && <form className="editor-form food-form" onSubmit={submit}>
        <div className="form-title"><h3>Nuevo alimento</h3><span>Macros por 100 g</span></div>
        <div className="form-grid"><label>Nombre<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Gyozas" required /></label><label>Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as FoodCategory })}>{categoryOrder.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label><label>Kcal<input min="0" step="0.1" type="number" value={form.kcal} onChange={(event) => setForm({ ...form, kcal: event.target.value })} /></label><label>Proteína (g)<input min="0" step="0.1" type="number" value={form.protein} onChange={(event) => setForm({ ...form, protein: event.target.value })} /></label><label>Carbos (g)<input min="0" step="0.1" type="number" value={form.carbs} onChange={(event) => setForm({ ...form, carbs: event.target.value })} /></label><label>Grasas (g)<input min="0" step="0.1" type="number" value={form.fat} onChange={(event) => setForm({ ...form, fat: event.target.value })} /></label><label>Contenido del envase (g)<input min="1" step="1" type="number" value={form.packageGrams} onChange={(event) => setForm({ ...form, packageGrams: event.target.value })} required /></label><label>Unidad de compra<input value={form.purchaseUnit} onChange={(event) => setForm({ ...form, purchaseUnit: event.target.value })} placeholder="bolsa, ud, pack…" required /></label></div>
        <div className="form-footer"><button className="primary-button" type="submit">Guardar alimento</button></div>
      </form>}
      <div className="food-table"><div className="food-table-header"><span>Alimento</span><span>Por 100 g</span><span>Formato de compra</span></div>{filtered.map((food) => <div className="food-row" key={food.id}><div><strong>{food.name}</strong><span>{categoryLabels[food.category]}</span></div><span>{formatNumber(food.kcal)} kcal · P {formatNumber(food.protein)} · C {formatNumber(food.carbs)} · G {formatNumber(food.fat)}</span><span>{food.packageGrams} g · {food.purchaseUnit}</span></div>)}</div>
    </Modal>
  );
}

function RecipeEditor({ foods, onSave, onClose }: { foods: Food[]; onSave: (meal: Meal) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(foods.length ? [{ foodId: foods[0].id, grams: 100 }] : []);
  const resolvedMacros = ingredients.reduce<Macros>((total, ingredient) => {
    const food = foods.find((item) => item.id === ingredient.foodId);
    return food ? addMacros(total, macroForFood(food, ingredient.grams)) : total;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  function updateIngredient(index: number, field: keyof RecipeIngredient, value: string) {
    setIngredients((current) => current.map((ingredient, ingredientIndex) => ingredientIndex === index ? { ...ingredient, [field]: field === "grams" ? Math.max(0, Number(value)) : value } : ingredient));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !ingredients.length || ingredients.some((ingredient) => !ingredient.grams)) return;
    onSave({ id: `meal-${Date.now()}`, name: name.trim(), ingredients });
  }

  return (
    <Modal onClose={onClose} title="Nueva comida" kicker="POOL DE COMIDAS">
      {!foods.length ? <p className="empty-copy">Crea al menos un alimento antes de crear una comida.</p> : <form className="editor-form" onSubmit={submit}>
        <label>Nombre de la comida<input autoFocus placeholder="Ej. Arroz con salmón" value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <div className="recipe-ingredients"><div className="ingredients-title"><h3>Alimentos y cantidades</h3><span>Los gramos se podrán ajustar en cada día.</span></div>{ingredients.map((ingredient, index) => <div className="recipe-row" key={`${ingredient.foodId}-${index}`}><select aria-label="Alimento" value={ingredient.foodId} onChange={(event) => updateIngredient(index, "foodId", event.target.value)}>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select><label><input aria-label="Gramos" min="1" step="1" type="number" value={ingredient.grams} onChange={(event) => updateIngredient(index, "grams", event.target.value)} /><span>g</span></label><button aria-label="Quitar alimento" className="remove-row" disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((_, ingredientIndex) => ingredientIndex !== index))} type="button"><X size={16} /></button></div>)}<button className="add-ingredient" onClick={() => setIngredients((current) => [...current, { foodId: foods[0].id, grams: 100 }])} type="button"><Plus size={15} /> Añadir alimento</button></div>
        <MacroPreview macros={resolvedMacros} />
        <div className="form-footer"><button className="primary-button" type="submit">Guardar comida</button></div>
      </form>}
    </Modal>
  );
}

function PlannedMealEditor({ entry, meal, foods, onSave, onClose }: { entry: PlanEntry; meal: Meal; foods: Food[]; onSave: (grams: Record<string, number>) => void; onClose: () => void }) {
  const [grams, setGrams] = useState<Record<string, number>>(entry.grams);
  const ingredients = meal.ingredients.flatMap((ingredient) => {
    const food = foods.find((item) => item.id === ingredient.foodId);
    return food ? [{ food, defaultGrams: ingredient.grams, grams: grams[food.id] ?? ingredient.grams }] : [];
  });
  const macros = ingredients.reduce<Macros>((total, ingredient) => addMacros(total, macroForFood(ingredient.food, ingredient.grams)), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <Modal onClose={onClose} title={meal.name} kicker="AJUSTAR ESTA COMIDA">
      <p className="modal-intro">Estas cantidades solo afectan a esta aparición en el calendario. La receta base permanece intacta.</p>
      <div className="planned-ingredients">{ingredients.map((ingredient) => <label key={ingredient.food.id}><span><strong>{ingredient.food.name}</strong><small>Formato: {ingredient.food.packageGrams} g · {ingredient.food.purchaseUnit}</small></span><div><input min="0" step="1" type="number" value={ingredient.grams} onChange={(event) => setGrams({ ...grams, [ingredient.food.id]: Math.max(0, Number(event.target.value)) })} /><em>g</em></div></label>)}</div>
      <MacroPreview macros={macros} />
      <div className="form-footer"><button className="primary-button" onClick={() => onSave(grams)} type="button">Guardar cantidades</button></div>
    </Modal>
  );
}

function MacroPreview({ macros }: { macros: Macros }) {
  return <div className="macro-preview"><div><strong>{Math.round(macros.kcal)}</strong><span>kcal</span></div><div><strong>{Math.round(macros.protein)} g</strong><span>proteína</span></div><div><strong>{Math.round(macros.carbs)} g</strong><span>carbos</span></div><div><strong>{Math.round(macros.fat)} g</strong><span>grasas</span></div></div>;
}

function Modal({ children, kicker, onClose, title, wide = false }: { children: ReactNode; kicker: string; onClose: () => void; title: string; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose} role="presentation"><section className={wide ? "meal-picker wide-modal" : "meal-picker"} aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()} role="dialog"><div className="picker-heading"><div><p className="section-kicker">{kicker}</p><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} type="button" aria-label="Cerrar"><X size={19} /></button></div>{children}</section></div>;
}

export default function MealPlanner() {
  const today = useMemo(() => localDate(), []);
  const todayKey = dateKey(today);
  const [foods, setFoods] = useState<Food[]>(() => storedValue("nubeos.foods.v2", initialFoods));
  const [meals, setMeals] = useState<Meal[]>(() => storedValue("nubeos.meals.v2", initialMeals));
  const [plan, setPlan] = useState<Plan>(() => storedValue("nubeos.plan.v2", initialPlanForCurrentWeek(today)));
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [addingTo, setAddingTo] = useState<{ dayKey: string; slot: SlotId } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ dayKey: string; slot: SlotId; entryId: string } | null>(null);
  const [showFoods, setShowFoods] = useState(false);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);

  useEffect(() => { localStorage.setItem("nubeos.foods.v2", JSON.stringify(foods)); }, [foods]);
  useEffect(() => { localStorage.setItem("nubeos.meals.v2", JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem("nubeos.plan.v2", JSON.stringify(plan)); }, [plan]);

  const weekStart = useMemo(() => addDays(mondayOf(today), weekOffset * 7), [today, weekOffset]);
  const weekDays = useMemo(() => getWeek(weekStart, todayKey), [weekStart, todayKey]);
  const selectedDayInfo = weekDays.find((day) => day.key === selectedDay) ?? weekDays[0];
  const selectedDayPlan = plan[selectedDayInfo.key] ?? emptyDay();
  const selectedMacros = slots.flatMap((slot) => selectedDayPlan[slot.id]).reduce<Macros>((total, entry) => addMacros(total, entryMacros(entry, meals, foods)), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const shoppingList = useMemo(() => {
    const totals = new Map<string, number>();
    weekDays.forEach((day) => {
      const dayPlan = plan[day.key] ?? emptyDay();
      slots.flatMap((slot) => dayPlan[slot.id]).forEach((entry) => mealIngredients(entry, meals, foods).forEach((ingredient) => totals.set(ingredient.food.id, (totals.get(ingredient.food.id) ?? 0) + ingredient.grams)));
    });
    return foods.flatMap((food) => {
      const grams = totals.get(food.id) ?? 0;
      return grams ? [{ food, grams, units: Math.ceil(grams / food.packageGrams) }] : [];
    }).sort((a, b) => a.food.name.localeCompare(b.food.name));
  }, [foods, meals, plan, weekDays]);

  const editing = editingEntry ? (plan[editingEntry.dayKey]?.[editingEntry.slot].find((entry) => entry.id === editingEntry.entryId) ?? null) : null;
  const editingMeal = editing ? meals.find((meal) => meal.id === editing.mealId) ?? null : null;

  function dayPlan(key: string) { return plan[key] ?? emptyDay(); }
  function addEntry(dayKey: string, slot: SlotId, mealId: string) {
    const entry: PlanEntry = { id: `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`, mealId, grams: {} };
    setPlan((current) => ({ ...current, [dayKey]: { ...dayPlanFrom(current, dayKey), [slot]: [...dayPlanFrom(current, dayKey)[slot], entry] } }));
  }
  function removeEntry(dayKey: string, slot: SlotId, entryId: string) {
    setPlan((current) => ({ ...current, [dayKey]: { ...dayPlanFrom(current, dayKey), [slot]: dayPlanFrom(current, dayKey)[slot].filter((entry) => entry.id !== entryId) } }));
  }
  function saveEntryGrams(dayKey: string, slot: SlotId, entryId: string, grams: Record<string, number>) {
    setPlan((current) => ({ ...current, [dayKey]: { ...dayPlanFrom(current, dayKey), [slot]: dayPlanFrom(current, dayKey)[slot].map((entry) => entry.id === entryId ? { ...entry, grams } : entry) } }));
    setEditingEntry(null);
  }
  function moveWeek(amount: number) {
    setWeekOffset((offset) => offset + amount);
    setSelectedDay((current) => dateKey(addDays(dateFromKey(current), amount * 7)));
  }
  function goToCurrentWeek() { setWeekOffset(0); setSelectedDay(todayKey); }

  return <div className="meal-planner">
    <div className="planner-toolbar">
      <div className="week-navigation"><button aria-label="Semana anterior" className="icon-button" onClick={() => moveWeek(-1)} type="button"><ChevronLeft size={19} /></button><div><p className="section-kicker">{weekOffset === 0 ? "SEMANA ACTUAL" : "PLANIFICACIÓN SEMANAL"}</p><h2>{formatWeekRange(weekDays)}</h2></div><button aria-label="Semana siguiente" className="icon-button" onClick={() => moveWeek(1)} type="button"><ChevronRight size={19} /></button>{weekOffset !== 0 && <button className="today-button" onClick={goToCurrentWeek} type="button">Hoy</button>}</div>
      <div className="toolbar-actions"><button className="secondary-button" onClick={() => setShowFoods(true)} type="button"><SlidersHorizontal size={16} /> Alimentos</button><button className="primary-button" onClick={() => setAddingTo({ dayKey: selectedDayInfo.key, slot: "lunch" })} type="button"><Plus size={17} /> Añadir comida</button></div>
    </div>
    <div className="meal-layout">
      <section className="planner-card"><div className="weekly-grid" role="grid" aria-label="Planificador semanal de comidas"><div className="grid-corner"><CalendarDays size={17} /></div>{weekDays.map((day) => <button className={`${selectedDayInfo.key === day.key ? "day-heading selected" : "day-heading"}${day.isToday ? " today" : ""}`} key={day.key} onClick={() => setSelectedDay(day.key)} type="button"><span>{day.label}</span><strong>{day.number}</strong>{day.isToday && <i>Hoy</i>}</button>)}{slots.flatMap((slot) => [<div className="slot-heading" key={`${slot.id}-title`}><span>{slot.label}</span><small>{slot.hint}</small></div>, ...weekDays.map((day) => <SlotCell entries={dayPlan(day.key)[slot.id]} foods={foods} key={`${day.key}-${slot.id}`} meals={meals} onAdd={() => setAddingTo({ dayKey: day.key, slot: slot.id })} onEdit={(entry) => setEditingEntry({ dayKey: day.key, slot: slot.id, entryId: entry.id })} onRemove={(entryId) => removeEntry(day.key, slot.id, entryId)} />)])}</div></section>
      <aside className="planner-aside"><section className="summary-card"><div className="summary-header"><div><p className="section-kicker">RESUMEN DEL DÍA</p><h2>{selectedDayInfo.label}, {selectedDayInfo.number} {monthLabels[selectedDayInfo.date.getMonth()]}</h2></div><Flame size={19} /></div><MacroPreview macros={selectedMacros} /></section><section className="shopping-card"><div className="shopping-heading"><div><p className="section-kicker">COMPRA DE ESTA SEMANA</p><h2>Lista consolidada</h2></div><ShoppingBasket size={19} /></div><ul className="shopping-list">{shoppingList.map((item) => <li key={item.food.id}><span className="list-check" /><span>{item.food.name}<small>{Math.round(item.grams)} g planificados</small></span><strong>{item.units} {unitLabel(item.food.purchaseUnit, item.units)}</strong></li>)}</ul>{shoppingList.length === 0 && <p className="empty-list">Añade comidas para generar la compra.</p>}<button className="text-action" type="button">Preparar compra <ArrowRight size={15} /></button></section></aside>
    </div>
    <section className="meal-pool-section"><div className="pool-heading"><div><p className="section-kicker">TU POOL</p><h2>Comidas guardadas</h2></div><div><span>{meals.length} recetas</span><button className="secondary-button" onClick={() => setShowRecipeEditor(true)} type="button"><Plus size={16} /> Nueva comida</button></div></div><div className="meal-pool-grid">{meals.map((meal) => { const sample = { id: "sample", mealId: meal.id, grams: {} }; const macros = entryMacros(sample, meals, foods); return <article className="meal-pool-card" key={meal.id}><div className="pool-card-title"><div className="meal-symbol"><UtensilsCrossed size={18} /></div><h3>{meal.name}</h3></div><ul>{meal.ingredients.slice(0, 3).flatMap((ingredient) => { const food = foods.find((item) => item.id === ingredient.foodId); return food ? [<li key={food.id}>{ingredient.grams} g {food.name.toLowerCase()}</li>] : []; })}</ul><div className="pool-card-footer"><span>{Math.round(macros.kcal)} kcal · {Math.round(macros.protein)} g prot.</span><button onClick={() => addEntry(selectedDayInfo.key, "lunch", meal.id)} type="button">Añadir <Plus size={14} /></button></div></article>; })}</div></section>
    {addingTo && <Modal onClose={() => setAddingTo(null)} title={`${weekDays.find((day) => day.key === addingTo.dayKey)?.label} · ${slots.find((slot) => slot.id === addingTo.slot)?.label}`} kicker="AÑADIR AL PLAN"><div className="picker-options">{meals.map((meal) => { const macros = entryMacros({ id: "sample", mealId: meal.id, grams: {} }, meals, foods); return <button className="picker-meal" key={meal.id} onClick={() => { addEntry(addingTo.dayKey, addingTo.slot, meal.id); setSelectedDay(addingTo.dayKey); setAddingTo(null); }} type="button"><div><strong>{meal.name}</strong><span>{meal.ingredients.length} alimentos · cantidades editables</span></div><span>{Math.round(macros.kcal)} kcal <Plus size={15} /></span></button>; })}</div></Modal>}
    {showFoods && <FoodManager foods={foods} onAdd={(food) => setFoods((current) => [...current, food])} onClose={() => setShowFoods(false)} />}
    {showRecipeEditor && <RecipeEditor foods={foods} onClose={() => setShowRecipeEditor(false)} onSave={(meal) => { setMeals((current) => [...current, meal]); setShowRecipeEditor(false); }} />}
    {editing && editingMeal && editingEntry && <PlannedMealEditor entry={editing} foods={foods} meal={editingMeal} onClose={() => setEditingEntry(null)} onSave={(grams) => saveEntryGrams(editingEntry.dayKey, editingEntry.slot, editingEntry.entryId, grams)} />}
  </div>;
}

function dayPlanFrom(plan: Plan, key: string) {
  return plan[key] ?? emptyDay();
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
