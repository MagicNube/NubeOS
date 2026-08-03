import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  mealsApi,
  type Meal,
  type MealIngredient,
  type MealIngredientInput,
  type MealSlot,
  type PlannedInstance,
  type QuantityUnit,
  type ShoppingEntry,
  type WeeklyPlan,
} from "./api";
import ProductsPage from "./products/ProductsPage";
import { productApi, type Product } from "./products/api";
import "./meals.css";

type Section = "products" | "meals" | "planner" | "shopping";
type DraftIngredient = { productId: string; quantity: string; unit: QuantityUnit };
type PlannerTarget = { weekday: number; slot: MealSlot };

const slots: Array<{ id: MealSlot; label: string }> = [
  { id: "breakfast", label: "Desayuno" },
  { id: "lunch", label: "Comida" },
  { id: "snack", label: "Merienda" },
  { id: "dinner", label: "Cena" },
  { id: "extra", label: "Extra" },
];

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function errorMessage(error: unknown) {
  return typeof error === "string" ? error : "No se ha podido completar la operación.";
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function currentWeekStart() {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - offset);
  return toIsoDate(today);
}

function offsetWeek(weekStart: string, offset: number) {
  const date = dateFromIso(weekStart);
  date.setDate(date.getDate() + offset * 7);
  return toIsoDate(date);
}

function dayFor(weekStart: string, weekday: number) {
  const date = dateFromIso(weekStart);
  date.setDate(date.getDate() + weekday);
  return date;
}

function formatDay(weekStart: string, weekday: number) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(dayFor(weekStart, weekday));
}

function formatWeek(weekStart: string) {
  const first = dayFor(weekStart, 0);
  const last = dayFor(weekStart, 6);
  const format = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
  return `${format.format(first)} – ${format.format(last)}`;
}

function gramsPerUnit(product: Product) {
  const presentation = product.presentation;
  if (!presentation) return undefined;
  if (presentation.kind === "package" && presentation.unitsPerPackage) return presentation.totalGrams / presentation.unitsPerPackage;
  if (presentation.kind === "bulkByUnit") return presentation.gramsPerUnit;
  return undefined;
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits }).format(value);
}

function MacroLine({ macros }: { macros: { proteinGrams: number; carbohydrateGrams: number; fatGrams: number; kilocalories: number } }) {
  return <div className="meal-macros"><span><strong>{formatNumber(macros.kilocalories, 0)}</strong> kcal</span><span>P {formatNumber(macros.proteinGrams)} g</span><span>C {formatNumber(macros.carbohydrateGrams)} g</span><span>G {formatNumber(macros.fatGrams)} g</span></div>;
}

function IngredientRows({ drafts, products, onChange, onRemove }: { drafts: DraftIngredient[]; products: Product[]; onChange: (index: number, next: DraftIngredient) => void; onRemove: (index: number) => void }) {
  return (
    <div className="ingredient-rows">
      {drafts.map((draft, index) => {
        const product = products.find((item) => item.id === draft.productId);
        const supportsUnits = product && gramsPerUnit(product) !== undefined;
        return (
          <div className="ingredient-row" key={`${draft.productId}-${index}`}>
            <select aria-label={`Producto ${index + 1}`} onChange={(event) => onChange(index, { productId: event.target.value, quantity: draft.quantity, unit: "grams" })} value={draft.productId}>
              {products.map((item) => <option disabled={item.status === "archived" && item.id !== draft.productId} key={item.id} value={item.id}>{item.name}{item.status === "archived" ? " (archivado)" : ""}</option>)}
            </select>
            <input aria-label={`Cantidad ${index + 1}`} inputMode="decimal" min="0.01" onChange={(event) => onChange(index, { ...draft, quantity: event.target.value })} step="0.01" type="number" value={draft.quantity} />
            <select aria-label={`Unidad ${index + 1}`} disabled={!supportsUnits} onChange={(event) => onChange(index, { ...draft, unit: event.target.value as QuantityUnit })} value={draft.unit}>
              <option value="grams">g</option>
              {supportsUnits && <option value="units">uds</option>}
            </select>
            <button aria-label="Retirar ingrediente" className="subtle-icon-button" disabled={drafts.length === 1} onClick={() => onRemove(index)} type="button"><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}

function MealForm({ meal, products, onCancel, onSaved }: { meal?: Meal; products: Product[]; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(meal?.name ?? "");
  const [drafts, setDrafts] = useState<DraftIngredient[]>(() => meal ? meal.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: String(ingredient.quantity), unit: ingredient.unit })) : products.length ? [{ productId: products[0].id, quantity: "", unit: "grams" }] : []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateDraft(index: number, draft: DraftIngredient) {
    setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? draft : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drafts.length || drafts.some((draft) => !draft.productId || Number(draft.quantity) <= 0)) {
      setError("Añade al menos un ingrediente con una cantidad mayor que cero.");
      return;
    }
    setSaving(true);
    setError(null);
    const input = { name, ingredients: drafts.map((draft) => ({ productId: draft.productId, quantity: Number(draft.quantity), unit: draft.unit })) };
    try {
      if (meal) await mealsApi.updateMeal(meal.id, input);
      else await mealsApi.createMeal(input);
      await onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="meal-editor" onSubmit={submit}>
      <div className="meal-editor-heading"><div><p className="section-kicker">{meal ? "EDITAR COMIDA" : "NUEVA COMIDA"}</p><h2>{meal ? meal.name : "Crea una comida"}</h2></div><button aria-label="Cerrar formulario" className="product-icon-button" onClick={onCancel} type="button"><X size={17} /></button></div>
      {!products.length ? <p className="inline-note">Necesitas crear primero un producto activo.</p> : <><label className="meal-field"><span>Nombre</span><input autoFocus onChange={(event) => setName(event.target.value)} required value={name} /></label><fieldset className="meal-fieldset"><legend>Ingredientes</legend><p>Gramos es la opción inicial. Las unidades solo aparecen si el producto conoce su peso unitario.</p><IngredientRows drafts={drafts} onChange={updateDraft} onRemove={(index) => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))} products={products} /><button className="text-action" onClick={() => setDrafts((current) => [...current, { productId: products[0].id, quantity: "", unit: "grams" }])} type="button"><Plus size={15} /> Añadir producto</button></fieldset></>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" disabled={saving || !products.length} type="submit">{saving ? "Guardando…" : meal ? "Guardar cambios" : "Crear comida"}</button></div>
    </form>
  );
}

function MealsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [editing, setEditing] = useState<Meal | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [nextMeals, activeProducts, archivedProducts] = await Promise.all([mealsApi.listMeals(status), productApi.list("active"), productApi.list("archived")]);
      setMeals(nextMeals);
      setProducts(activeProducts);
      setAllProducts([...activeProducts, ...archivedProducts]);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [status]);

  async function changeStatus(meal: Meal) {
    try {
      if (meal.status === "active") await mealsApi.archiveMeal(meal.id);
      else await mealsApi.restoreMeal(meal.id);
      await refresh();
    } catch (reason) { setError(errorMessage(reason)); }
  }

  return <section className="workspace-section">
    <div className="section-toolbar"><div className="status-tabs"><button className={status === "active" ? "product-tab active" : "product-tab"} onClick={() => setStatus("active")} type="button">Recetas</button><button className={status === "archived" ? "product-tab active" : "product-tab"} onClick={() => setStatus("archived")} type="button">Archivadas</button></div><button className="primary-button" onClick={() => setEditing(null)} type="button"><Plus size={16} /> Añadir comida</button></div>
    {editing !== undefined && <MealForm meal={editing ?? undefined} onCancel={() => setEditing(undefined)} onSaved={async () => { await refresh(); setEditing(undefined); }} products={editing ? allProducts : products} />}
    <div className="section-heading"><div><p className="section-kicker">{status === "active" ? "RECETAS" : "HISTORIAL"}</p><h2>{status === "active" ? "Tus comidas" : "Comidas archivadas"}</h2></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading && <p className="workspace-empty">Cargando comidas…</p>}
    {!loading && !error && !meals.length && <p className="workspace-empty">{status === "active" ? "Crea una comida a partir de los productos de tu catálogo." : "No hay comidas archivadas."}</p>}
    {!loading && !error && meals.length > 0 && <div className="meal-card-grid">{meals.map((meal) => <article className="meal-card" key={meal.id}><div className="meal-card-heading"><div><h3>{meal.name}</h3><p>{meal.ingredients.length} ingrediente{meal.ingredients.length === 1 ? "" : "s"}</p></div><button aria-label={`Editar ${meal.name}`} className="product-icon-button" onClick={() => setEditing(meal)} type="button"><Pencil size={16} /></button></div><ul>{meal.ingredients.map((ingredient) => <li key={`${meal.id}-${ingredient.productId}`}>{ingredient.productName} <span>{formatNumber(ingredient.quantity)} {ingredient.unit === "grams" ? "g" : "uds"}</span></li>)}</ul><MacroLine macros={meal.macros} /><button className="product-status-action" onClick={() => void changeStatus(meal)} type="button">{meal.status === "active" ? <><Archive size={14} /> Archivar</> : <><RotateCcw size={14} /> Restaurar</>}</button></article>)}</div>}
  </section>;
}

function PlanInstanceEditor({ instance, products, onCancel, onSaved }: { instance: PlannedInstance; products: Product[]; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<DraftIngredient[]>(instance.ingredients.map((ingredient) => ({ productId: ingredient.productId, quantity: String(ingredient.quantity), unit: ingredient.unit })));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drafts.length || drafts.some((draft) => Number(draft.quantity) <= 0)) { setError("La instancia debe tener al menos un ingrediente válido."); return; }
    setSaving(true); setError(null);
    try { await mealsApi.updatePlannedInstance(instance.id, drafts.map((draft) => ({ productId: draft.productId, quantity: Number(draft.quantity), unit: draft.unit }))); await onSaved(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  }

  return <form className="plan-editor" onSubmit={submit}><div className="meal-editor-heading"><div><p className="section-kicker">EDITAR INSTANCIA</p><h2>Comida planificada</h2></div><button aria-label="Cerrar edición" className="product-icon-button" onClick={onCancel} type="button"><X size={17} /></button></div><IngredientRows drafts={drafts} onChange={(index, draft) => setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? draft : item))} onRemove={(index) => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))} products={products} /><button className="text-action" onClick={() => products.length && setDrafts((current) => [...current, { productId: products[0].id, quantity: "", unit: "grams" }])} type="button"><Plus size={15} /> Añadir producto</button>{error && <p className="form-error" role="alert">{error}</p>}<div className="editor-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar instancia"}</button></div></form>;
}

function PlannerPage({ weekStart, onWeekChange }: { weekStart: string; onWeekChange: (weekStart: string) => void }) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [target, setTarget] = useState<PlannerTarget | null>(null);
  const [editing, setEditing] = useState<PlannedInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const [nextPlan, activeMeals, archivedMeals, activeProducts, archivedProducts] = await Promise.all([mealsApi.listWeek(weekStart), mealsApi.listMeals("active"), mealsApi.listMeals("archived"), productApi.list("active"), productApi.list("archived")]);
      setPlan(nextPlan); setMeals([...activeMeals, ...archivedMeals]); setProducts([...activeProducts, ...archivedProducts]);
    } catch (reason) { setError(errorMessage(reason)); }
  }

  useEffect(() => { void refresh(); }, [weekStart]);

  async function addMeal(meal: Meal) {
    if (!target) return;
    try { await mealsApi.createPlannedInstance({ weekStart, weekday: target.weekday, slot: target.slot, mealId: meal.id }); setTarget(null); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function remove(instance: PlannedInstance) {
    try { await mealsApi.removePlannedInstance(instance.id); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function reorder(instance: PlannedInstance, offset: number) {
    try { await mealsApi.reorderPlannedInstance(instance.id, Math.max(0, instance.position + offset)); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  const mealName = (instance: PlannedInstance) => meals.find((meal) => meal.id === instance.sourceMealId)?.name ?? "Comida planificada";
  return <section className="planner-section">
    <div className="planner-toolbar"><div className="week-navigation"><button aria-label="Semana anterior" className="product-icon-button" onClick={() => onWeekChange(offsetWeek(weekStart, -1))} type="button"><ChevronLeft size={18} /></button><div><p className="section-kicker">SEMANA</p><h2>{formatWeek(weekStart)}</h2></div><button aria-label="Semana siguiente" className="product-icon-button" onClick={() => onWeekChange(offsetWeek(weekStart, 1))} type="button"><ChevronRight size={18} /></button><button className="today-button" onClick={() => onWeekChange(currentWeekStart())} type="button">Hoy</button></div><MacroLine macros={plan?.weeklyMacros ?? { proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, kilocalories: 0 }} /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="real-planner-card"><div className="real-week-grid"><div className="real-grid-corner"><CalendarDays size={15} /></div>{weekdays.map((label, weekday) => <div className="real-day-heading" key={label}><span>{label}</span><strong>{formatDay(weekStart, weekday)}</strong><small>{formatNumber(plan?.dailyMacros.find((item) => item.weekday === weekday)?.macros.kilocalories ?? 0, 0)} kcal</small></div>)}{slots.flatMap((slot) => [<div className="real-slot-heading" key={`${slot.id}-heading`}><Clock3 size={14} /><span>{slot.label}</span></div>, ...weekdays.map((_, weekday) => { const instances = (plan?.instances ?? []).filter((instance) => instance.slot === slot.id && instance.weekday === weekday); return <div className="real-slot-cell" key={`${slot.id}-${weekday}`}>{instances.map((instance) => <div className={instance.isModified ? "planned-chip modified" : "planned-chip"} key={instance.id}><button onClick={() => setEditing(instance)} type="button"><strong>{mealName(instance)}</strong><span>{formatNumber(instance.macros.kilocalories, 0)} kcal{instance.isModified && " · modificada"}</span></button><div><button aria-label="Subir" disabled={instance.position === 0} onClick={() => void reorder(instance, -1)} type="button">↑</button><button aria-label="Bajar" disabled={instance.position >= instances.length - 1} onClick={() => void reorder(instance, 1)} type="button">↓</button><button aria-label="Quitar" onClick={() => void remove(instance)} type="button">×</button></div></div>)}<button aria-label={`Añadir en ${slot.label}`} className="add-plan-button" onClick={() => setTarget({ weekday, slot: slot.id })} type="button"><Plus size={14} /></button></div>; })])}</div></div>
    {target && <div className="workspace-modal"><div className="picker-card"><div className="meal-editor-heading"><div><p className="section-kicker">AÑADIR AL PLAN</p><h2>{slots.find((slot) => slot.id === target.slot)?.label} · {weekdays[target.weekday]}</h2></div><button aria-label="Cerrar selector" className="product-icon-button" onClick={() => setTarget(null)} type="button"><X size={17} /></button></div>{!meals.filter((meal) => meal.status === "active").length ? <p className="inline-note">No hay comidas activas para planificar.</p> : <div className="meal-choice-list">{meals.filter((meal) => meal.status === "active").map((meal) => <button key={meal.id} onClick={() => void addMeal(meal)} type="button"><span><strong>{meal.name}</strong><small>{formatNumber(meal.macros.kilocalories, 0)} kcal</small></span><Plus size={17} /></button>)}</div>}</div></div>}
    {editing && <div className="workspace-modal"><PlanInstanceEditor instance={editing} onCancel={() => setEditing(null)} onSaved={async () => { await refresh(); setEditing(null); }} products={products} /></div>}
  </section>;
}

function recommendationLabel(entry: ShoppingEntry) {
  const recommendation = entry.recommendation;
  if (!recommendation) return `${formatNumber(entry.pendingGrams)} g`;
  if (recommendation.kind === "packages") return `${recommendation.packages} paquete${recommendation.packages === 1 ? "" : "s"}`;
  if (recommendation.kind === "units") return `${recommendation.units} ud${recommendation.units === 1 ? "" : "s"}`;
  return `${formatNumber(recommendation.grams)} g`;
}

function ShoppingPage({ weekStart }: { weekStart: string }) {
  const [entries, setEntries] = useState<ShoppingEntry[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, QuantityUnit>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true); setError(null);
    try { setEntries(await mealsApi.listShoppingList(weekStart)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [weekStart]);

  async function setAvailable(entry: ShoppingEntry) {
    const value = Number(amounts[entry.product.id] ?? entry.availableGrams);
    try { await mealsApi.setWeeklyAvailable(weekStart, entry.product.id, { value, unit: units[entry.product.id] ?? "grams" }); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function partialPurchase(entry: ShoppingEntry) {
    const value = Number(amounts[entry.product.id]);
    try { await mealsApi.addPartialPurchase(weekStart, entry.product.id, { value, unit: units[entry.product.id] ?? "grams" }); setAmounts((current) => ({ ...current, [entry.product.id]: "" })); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function complete(entry: ShoppingEntry) {
    try { await mealsApi.completeShoppingEntry(weekStart, entry.product.id); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  return <section className="shopping-section"><div className="section-heading"><div><p className="section-kicker">COMPRA SEMANAL</p><h2>{formatWeek(weekStart)}</h2></div><ShoppingCart color="#a78bfa" size={22} /></div>{error && <p className="form-error" role="alert">{error}</p>}{loading && <p className="workspace-empty">Calculando la compra…</p>}{!loading && !error && !entries.length && <p className="workspace-empty">Esta semana todavía no tiene comidas planificadas.</p>}{!loading && !error && entries.length > 0 && <div className="shopping-entry-list">{entries.map((entry) => { const supportsUnits = gramsPerUnit(entry.product) !== undefined; const unit = units[entry.product.id] ?? "grams"; return <article className={entry.pendingGrams === 0 ? "shopping-entry complete" : "shopping-entry"} key={entry.product.id}><div><span className="product-category">{entry.product.category}</span><h3>{entry.product.name}</h3><p>Necesitas <strong>{formatNumber(entry.neededGrams)} g</strong> · Pendiente <strong>{formatNumber(entry.pendingGrams)} g</strong></p>{entry.theoreticalLeftoverGrams !== undefined && <small>Sobrante teórico: {formatNumber(entry.theoreticalLeftoverGrams)} g</small>}</div><div className="shopping-recommendation"><span>Compra recomendada</span><strong>{recommendationLabel(entry)}</strong>{entry.estimatedCostCents !== undefined && <small>{(entry.estimatedCostCents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</small>}</div><div className="shopping-actions"><div><input aria-label={`Cantidad de ${entry.product.name}`} inputMode="decimal" min="0" onChange={(event) => setAmounts((current) => ({ ...current, [entry.product.id]: event.target.value }))} placeholder={String(entry.availableGrams)} step="0.01" type="number" value={amounts[entry.product.id] ?? ""} /><select aria-label={`Unidad de ${entry.product.name}`} disabled={!supportsUnits} onChange={(event) => setUnits((current) => ({ ...current, [entry.product.id]: event.target.value as QuantityUnit }))} value={unit}><option value="grams">g</option>{supportsUnits && <option value="units">uds</option>}</select></div><div><button className="secondary-button" onClick={() => void setAvailable(entry)} type="button">Ya tengo</button><button className="secondary-button" onClick={() => void partialPurchase(entry)} type="button">Parcial</button><button className="primary-button" onClick={() => void complete(entry)} type="button">Completar</button></div></div></article>; })}</div>}</section>;
}

export default function MealsWorkspace() {
  const [section, setSection] = useState<Section>("products");
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const tabs: Array<{ id: Section; label: string; icon: typeof UtensilsCrossed }> = [{ id: "products", label: "Productos", icon: ClipboardList }, { id: "meals", label: "Comidas", icon: UtensilsCrossed }, { id: "planner", label: "Planificador", icon: CalendarDays }, { id: "shopping", label: "Compra", icon: ShoppingCart }];
  return <section className="meals-workspace"><nav aria-label="Secciones de comidas" className="workspace-tabs">{tabs.map(({ id, label, icon: Icon }) => <button className={section === id ? "workspace-tab active" : "workspace-tab"} key={id} onClick={() => setSection(id)} type="button"><Icon size={16} /> {label}</button>)}</nav>{section === "products" && <ProductsPage />}{section === "meals" && <MealsPage />}{section === "planner" && <PlannerPage onWeekChange={setWeekStart} weekStart={weekStart} />}{section === "shopping" && <ShoppingPage weekStart={weekStart} />}</section>;
}
