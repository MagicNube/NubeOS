import {
  Archive,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  mealsApi,
  type MacroTotals,
  type Meal,
  type MealIngredientInput,
  type MealSlot,
  type PlannedInstance,
  type QuantityUnit,
  type ShoppingEntry,
  type WeeklyPlan,
} from "./api";
import ProductsPage, {
  type ProductCatalogFilters,
} from "./products/ProductsPage";
import SupermarketMultiFilter from "./SupermarketMultiFilter";
import {
  categoryLabels,
  matchesSupermarketFilter,
  productApi,
  supermarketLabels,
  type Product,
  type SupermarketFilterValue,
} from "./products/api";
import { useLatestRequest } from "./useLatestRequest";
import Modal from "../ui/Modal";
import SelectControl from "../ui/SelectControl";
import "./meals.css";

type Section = "products" | "meals" | "planner" | "shopping";
type DraftIngredient = {
  productId: string;
  productName: string;
  quantity: string;
  unit: QuantityUnit;
};
type PlannerTarget = { weekday: number; slot: MealSlot };

const slots: Array<{ id: MealSlot; label: string }> = [
  { id: "breakfast", label: "Desayuno" },
  { id: "lunch", label: "Comida" },
  { id: "snack", label: "Merienda" },
  { id: "dinner", label: "Cena" },
  { id: "extra", label: "Extra" },
];
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const emptyMacros: MacroTotals = {
  proteinGrams: 0,
  carbohydrateGrams: 0,
  fatGrams: 0,
  kilocalories: 0,
};
const productSearchMinimumCharacters = 3;
const productSearchResultsLimit = 8;

function errorMessage(error: unknown) {
  return typeof error === "string"
    ? error
    : "No se ha podido completar la operación.";
}
function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
function madridDate() {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const part = (type: string) =>
    values.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function currentWeekStart() {
  const today = dateFromIso(madridDate());
  today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
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
function dayIso(weekStart: string, weekday: number) {
  return toIsoDate(dayFor(weekStart, weekday));
}
function formatDay(weekStart: string, weekday: number) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(dayFor(weekStart, weekday));
}
function formatWeek(weekStart: string) {
  const format = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  });
  return `${format.format(dayFor(weekStart, 0))} – ${format.format(dayFor(weekStart, 6))}`;
}
function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits }).format(
    value,
  );
}
function formatCurrency(cents?: number | null) {
  return cents == null
    ? "Coste no disponible"
    : (Math.max(0, cents) / 100).toLocaleString("es-ES", {
        style: "currency",
        currency: "EUR",
      });
}
function gramsPerUnit(product: Product) {
  const presentation = product.presentation;
  if (!presentation) return undefined;
  if (presentation.kind === "package" && presentation.unitsPerPackage)
    return presentation.totalGrams / presentation.unitsPerPackage;
  return presentation.kind === "bulkByUnit"
    ? presentation.gramsPerUnit
    : undefined;
}
function editableNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(maximumFractionDigits)));
}
function convertedQuantity(
  rawValue: string,
  from: QuantityUnit,
  to: QuantityUnit,
  product?: Product | null,
) {
  if (!product || from === to || rawValue.trim() === "") return rawValue;
  const value = Number(rawValue);
  const perUnit = gramsPerUnit(product);
  if (!Number.isFinite(value) || !perUnit) return rawValue;
  return editableNumber(from === "grams" ? value / perUnit : value * perUnit);
}
function slotLabel(slot: MealSlot) {
  return slots.find((item) => item.id === slot)?.label ?? slot;
}

function moveItem<T>(items: T[], from: number, to: number) {
  const moved = items[from];
  if (moved === undefined || to < 0 || to >= items.length) return items;
  const reordered = [...items];
  reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

function useMadridToday() {
  const [today, setToday] = useState(madridDate);
  useEffect(() => {
    let timeout: number;
    const schedule = () => {
      timeout = window.setTimeout(
        () => {
          setToday(madridDate());
          schedule();
        },
        60_000 - (Date.now() % 60_000) + 50,
      );
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, []);
  return today;
}

function MacroTable({
  macros,
  compact = false,
}: {
  macros: MacroTotals;
  compact?: boolean;
}) {
  return (
    <dl className={compact ? "macro-table compact" : "macro-table"}>
      <div>
        <dt>Kcal</dt>
        <dd>{formatNumber(macros.kilocalories)}</dd>
      </div>
      <div>
        <dt>Proteínas</dt>
        <dd>{formatNumber(macros.proteinGrams, 1)} g</dd>
      </div>
      <div>
        <dt>Carbos</dt>
        <dd>{formatNumber(macros.carbohydrateGrams, 1)} g</dd>
      </div>
      <div>
        <dt>Grasas</dt>
        <dd>{formatNumber(macros.fatGrams, 1)} g</dd>
      </div>
    </dl>
  );
}

function IngredientProductSearch({
  draft,
  index,
  products,
  onChange,
}: {
  draft: DraftIngredient;
  index: number;
  products: Product[];
  onChange: (next: DraftIngredient) => void;
}) {
  const [open, setOpen] = useState(false);
  const normalizedQuery = draft.productName.trim().toLocaleLowerCase("es");
  const canSearch = normalizedQuery.length >= productSearchMinimumCharacters;
  const matches = canSearch
    ? products
        .filter((product) =>
          product.name.toLocaleLowerCase("es").includes(normalizedQuery),
        )
        .slice(0, productSearchResultsLimit)
    : [];
  return (
    <div
      className="ingredient-product-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <Search size={15} />
      <input
        aria-expanded={open}
        aria-label={`Producto ${index + 1}`}
        onChange={(event) => {
          onChange({
            ...draft,
            productId: "",
            productName: event.target.value,
            unit: "grams",
          });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Busca un producto"
        value={draft.productName}
      />
      {open && canSearch && (
        <div className="ingredient-product-options">
          {canSearch &&
            matches.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onChange({
                    ...draft,
                    productId: product.id,
                    productName: product.name,
                    unit: "grams",
                  });
                  setOpen(false);
                }}
                type="button"
              >
                {product.name}
              </button>
            ))}
          {canSearch && !matches.length && (
            <p>No hay productos coincidentes.</p>
          )}
        </div>
      )}
    </div>
  );
}

function IngredientRows({
  drafts,
  products,
  onChange,
  onRemove,
  onMove,
  searchProducts = false,
}: {
  drafts: DraftIngredient[];
  products: Product[];
  onChange: (index: number, next: DraftIngredient) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, targetIndex: number) => void;
  searchProducts?: boolean;
}) {
  return (
    <div className="ingredient-rows">
      {drafts.map((draft, index) => {
        const product = products.find((item) => item.id === draft.productId);
        const supportsUnits = Boolean(
          product && gramsPerUnit(product) !== undefined,
        );
        return (
          <div className="ingredient-row" key={`${index}-${draft.productId}`}>
            {searchProducts ? (
              <IngredientProductSearch
                draft={draft}
                index={index}
                onChange={(next) => onChange(index, next)}
                products={products}
              />
            ) : (
              <>
                <input
                  aria-label={`Producto ${index + 1}`}
                  list={`ingredient-products-${index}`}
                  onChange={(event) => {
                    const match = products.find(
                      (item) =>
                        item.name.toLocaleLowerCase("es") ===
                        event.target.value.toLocaleLowerCase("es"),
                    );
                    onChange(index, {
                      ...draft,
                      productId: match?.id ?? "",
                      productName: event.target.value,
                      unit: "grams",
                    });
                  }}
                  placeholder="Busca un producto"
                  value={draft.productName}
                />
                <datalist id={`ingredient-products-${index}`}>
                  {products.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.status === "archived" ? "Archivado" : ""}
                    </option>
                  ))}
                </datalist>
              </>
            )}
            <input
              aria-label={`Cantidad ${index + 1}`}
              inputMode="decimal"
              min="0.01"
              onChange={(event) =>
                onChange(index, { ...draft, quantity: event.target.value })
              }
              step="0.01"
              type="number"
              value={draft.quantity}
            />
            {supportsUnits ? (
              <SelectControl>
                <select
                  aria-label={`Unidad ${index + 1}`}
                  onChange={(event) =>
                    onChange(index, (() => {
                      const unit = event.target.value as QuantityUnit;
                      return {
                        ...draft,
                        quantity: convertedQuantity(
                          draft.quantity,
                          draft.unit,
                          unit,
                          product,
                        ),
                        unit,
                      };
                    })())
                  }
                  value={draft.unit}
                >
                  <option value="grams">g</option>
                  <option value="units">uds</option>
                </select>
              </SelectControl>
            ) : (
              <span className="fixed-unit">g</span>
            )}
            <div className="ingredient-row-actions">
              <button
                aria-label="Mover ingrediente arriba"
                className="subtle-icon-button"
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
                type="button"
              >
                <ChevronUp size={15} />
              </button>
              <button
                aria-label="Mover ingrediente abajo"
                className="subtle-icon-button"
                disabled={index === drafts.length - 1}
                onClick={() => onMove(index, index + 1)}
                type="button"
              >
                <ChevronDown size={15} />
              </button>
              <button
                aria-label="Retirar ingrediente"
                className="subtle-icon-button"
                disabled={drafts.length === 1}
                onClick={() => onRemove(index)}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MealForm({
  meal,
  products,
  onCancel,
  onSaved,
}: {
  meal?: Meal;
  products: Product[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(meal?.name ?? "");
  const [drafts, setDrafts] = useState<DraftIngredient[]>(() =>
    meal
      ? meal.ingredients.map((ingredient) => ({
          productId: ingredient.productId,
          productName: ingredient.productName,
          quantity: String(ingredient.quantity),
          unit: ingredient.unit,
        }))
      : [{ productId: "", productName: "", quantity: "", unit: "grams" }],
  );
  const [recommendedSlots, setRecommendedSlots] = useState<MealSlot[]>(
    meal?.recommendedSlots ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const updateDraft = (index: number, next: DraftIngredient) =>
    setDrafts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
    );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !drafts.length ||
      drafts.some((draft) => !draft.productId || Number(draft.quantity) <= 0)
    ) {
      setError(
        "Añade al menos un ingrediente con un producto y una cantidad mayor que cero.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        name,
        ingredients: drafts.map<MealIngredientInput>((draft) => ({
          productId: draft.productId,
          quantity: Number(draft.quantity),
          unit: draft.unit,
        })),
        recommendedSlots,
      };
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
      <div className="meal-editor-heading">
        <div>
          <p className="section-kicker">
            {meal ? "EDITAR COMIDA" : "NUEVA COMIDA"}
          </p>
          <h2 id="meal-form-title">{meal?.name ?? "Crea una comida"}</h2>
        </div>
        <button
          aria-label="Cerrar formulario"
          className="product-icon-button"
          onClick={onCancel}
          type="button"
        >
          <X size={17} />
        </button>
      </div>
      {!products.length ? (
        <p className="inline-note">
          Necesitas crear primero un producto activo.
        </p>
      ) : (
        <>
          <label className="meal-field">
            <span>Nombre</span>
            <input
              autoFocus
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <fieldset className="meal-fieldset">
            <legend>Ingredientes</legend>
            <p>
              Empieza escribiendo el producto. Las unidades solo se ofrecen
              cuando existe una conversión válida.
            </p>
            <IngredientRows
              drafts={drafts}
              onChange={updateDraft}
              onRemove={(index) =>
                setDrafts((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              onMove={(index, targetIndex) =>
                setDrafts((current) => moveItem(current, index, targetIndex))
              }
              products={products}
              searchProducts
            />
            <button
              className="text-action"
              onClick={() =>
                setDrafts((current) => [
                  ...current,
                  {
                    productId: "",
                    productName: "",
                    quantity: "",
                    unit: "grams",
                  },
                ])
              }
              type="button"
            >
              <Plus size={15} /> Añadir producto
            </button>
          </fieldset>
          <fieldset className="meal-fieldset">
            <legend>Momento del día (opcional)</legend>
            <div className="slot-checks">
              {slots.map((slot) => (
                <label key={slot.id}>
                  <input
                    checked={recommendedSlots.includes(slot.id)}
                    onChange={() =>
                      setRecommendedSlots((current) =>
                        current.includes(slot.id)
                          ? current.filter((item) => item !== slot.id)
                          : [...current, slot.id],
                      )
                    }
                    type="checkbox"
                  />
                  {slot.label}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="editor-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button
          className="primary-button"
          disabled={saving || !products.length}
          type="submit"
        >
          {saving ? "Guardando…" : meal ? "Guardar cambios" : "Crear comida"}
        </button>
      </div>
    </form>
  );
}

function MealProductFilter({
  products,
  selected,
  onSelect,
}: {
  products: Product[];
  selected?: Product;
  onSelect: (product?: Product) => void;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.id]);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const canSearch = normalizedQuery.length >= productSearchMinimumCharacters;
  const matches = canSearch
    ? products
        .filter((product) =>
          product.name.toLocaleLowerCase("es").includes(normalizedQuery),
        )
        .slice(0, productSearchResultsLimit)
    : [];
  return (
    <div
      className="meal-product-filter"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <Search size={16} />
      <input
        aria-expanded={open}
        aria-label="Filtrar comidas por producto"
        onChange={(event) => {
          setQuery(event.target.value);
          onSelect(undefined);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Filtrar por producto"
        value={query}
      />
      {query && (
        <button
          aria-label="Quitar filtro de producto"
          onClick={() => {
            setQuery("");
            onSelect(undefined);
            setOpen(true);
          }}
          type="button"
        >
          <X size={14} />
        </button>
      )}
      {open && canSearch && (
        <div className="meal-product-options">
          {canSearch &&
            matches.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setQuery(product.name);
                  onSelect(product);
                  setOpen(false);
                }}
                type="button"
              >
                {product.name}
              </button>
            ))}
          {canSearch && !matches.length && (
            <p>No hay productos coincidentes.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MealDetail({
  meal,
  onClose,
  onEdit,
}: {
  meal: Meal;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal className="meal-detail-dialog" labelledBy="meal-detail-title" onClose={onClose}>
        <div className="meal-editor-heading">
          <div>
            <p className="section-kicker">DETALLE DE COMIDA</p>
            <h2 id="meal-detail-title">{meal.name}</h2>
            {meal.recommendedSlots.length > 0 && (
              <p className="meal-detail-slots">
                Momento del día:{" "}
                {meal.recommendedSlots.map(slotLabel).join(", ")}
              </p>
            )}
          </div>
          <button
            aria-label="Cerrar detalle"
            className="product-icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <section className="meal-detail-ingredients">
          <h3>Ingredientes</h3>
          <ul>
            {meal.ingredients.map((ingredient, index) => (
              <li key={`${meal.id}-${index}`}>
                <div className="meal-detail-ingredient-heading">
                  <strong>
                    {ingredient.productName} (
                    {formatNumber(ingredient.quantity, 1)}
                    {ingredient.unit === "grams" ? "g" : " uds"})
                  </strong>
                </div>
                <MacroTable compact macros={ingredient.macros} />
              </li>
            ))}
          </ul>
        </section>
        <section className="meal-detail-total">
          <p>Macros totales</p>
          <MacroTable macros={meal.macros} />
        </section>
        <div className="editor-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
          <button className="primary-button" onClick={onEdit} type="button">
            Editar comida
          </button>
        </div>
    </Modal>
  );
}

function MealsPage({
  search,
  onSearchChange,
  productFilter,
  onProductFilterChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  productFilter?: Product;
  onProductFilterChange: (product?: Product) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [editing, setEditing] = useState<Meal | null | undefined>(undefined);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);
  const [permanentDeletion, setPermanentDeletion] = useState<Meal | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [slotFilter, setSlotFilter] = useState<MealSlot | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const beginRequest = useLatestRequest(
    `${status}:${search}:${productFilter?.id ?? ""}`,
  );
  async function refresh() {
    const isLatest = beginRequest();
    if (!isLatest()) return;
    setLoading(true);
    setError(null);
    try {
      const [nextMeals, activeProducts, archivedProducts] = await Promise.all([
        mealsApi.listMeals(status, search, productFilter?.id),
        productApi.list("active"),
        productApi.list("archived"),
      ]);
      if (!isLatest()) return;
      setMeals(nextMeals);
      setProducts(activeProducts);
      setAllProducts([...activeProducts, ...archivedProducts]);
    } catch (reason) {
      if (isLatest()) setError(errorMessage(reason));
    } finally {
      if (isLatest()) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, [status, search, productFilter?.id]);
  async function changeStatus(meal: Meal) {
    try {
      if (meal.status === "active") await mealsApi.archiveMeal(meal.id);
      else await mealsApi.restoreMeal(meal.id);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  async function deletePermanently() {
    if (!permanentDeletion) return;
    try {
      await mealsApi.deleteMeal(permanentDeletion.id);
      setPermanentDeletion(null);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  const visibleMeals =
    slotFilter === "all"
      ? meals
      : meals.filter((meal) => meal.recommendedSlots.includes(slotFilter));
  return (
    <section className="workspace-section">
      <div className="section-toolbar">
        <div className="meal-catalog-controls">
          <div className="catalog-search">
            <Search size={17} />
            <input
              aria-label="Buscar comidas"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar comidas"
              value={search}
            />
          </div>
          <MealProductFilter
            onSelect={onProductFilterChange}
            products={allProducts}
            selected={productFilter}
          />
          <SelectControl>
            <select
              aria-label="Filtrar por momento del día"
              onChange={(event) =>
                setSlotFilter(event.target.value as MealSlot | "all")
              }
              value={slotFilter}
            >
              <option value="all">Todos los momentos</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label}
                </option>
              ))}
            </select>
          </SelectControl>
        </div>
        <div className="toolbar-actions">
          <button
            className="ui-archive-toggle"
            onClick={() =>
              setStatus((current) =>
                current === "active" ? "archived" : "active",
              )
            }
            type="button"
          >
            {status === "active" ? <Archive size={15} /> : <ArrowLeft size={15} />}
            {status === "active" ? "Archivo" : "Volver"}
          </button>
          <button
            className="primary-button"
            onClick={() => setEditing(null)}
            type="button"
          >
            <Plus size={16} /> Añadir comida
          </button>
        </div>
      </div>
      {editing !== undefined && (
        <Modal className="meal-form-dialog" labelledBy="meal-form-title" onClose={() => setEditing(undefined)}>
          <MealForm
            meal={editing ?? undefined}
            onCancel={() => setEditing(undefined)}
            onSaved={async () => {
              await refresh();
              setEditing(undefined);
            }}
            products={editing ? allProducts : products}
          />
        </Modal>
      )}
      <div className="section-heading">
        <div>
          <p className="section-kicker">
            {status === "active" ? "RECETAS" : "ARCHIVO"}
          </p>
          <h2>{status === "active" ? "Tus comidas" : "Comidas archivadas"}</h2>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="workspace-empty">Cargando comidas…</p>}
      {!loading && !error && !visibleMeals.length && (
        <p className="workspace-empty">
          No hay comidas que coincidan con esta búsqueda.
        </p>
      )}
      {!loading && !error && visibleMeals.length > 0 && (
        <div className="meal-card-grid">
          {visibleMeals.map((meal) => {
            const hasHiddenIngredients = meal.ingredients.length > 3;
            const shownIngredients = meal.ingredients.slice(
              0,
              hasHiddenIngredients ? 2 : 3,
            );
            return (
              <article
                className="meal-card meal-card-clickable"
                key={meal.id}
                onClick={() => setDetailMeal(meal)}
              >
                <div className="meal-card-heading">
                  <div>
                    <h3>{meal.name}</h3>
                    <p>
                      {meal.ingredients.length} ingrediente
                      {meal.ingredients.length === 1 ? "" : "s"}
                    </p>
                    {meal.recommendedSlots.length > 0 && (
                      <span className="meal-recommendations">
                        Momento del día:{" "}
                        {meal.recommendedSlots.map(slotLabel).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="card-icon-actions">
                    <button
                      aria-label={`Editar ${meal.name}`}
                      className="product-icon-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(meal);
                      }}
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                    {meal.status === "active" ? (
                      <button
                        aria-label={`Archivar ${meal.name}`}
                        className="product-icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void changeStatus(meal);
                        }}
                        type="button"
                      >
                        <Archive size={16} />
                      </button>
                    ) : (
                      <>
                        <button
                          aria-label={`Más acciones de ${meal.name}`}
                          className="product-icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActionsFor((current) =>
                              current === meal.id ? null : meal.id,
                            );
                          }}
                          type="button"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                        {actionsFor === meal.id && (
                          <div className="card-menu">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setActionsFor(null);
                                void changeStatus(meal);
                              }}
                              type="button"
                            >
                              Restaurar
                            </button>
                            <button
                              className="danger-menu-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActionsFor(null);
                                setPermanentDeletion(meal);
                              }}
                              type="button"
                            >
                              Eliminar definitivamente
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <ul>
                  {shownIngredients.map((ingredient, index) => (
                    <li key={`${meal.id}-${index}`}>
                      {ingredient.productName}
                      <span>
                        {formatNumber(ingredient.quantity, 1)}{" "}
                        {ingredient.unit === "grams" ? "g" : "uds"}
                      </span>
                    </li>
                  ))}
                  {hasHiddenIngredients && (
                    <li className="meal-more-ingredients">
                      +{meal.ingredients.length - shownIngredients.length}{" "}
                      ingredientes
                    </li>
                  )}
                </ul>
                <MacroTable compact macros={meal.macros} />
              </article>
            );
          })}
        </div>
      )}
      {detailMeal && (
        <MealDetail
          meal={detailMeal}
          onClose={() => setDetailMeal(null)}
          onEdit={() => {
            setDetailMeal(null);
            setEditing(detailMeal);
          }}
        />
      )}
      {permanentDeletion && (
        <Modal className="product-removal-dialog permanent-delete-dialog" labelledBy="meal-delete-title" onClose={() => setPermanentDeletion(null)}>
            <div className="product-form-heading">
              <div>
                <p className="section-kicker">ELIMINAR DEFINITIVAMENTE</p>
                <h2 id="meal-delete-title">{permanentDeletion.name}</h2>
              </div>
              <button
                aria-label="Cerrar confirmación"
                className="product-icon-button"
                onClick={() => setPermanentDeletion(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <p>
              Esta acción no se puede deshacer. Solo se eliminará si la comida
              no forma parte de ninguna instancia planificada.
            </p>
            <div className="product-form-actions">
              <button
                className="secondary-button"
                onClick={() => setPermanentDeletion(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                onClick={() => void deletePermanently()}
                type="button"
              >
                Eliminar definitivamente
              </button>
            </div>
        </Modal>
      )}
    </section>
  );
}

function PlanInstanceDetail({
  instance,
  name,
  onClose,
  onEdit,
  onRemove,
  onSync,
}: {
  instance: PlannedInstance;
  name: string;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onSync: () => void;
}) {
  const [confirmingSync, setConfirmingSync] = useState(false);
  return (
    <Modal className="plan-detail-dialog" labelledBy="planned-instance-detail-title" onClose={onClose}>
        <div className="meal-editor-heading">
          <div>
            <p className="section-kicker">DETALLE DE COMIDA PLANIFICADA</p>
            <h2 id="planned-instance-detail-title">{name}</h2>
            <p className="plan-detail-slot">{slotLabel(instance.slot)}</p>
          </div>
          <button
            aria-label="Cerrar detalle"
            className="product-icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        {instance.isRecipeUpdated && (
          <section className="plan-detail-sync-note">
            <strong>La receta original se ha actualizado.</strong>
            <p>
              {instance.isModified
                ? "Actualizar reemplazará los cambios manuales de esta instancia."
                : "Puedes aplicar los ingredientes actuales a esta instancia planificada."}
            </p>
            {confirmingSync ? (
              <div className="plan-detail-sync-actions">
                <span>
                  ¿Quieres reemplazar la instancia por la receta actual?
                </span>
                <div>
                  <button
                    className="secondary-button"
                    onClick={() => setConfirmingSync(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    onClick={onSync}
                    type="button"
                  >
                    Actualizar receta
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="secondary-button"
                onClick={() => {
                  if (instance.isModified) setConfirmingSync(true);
                  else onSync();
                }}
                type="button"
              >
                Actualizar desde receta
              </button>
            )}
          </section>
        )}
        <section className="meal-detail-ingredients">
          <h3>Ingredientes</h3>
          <ul>
            {instance.ingredients.map((ingredient, index) => (
              <li key={`${instance.id}-${index}`}>
                <div className="meal-detail-ingredient-heading">
                  <strong>
                    {ingredient.productName} (
                    {formatNumber(ingredient.quantity, 1)}
                    {ingredient.unit === "grams" ? "g" : " uds"})
                  </strong>
                </div>
                <MacroTable compact macros={ingredient.macros} />
              </li>
            ))}
          </ul>
        </section>
        <section className="meal-detail-total">
          <p>Macros totales</p>
          <MacroTable macros={instance.macros} />
        </section>
        <div className="editor-actions">
          <button className="danger-button" onClick={onRemove} type="button">
            Quitar del plan
          </button>
          <button className="secondary-button" onClick={onEdit} type="button">
            Editar instancia
          </button>
          <button className="primary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
    </Modal>
  );
}

function PlanInstanceEditor({
  instance,
  products,
  onCancel,
  onSaved,
}: {
  instance: PlannedInstance;
  products: Product[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<DraftIngredient[]>(
    instance.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      productName: ingredient.productName,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !drafts.length ||
      drafts.some((draft) => !draft.productId || Number(draft.quantity) <= 0)
    ) {
      setError("La instancia debe tener al menos un ingrediente válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mealsApi.updatePlannedInstance(
        instance.id,
        drafts.map((draft) => ({
          productId: draft.productId,
          quantity: Number(draft.quantity),
          unit: draft.unit,
        })),
      );
      await onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="plan-editor" onSubmit={submit}>
      <div className="meal-editor-heading">
        <div>
          <p className="section-kicker">EDITAR INSTANCIA</p>
          <h2 id="plan-editor-title">Comida planificada</h2>
        </div>
        <button
          aria-label="Cerrar edición"
          className="product-icon-button"
          onClick={onCancel}
          type="button"
        >
          <X size={17} />
        </button>
      </div>
      <IngredientRows
        drafts={drafts}
        onChange={(index, next) =>
          setDrafts((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index ? next : item,
            ),
          )
        }
        onRemove={(index) =>
          setDrafts((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
          )
        }
        onMove={(index, targetIndex) =>
          setDrafts((current) => moveItem(current, index, targetIndex))
        }
        products={products}
      />
      <button
        className="text-action"
        onClick={() =>
          setDrafts((current) => [
            ...current,
            { productId: "", productName: "", quantity: "", unit: "grams" },
          ])
        }
        type="button"
      >
        <Plus size={15} /> Añadir producto
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="editor-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? "Guardando…" : "Guardar instancia"}
        </button>
      </div>
    </form>
  );
}

function PlannerPage({
  weekStart,
  onWeekChange,
}: {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
}) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [target, setTarget] = useState<PlannerTarget | null>(null);
  const [editing, setEditing] = useState<PlannedInstance | null>(null);
  const [editingForm, setEditingForm] = useState<PlannedInstance | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const plannerGridRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const beginRequest = useLatestRequest(weekStart);
  const today = useMadridToday();
  async function refresh() {
    const isLatest = beginRequest();
    if (!isLatest()) return;
    setError(null);
    try {
      const [
        nextPlan,
        activeMeals,
        archivedMeals,
        activeProducts,
        archivedProducts,
      ] = await Promise.all([
        mealsApi.listWeek(weekStart),
        mealsApi.listMeals("active"),
        mealsApi.listMeals("archived"),
        productApi.list("active"),
        productApi.list("archived"),
      ]);
      if (!isLatest()) return;
      setPlan(nextPlan);
      setMeals([...activeMeals, ...archivedMeals]);
      setProducts([...activeProducts, ...archivedProducts]);
    } catch (reason) {
      if (isLatest()) setError(errorMessage(reason));
    }
  }
  useEffect(() => {
    void refresh();
  }, [weekStart]);
  async function addMeal(meal: Meal) {
    if (!target) return;
    try {
      await mealsApi.createPlannedInstance({
        weekStart,
        weekday: target.weekday,
        slot: target.slot,
        mealId: meal.id,
      });
      setTarget(null);
      setPickerQuery("");
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  async function remove(instance: PlannedInstance) {
    try {
      await mealsApi.removePlannedInstance(instance.id);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  async function syncFromMeal(instance: PlannedInstance) {
    try {
      await mealsApi.syncPlannedInstanceFromMeal(instance.id);
      await refresh();
      setEditing(null);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  async function move(
    id: string,
    weekday: number,
    slot: MealSlot,
    position: number,
  ) {
    try {
      await mealsApi.movePlannedInstance(id, { weekday, slot, position });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  useEffect(() => {
    const grid = plannerGridRef.current;
    if (!grid || !plan) return;

    let active: {
      chip: HTMLElement;
      id: string;
      pointerId: number;
      startX: number;
      startY: number;
      offsetX: number;
      offsetY: number;
      moved: boolean;
      preview: HTMLElement | null;
      source: PlannedInstance;
    } | null = null;
    let suppressClick = false;

    const reset = () => {
      if (active) {
        active.chip.classList.remove("pointer-dragging");
        active.preview?.remove();
      }
      active = null;
    };
    const movePreview = (event: PointerEvent) => {
      if (!active?.preview) return;
      active.preview.style.transform = `translate3d(${event.clientX - active.offsetX}px, ${event.clientY - active.offsetY}px, 0)`;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const chip = event.target.closest<HTMLElement>(".planned-chip");
      if (!chip || !grid.contains(chip) || event.target.closest("button"))
        return;
      const source = plan.instances.find(
        (instance) => instance.id === chip.dataset.instanceId,
      );
      if (!source) return;
      const bounds = chip.getBoundingClientRect();
      active = {
        chip,
        id: source.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - bounds.left,
        offsetY: event.clientY - bounds.top,
        moved: false,
        preview: null,
        source,
      };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!active || active.pointerId !== event.pointerId) return;
      if (
        !active.moved &&
        Math.hypot(
          event.clientX - active.startX,
          event.clientY - active.startY,
        ) < 6
      )
        return;
      event.preventDefault();
      if (!active.moved) {
        active.moved = true;
        active.chip.classList.add("pointer-dragging");
        const preview = active.chip.cloneNode(true) as HTMLElement;
        preview.classList.add("planner-drag-preview");
        preview.setAttribute("aria-hidden", "true");
        preview.style.width = `${active.chip.getBoundingClientRect().width}px`;
        document.body.append(preview);
        active.preview = preview;
        movePreview(event);
      } else movePreview(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!active || active.pointerId !== event.pointerId) return;
      const drag = active;
      if (!drag.moved) {
        active = null;
        return;
      }
      suppressClick = true;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const cell =
        target instanceof Element
          ? target.closest<HTMLElement>(".real-slot-cell")
          : null;
      reset();
      if (!cell || !grid.contains(cell)) return;
      const weekday = Number(cell?.dataset.weekday);
      const slot = cell?.dataset.slot as MealSlot | undefined;
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !slot)
        return;
      const hoveredChip =
        target instanceof Element
          ? target.closest<HTMLElement>(".planned-chip")
          : null;
      const chips = Array.from(
        cell?.querySelectorAll<HTMLElement>(".planned-chip") ?? [],
      );
      const hoveredPosition = Number(hoveredChip?.dataset.position);
      const hoveredBounds = hoveredChip?.getBoundingClientRect();
      let position = !Number.isInteger(hoveredPosition)
        ? chips.length
        : hoveredPosition +
          (hoveredBounds &&
          event.clientY > hoveredBounds.top + hoveredBounds.height / 2
            ? 1
            : 0);
      if (
        drag.source.weekday === weekday &&
        drag.source.slot === slot &&
        position > drag.source.position
      )
        position -= 1;
      void move(drag.id, weekday, slot, position);
    };
    const onPointerCancel = () => reset();
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    grid.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    grid.addEventListener("click", onClickCapture, true);
    return () => {
      grid.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      grid.removeEventListener("click", onClickCapture, true);
    };
  }, [plan, weekStart]);
  const mealName = (instance: PlannedInstance) =>
    meals.find((meal) => meal.id === instance.sourceMealId)?.name ??
    "Comida planificada";
  const pickerMeals = useMemo(() => {
    if (!target) return [];
    const normalized = pickerQuery.trim().toLocaleLowerCase("es");
    return meals
      .filter(
        (meal) =>
          meal.status === "active" &&
          meal.name.toLocaleLowerCase("es").includes(normalized),
      )
      .sort(
        (left, right) =>
          Number(right.recommendedSlots.includes(target.slot)) -
            Number(left.recommendedSlots.includes(target.slot)) ||
          left.name.localeCompare(right.name, "es"),
      );
  }, [meals, pickerQuery, target]);
  return (
    <section className="planner-section">
      <div className="planner-toolbar">
        <div className="week-navigation">
          <button
            aria-label="Semana anterior"
            className="product-icon-button"
            onClick={() => onWeekChange(offsetWeek(weekStart, -1))}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="section-kicker">SEMANA</p>
            <h2>{formatWeek(weekStart)}</h2>
          </div>
          <button
            aria-label="Semana siguiente"
            className="product-icon-button"
            onClick={() => onWeekChange(offsetWeek(weekStart, 1))}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="today-button"
            onClick={() => onWeekChange(currentWeekStart())}
            type="button"
          >
            Hoy
          </button>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="real-planner-card planner-day-summary-card">
        <div className="real-day-summary-grid">
          <div className="real-summary-heading">Macros</div>
          {weekdays.map((_, weekday) => {
            const macros =
              plan?.dailyMacros.find((item) => item.weekday === weekday)
                ?.macros ?? emptyMacros;
            const isToday = dayIso(weekStart, weekday) === today;
            return (
              <div
                className={
                  isToday ? "real-day-summary today" : "real-day-summary"
                }
                key={`summary-${weekday}`}
              >
                <MacroTable compact macros={macros} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="real-planner-card">
        <div className="real-week-grid" ref={plannerGridRef}>
          <div className="real-grid-corner">
            <CalendarDays size={15} />
          </div>
          {weekdays.map((label, weekday) => {
            const isToday = dayIso(weekStart, weekday) === today;
            return (
              <div
                className={
                  isToday ? "real-day-heading today" : "real-day-heading"
                }
                key={label}
              >
                <span>{label}</span>
                <strong>{formatDay(weekStart, weekday)}</strong>
              </div>
            );
          })}
          {slots.flatMap((slot) => [
            <div className="real-slot-heading" key={`${slot.id}-heading`}>
              <span>{slot.label}</span>
            </div>,
            ...weekdays.map((_, weekday) => {
              const instances = (plan?.instances ?? [])
                .filter(
                  (instance) =>
                    instance.slot === slot.id && instance.weekday === weekday,
                )
                .sort((left, right) => left.position - right.position);
              const isToday = dayIso(weekStart, weekday) === today;
              return (
                <div
                  className={
                    isToday ? "real-slot-cell today" : "real-slot-cell"
                  }
                  data-slot={slot.id}
                  data-weekday={weekday}
                  key={`${slot.id}-${weekday}`}
                >
                  {instances.map((instance) => (
                    <div
                      aria-label={`${instance.isModified ? "Instancia editada. " : ""}${instance.isRecipeUpdated ? "Receta actualizada. " : ""}Editar ${mealName(instance)}`}
                      className={`planned-chip${instance.isModified ? " modified" : ""}${instance.isRecipeUpdated ? " recipe-updated" : ""}`}
                      data-instance-id={instance.id}
                      data-position={instance.position}
                      key={instance.id}
                      onClick={() => setEditing(instance)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setEditing(instance);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="planned-chip-content">
                        <div className="planned-chip-heading">
                          <strong>{mealName(instance)}</strong>
                          {instance.isModified && (
                            <span
                              aria-hidden="true"
                              className="planned-chip-modified-marker"
                            >
                              *
                            </span>
                          )}
                          {instance.isRecipeUpdated && (
                            <RefreshCw
                              aria-hidden="true"
                              className="planned-chip-updated-icon"
                              size={14}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    aria-label={`Añadir en ${slot.label}`}
                    className="add-plan-button"
                    onClick={() => setTarget({ weekday, slot: slot.id })}
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            }),
          ])}
        </div>
      </div>
      {target && (
        <Modal className="picker-card" labelledBy="meal-picker-title" onClose={() => setTarget(null)}>
            <div className="picker-card-header">
              <div className="meal-editor-heading">
                <div>
                  <p className="section-kicker">AÑADIR AL PLAN</p>
                  <h2 id="meal-picker-title">
                    {slotLabel(target.slot)} ({weekdays[target.weekday]})
                  </h2>
                </div>
                <button
                  aria-label="Cerrar selector"
                  className="product-icon-button"
                  onClick={() => setTarget(null)}
                  type="button"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="catalog-search picker-search">
                <Search size={17} />
                <input
                  autoFocus
                  onChange={(event) => setPickerQuery(event.target.value)}
                  placeholder="Buscar comida"
                  value={pickerQuery}
                />
              </div>
            </div>
            <div className="picker-card-body">
              {!pickerMeals.length ? (
                <p className="inline-note">
                  No hay comidas activas que coincidan.
                </p>
              ) : (
                <div className="meal-choice-list">
                  {pickerMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => void addMeal(meal)}
                      type="button"
                    >
                      <span>
                        <strong>{meal.name}</strong>
                        {meal.recommendedSlots.length > 0 && (
                          <small>
                            Momento del día:{" "}
                            {meal.recommendedSlots.map(slotLabel).join(", ")}
                          </small>
                        )}
                        <MacroTable compact macros={meal.macros} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
        </Modal>
      )}
      {editing && (
        <PlanInstanceDetail
          instance={editing}
          name={mealName(editing)}
          onClose={() => setEditing(null)}
          onEdit={() => {
            setEditingForm(editing);
            setEditing(null);
          }}
          onRemove={() => {
            void remove(editing);
            setEditing(null);
          }}
          onSync={() => void syncFromMeal(editing)}
        />
      )}
      {editingForm && (
        <Modal className="plan-editor-dialog" labelledBy="plan-editor-title" onClose={() => setEditingForm(null)}>
          <PlanInstanceEditor
            instance={editingForm}
            onCancel={() => setEditingForm(null)}
            onSaved={async () => {
              await refresh();
              setEditingForm(null);
            }}
            products={products}
          />
        </Modal>
      )}
    </section>
  );
}

function recommendationLabel(entry: ShoppingEntry) {
  const recommendation = entry.recommendation;
  if (!recommendation) return `${formatNumber(entry.pendingGrams)} g`;
  if (recommendation.kind === "packages")
    return `${recommendation.packages} paquete${recommendation.packages === 1 ? "" : "s"}`;
  if (recommendation.kind === "units")
    return `${recommendation.units} ud${recommendation.units === 1 ? "" : "s"}`;
  return `${formatNumber(recommendation.grams)} g`;
}

function quantityWithUnits(product: Product, grams: number) {
  const perUnit = gramsPerUnit(product);
  const gramsLabel = `${formatNumber(grams)} g`;
  return perUnit
    ? `${gramsLabel} (${formatNumber(grams / perUnit, 2)} uds)`
    : gramsLabel;
}

function packageRecommendationDetails(entry: ShoppingEntry) {
  const presentation = entry.product.presentation;
  const recommendation = entry.recommendation;
  if (
    presentation?.kind !== "package" ||
    recommendation?.kind !== "packages"
  )
    return null;
  const units = presentation.unitsPerPackage;
  const perPackage = `${formatNumber(presentation.totalGrams)} g${
    units ? ` (${formatNumber(units)} uds)` : ""
  } por paquete`;
  const total =
    recommendation.packages > 1
      ? `Total: ${quantityWithUnits(entry.product, recommendation.grams)}`
      : null;
  return { perPackage, total };
}

function ManualShoppingNeedForm({
  weekStart,
  products,
  onCancel,
  onSaved,
}: {
  weekStart: string;
  products: Product[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<QuantityUnit>("grams");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const canSearch = normalizedQuery.length >= productSearchMinimumCharacters;
  const matches = canSearch
    ? products
        .filter((product) =>
          product.name.toLocaleLowerCase("es").includes(normalizedQuery),
        )
        .slice(0, productSearchResultsLimit)
    : [];
  const supportsUnits = Boolean(
    selected && gramsPerUnit(selected) !== undefined,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!selected || !Number.isFinite(value) || value <= 0) {
      setError("Elige un producto e indica una cantidad mayor que cero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mealsApi.addManualShoppingNeed(weekStart, selected.id, value, unit);
      await onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal className="manual-shopping-modal" labelledBy="manual-shopping-title" onClose={onCancel}>
      <form className="manual-shopping-dialog" onSubmit={submit}>
        <div className="meal-editor-heading">
          <div>
            <p className="section-kicker">AÑADIR A LA COMPRA</p>
            <h2 id="manual-shopping-title">Producto manual</h2>
          </div>
          <button
            aria-label="Cerrar formulario"
            className="product-icon-button"
            onClick={onCancel}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <p className="inline-note">
          Se añadirá solo a esta semana. No modifica recetas ni el planificador.
        </p>
        <label className="meal-field">
          <span>Producto</span>
          <div
            className="ingredient-product-search"
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setOpen(false);
            }}
          >
            <Search size={15} />
            <input
              aria-expanded={open}
              autoFocus
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
                setUnit("grams");
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Busca un producto"
              value={query}
            />
            {open && canSearch && (
              <div className="ingredient-product-options">
                {canSearch &&
                  matches.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setQuery(product.name);
                        setSelected(product);
                        setOpen(false);
                      }}
                      type="button"
                    >
                      {product.name}
                    </button>
                  ))}
                {canSearch && !matches.length && (
                  <p>No hay productos coincidentes.</p>
                )}
              </div>
            )}
          </div>
        </label>
        <label className="meal-field">
          <span>Cantidad</span>
          <div className="available-input">
            <input
              inputMode="decimal"
              min="0.01"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              step="any"
              type="number"
              value={amount}
            />
            {supportsUnits ? (
              <SelectControl>
                <select
                  aria-label="Unidad de la cantidad"
                  onChange={(event) => {
                    const nextUnit = event.target.value as QuantityUnit;
                    setAmount(
                      convertedQuantity(amount, unit, nextUnit, selected),
                    );
                    setUnit(nextUnit);
                  }}
                  value={unit}
                >
                  <option value="grams">g</option>
                  <option value="units">uds</option>
                </select>
              </SelectControl>
            ) : (
              <span className="fixed-unit">g</span>
            )}
          </div>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Añadiendo…" : "Añadir a la compra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ShoppingPage({
  weekStart,
  onWeekChange,
  supermarketFilters,
  onSupermarketFiltersChange,
}: {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  supermarketFilters: SupermarketFilterValue[];
  onSupermarketFiltersChange: (filters: SupermarketFilterValue[]) => void;
}) {
  const [entries, setEntries] = useState<ShoppingEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, QuantityUnit>>({});
  const [estimatedTotalCents, setEstimatedTotalCents] = useState<
    number | null | undefined
  >();
  const [pendingEstimatedTotalCents, setPendingEstimatedTotalCents] = useState<
    number | null | undefined
  >();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingManualNeed, setAddingManualNeed] = useState(false);
  const saveTimers = useRef<Record<string, number>>({});
  const beginRequest = useLatestRequest(weekStart);
  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) =>
        matchesSupermarketFilter(entry.product.supermarket, supermarketFilters),
      ),
    [entries, supermarketFilters],
  );
  async function refresh(showLoading = false) {
    const isLatest = beginRequest();
    if (!isLatest()) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [list, activeProducts] = await Promise.all([
        mealsApi.listShoppingList(weekStart),
        productApi.list("active"),
      ]);
      if (!isLatest()) return;
      setEntries(list.entries);
      setProducts(activeProducts);
      setEstimatedTotalCents(list.estimatedTotalCents);
      setPendingEstimatedTotalCents(list.pendingEstimatedTotalCents);
    } catch (reason) {
      if (isLatest()) setError(errorMessage(reason));
    } finally {
      if (showLoading && isLatest()) setLoading(false);
    }
  }
  useEffect(() => {
    setAmounts({});
    setUnits({});
    void refresh(true);
    return () =>
      Object.values(saveTimers.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
  }, [weekStart]);
  function availableValue(entry: ShoppingEntry) {
    const unit = units[entry.product.id] ?? entry.preferredUnit;
    const perUnit = gramsPerUnit(entry.product);
    return unit === "units" && perUnit
      ? entry.availableGrams / perUnit
      : entry.availableGrams;
  }
  function displayedAvailableGrams(entry: ShoppingEntry) {
    const id = entry.product.id;
    const rawValue = amounts[id];
    if (rawValue === undefined) return entry.availableGrams;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) return entry.availableGrams;
    const unit = units[id] ?? entry.preferredUnit;
    const perUnit = gramsPerUnit(entry.product);
    return unit === "units" && perUnit ? value * perUnit : value;
  }
  function saveAvailable(
    entry: ShoppingEntry,
    rawValue: string,
    unit: QuantityUnit,
  ) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      setError("«Tienes» debe ser una cantidad igual o mayor que cero.");
      return;
    }
    void (async () => {
      try {
        await mealsApi.setWeeklyAvailable(
          weekStart,
          entry.product.id,
          value,
          unit,
        );
        await refresh();
      } catch (reason) {
        setError(errorMessage(reason));
      }
    })();
  }
  function updateAvailable(entry: ShoppingEntry, value: string) {
    const id = entry.product.id;
    const unit = units[id] ?? entry.preferredUnit;
    setAmounts((current) => ({ ...current, [id]: value }));
    window.clearTimeout(saveTimers.current[id]);
    if (value.trim() !== "")
      saveTimers.current[id] = window.setTimeout(
        () => saveAvailable(entry, value, unit),
        300,
      );
  }
  function changeUnit(entry: ShoppingEntry, unit: QuantityUnit) {
    const id = entry.product.id;
    const currentUnit = units[id] ?? entry.preferredUnit;
    const currentValue =
      amounts[id] ?? editableNumber(availableValue(entry));
    window.clearTimeout(saveTimers.current[id]);
    setUnits((current) => ({ ...current, [id]: unit }));
    setAmounts((current) => ({
      ...current,
      [id]: convertedQuantity(
        currentValue,
        currentUnit,
        unit,
        entry.product,
      ),
    }));
    void mealsApi.setProductShoppingUnit(id, unit).catch((reason) =>
      setError(errorMessage(reason)),
    );
  }
  async function changeChecked(entry: ShoppingEntry, isChecked: boolean) {
    try {
      await mealsApi.setShoppingEntryChecked(
        weekStart,
        entry.product.id,
        isChecked,
      );
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  async function removeManualNeed(entry: ShoppingEntry) {
    try {
      await mealsApi.removeManualShoppingNeed(weekStart, entry.product.id);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  return (
    <section className="shopping-section">
      <div className="shopping-heading">
        <div className="shopping-heading-main">
          <div className="week-navigation">
            <button
              aria-label="Semana anterior"
              className="product-icon-button"
              onClick={() => onWeekChange(offsetWeek(weekStart, -1))}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <p className="section-kicker">COMPRA SEMANAL</p>
              <h2>{formatWeek(weekStart)}</h2>
            </div>
            <button
              aria-label="Semana siguiente"
              className="product-icon-button"
              onClick={() => onWeekChange(offsetWeek(weekStart, 1))}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="today-button"
              onClick={() => onWeekChange(currentWeekStart())}
              type="button"
            >
              Hoy
            </button>
          </div>
          {entries.length > 0 && (
            <div className="shopping-cost-summary">
              <span>Coste pendiente estimado</span>
              <strong>{formatCurrency(pendingEstimatedTotalCents)}</strong>
              <small>
                Total planificado: {formatCurrency(estimatedTotalCents)}
              </small>
            </div>
          )}
          <p className="shopping-intro">
            Indica lo que ya tienes para esta semana y la recomendación se
            recalculará.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setAddingManualNeed(true)}
          type="button"
        >
          <Plus size={16} /> Añadir producto
        </button>
      </div>
      {entries.length > 0 && (
        <div className="shopping-filters">
          <SupermarketMultiFilter
            onChange={onSupermarketFiltersChange}
            selected={supermarketFilters}
          />
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="workspace-empty">Calculando la compra…</p>}
      {!loading && !error && !entries.length && (
        <p className="workspace-empty">
          No hay productos en la compra de esta semana.
        </p>
      )}
      {!loading && !error && entries.length > 0 && !visibleEntries.length && (
        <p className="workspace-empty">
          No hay productos que coincidan con los supermercados elegidos.
        </p>
      )}
      {!loading && !error && visibleEntries.length > 0 && (
        <div className="shopping-entry-list">
          {visibleEntries.map((entry) => {
            const unit = units[entry.product.id] ?? entry.preferredUnit;
            const supportsUnits = gramsPerUnit(entry.product) !== undefined;
            const packageDetails = packageRecommendationDetails(entry);
            return (
              <article
                className={
                  entry.isChecked ? "shopping-entry complete" : "shopping-entry"
                }
                key={entry.product.id}
              >
                <label className="shopping-check">
                  <input
                    aria-label={`Marcar ${entry.product.name} como comprado`}
                    checked={entry.isChecked}
                    onChange={(event) =>
                      void changeChecked(entry, event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
                <div className="shopping-product-summary">
                  <span className="product-category">
                    {categoryLabels[entry.product.category]}
                  </span>
                  <h3>{entry.product.name}</h3>
                  <small>
                    {entry.product.supermarket
                      ? supermarketLabels[entry.product.supermarket]
                      : "Cualquiera"}
                  </small>
                  <div className="shopping-recommendation">
                    <span>Compra recomendada</span>
                    <strong>{recommendationLabel(entry)}</strong>
                    {packageDetails && (
                      <small>{packageDetails.perPackage}</small>
                    )}
                    {packageDetails?.total && (
                      <small>{packageDetails.total}</small>
                    )}
                    {entry.estimatedCostCents !== undefined && (
                      <small>{formatCurrency(entry.estimatedCostCents)}</small>
                    )}
                  </div>
                  {entry.manualNeededGrams > 0 && (
                    <div className="manual-shopping-note">
                      <strong>Añadido manualmente</strong>
                      <span>No forma parte del plan de comidas.</span>
                      <button
                        onClick={() => void removeManualNeed(entry)}
                        type="button"
                      >
                        Quitar añadido manual
                      </button>
                    </div>
                  )}
                </div>
                <div className="shopping-needs">
                  <p>
                    Necesitas:{" "}
                    <strong>
                      {quantityWithUnits(entry.product, entry.neededGrams)}
                    </strong>
                  </p>
                  <p>
                    Pendiente:{" "}
                    <strong>
                      {quantityWithUnits(entry.product, entry.pendingGrams)}
                    </strong>
                  </p>
                  <p>
                    Sobrante teórico:{" "}
                    <strong>
                      {entry.theoreticalLeftoverGrams === undefined
                        ? "No disponible"
                        : quantityWithUnits(
                            entry.product,
                            entry.theoreticalLeftoverGrams,
                          )}
                    </strong>
                  </p>
                </div>
                <label className="shopping-available">
                  <span>Tienes ({unit === "grams" ? "g" : "uds"})</span>
                  <div className="available-input">
                    <input
                      aria-label={`Tienes de ${entry.product.name}`}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) =>
                        updateAvailable(entry, event.target.value)
                      }
                      step="any"
                      type="number"
                      value={
                        amounts[entry.product.id] ??
                        editableNumber(availableValue(entry))
                      }
                    />
                    {supportsUnits && (
                      <SelectControl>
                        <select
                          aria-label={`Unidad disponible de ${entry.product.name}`}
                          onChange={(event) =>
                            changeUnit(
                              entry,
                              event.target.value as QuantityUnit,
                            )
                          }
                          value={unit}
                        >
                          <option value="grams">g</option>
                          <option value="units">uds</option>
                        </select>
                      </SelectControl>
                    )}
                  </div>
                  {supportsUnits && (
                    <small className="shopping-available-equivalence">
                      {quantityWithUnits(
                        entry.product,
                        displayedAvailableGrams(entry),
                      )}
                    </small>
                  )}
                </label>
              </article>
            );
          })}
        </div>
      )}
      {addingManualNeed && (
        <ManualShoppingNeedForm
          onCancel={() => setAddingManualNeed(false)}
          onSaved={async () => {
            await refresh();
            setAddingManualNeed(false);
          }}
          products={products}
          weekStart={weekStart}
        />
      )}
    </section>
  );
}

export default function MealsWorkspace() {
  const [section, setSection] = useState<Section>("planner");
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [productFilters, setProductFilters] = useState<ProductCatalogFilters>({
    query: "",
    category: "all",
    supermarkets: [],
  });
  const [shoppingSupermarketFilters, setShoppingSupermarketFilters] = useState<
    SupermarketFilterValue[]
  >([]);
  const [mealSearch, setMealSearch] = useState("");
  const [mealProductFilter, setMealProductFilter] = useState<
    Product | undefined
  >();
  const tabs: Array<{
    id: Section;
    label: string;
    icon: typeof UtensilsCrossed;
  }> = [
    { id: "planner", label: "Planificador", icon: CalendarDays },
    { id: "shopping", label: "Compra", icon: ShoppingCart },
    { id: "products", label: "Productos", icon: ClipboardList },
    { id: "meals", label: "Comidas", icon: UtensilsCrossed },
  ];
  return (
    <section className="meals-workspace">
      <nav aria-label="Secciones de comidas" className="workspace-tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            className={
              section === id ? "workspace-tab active" : "workspace-tab"
            }
            key={id}
            onClick={() => setSection(id)}
            type="button"
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      {section === "products" && (
        <ProductsPage
          filters={productFilters}
          onFiltersChange={setProductFilters}
          onSearchMeals={(product) => {
            setMealProductFilter(product);
            setSection("meals");
          }}
        />
      )}
      {section === "meals" && (
        <MealsPage
          onProductFilterChange={setMealProductFilter}
          onSearchChange={setMealSearch}
          productFilter={mealProductFilter}
          search={mealSearch}
        />
      )}
      {section === "planner" && (
        <PlannerPage onWeekChange={setWeekStart} weekStart={weekStart} />
      )}
      {section === "shopping" && (
        <ShoppingPage
          onSupermarketFiltersChange={setShoppingSupermarketFilters}
          onWeekChange={setWeekStart}
          supermarketFilters={shoppingSupermarketFilters}
          weekStart={weekStart}
        />
      )}
    </section>
  );
}
