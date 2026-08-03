import { Archive, MoreHorizontal, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { mealsApi, type Meal } from "../api";
import {
  categoryLabels, productApi, productCategories, supermarketLabels,
  type Product, type ProductCategory, type ProductInput, type ProductStatus, type PurchasePresentation, type Supermarket,
} from "./api";
import "./products.css";

type PresentationKind = "none" | "package" | "bulkByWeight";
export type ProductCatalogFilters = { query: string; category: ProductCategory | "all" };

type ProductFormValues = {
  name: string; category: ProductCategory; protein: string; carbohydrate: string; fat: string; kilocalories: string;
  supermarket: Supermarket | ""; presentationKind: PresentationKind; packageTotalGrams: string; packagePriceEur: string;
  packageUnits: string; bulkWeightPriceEur: string; legacyPresentation: boolean;
};

const initialValues: ProductFormValues = {
  name: "", category: "other", protein: "0", carbohydrate: "0", fat: "0", kilocalories: "0", supermarket: "",
  presentationKind: "none", packageTotalGrams: "", packagePriceEur: "", packageUnits: "", bulkWeightPriceEur: "", legacyPresentation: false,
};

function errorMessage(error: unknown) { return typeof error === "string" ? error : "No se ha podido guardar el producto."; }
function optional(value: string) { return value.trim() || undefined; }
function number(value: string) { return Number(value); }
function presentationSummary(presentation?: PurchasePresentation) {
  if (!presentation) return "Sin presentación de compra";
  if (presentation.kind === "package") return `Paquete · ${presentation.totalGrams} g${presentation.unitsPerPackage ? ` · ${presentation.unitsPerPackage} uds` : ""}${presentation.priceEur ? ` · ${presentation.priceEur} €` : ""}`;
  if (presentation.kind === "bulkByWeight") return `A granel por peso${presentation.priceEurPerKilogram ? ` · ${presentation.priceEurPerKilogram} €/kg` : ""}`;
  return `Formato heredado · a granel por unidad${presentation.gramsPerUnit ? ` · ${presentation.gramsPerUnit} g/ud` : ""}`;
}

function valuesFromProduct(product: Product): ProductFormValues {
  const base: ProductFormValues = {
    ...initialValues, name: product.name, category: product.category, protein: String(product.proteinGramsPer100g),
    carbohydrate: String(product.carbohydrateGramsPer100g), fat: String(product.fatGramsPer100g), kilocalories: String(product.kilocaloriesPer100g),
    supermarket: product.supermarket ?? "",
  };
  if (!product.presentation) return base;
  if (product.presentation.kind === "package") return { ...base, presentationKind: "package", packageTotalGrams: String(product.presentation.totalGrams), packagePriceEur: product.presentation.priceEur ?? "", packageUnits: product.presentation.unitsPerPackage ? String(product.presentation.unitsPerPackage) : "" };
  if (product.presentation.kind === "bulkByWeight") return { ...base, presentationKind: "bulkByWeight", bulkWeightPriceEur: product.presentation.priceEurPerKilogram ?? "" };
  return { ...base, legacyPresentation: true };
}

function inputFromValues(values: ProductFormValues): ProductInput {
  const presentation = values.presentationKind === "package"
    ? { kind: "package" as const, totalGrams: number(values.packageTotalGrams), priceEur: optional(values.packagePriceEur), unitsPerPackage: optional(values.packageUnits) ? number(values.packageUnits) : undefined }
    : values.presentationKind === "bulkByWeight"
      ? { kind: "bulkByWeight" as const, priceEurPerKilogram: optional(values.bulkWeightPriceEur) }
      : undefined;
  return {
    name: values.name, category: values.category, proteinGramsPer100g: number(values.protein), carbohydrateGramsPer100g: number(values.carbohydrate),
    fatGramsPer100g: number(values.fat), kilocaloriesPer100g: number(values.kilocalories), supermarket: values.supermarket || undefined, presentation,
  };
}

function NumberField({ label, value, onChange, required, min = "0", step = "1" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; min?: string; step?: string }) {
  return <label className="product-field"><span>{label}</span><input inputMode="decimal" min={min} onChange={(event) => onChange(event.target.value)} required={required} step={step} type="number" value={value} /></label>;
}

function ProductForm({ product, onCancel, onSaved }: { product?: Product; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [values, setValues] = useState<ProductFormValues>(() => product ? valuesFromProduct(product) : initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = <Key extends keyof ProductFormValues>(key: Key, value: ProductFormValues[Key]) => setValues((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    try { if (product) await productApi.update(product.id, inputFromValues(values)); else await productApi.create(inputFromValues(values)); await onSaved(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setSaving(false); }
  }
  return <form className="product-form" onSubmit={submit}>
    <div className="product-form-heading"><div><p className="section-kicker">{product ? "EDITAR PRODUCTO" : "NUEVO PRODUCTO"}</p><h2>{product?.name ?? "Añade un producto"}</h2></div><button aria-label="Cerrar formulario" className="product-icon-button" onClick={onCancel} type="button"><X size={18} /></button></div>
    <div className="product-form-grid">
      <label className="product-field product-field-wide"><span>Nombre</span><input autoFocus onChange={(event) => update("name", event.target.value)} required value={values.name} /></label>
      <label className="product-field"><span>Categoría</span><select onChange={(event) => update("category", event.target.value as ProductCategory)} value={values.category}>{productCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
      <label className="product-field"><span>Supermercado <small>opcional</small></span><select onChange={(event) => update("supermarket", event.target.value as Supermarket | "")} value={values.supermarket}><option value="">Sin especificar</option>{Object.entries(supermarketLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </div>
    <fieldset className="product-fieldset"><legend>Macros por 100 g</legend><div className="product-form-grid product-macro-grid"><NumberField label="Kcal" onChange={(value) => update("kilocalories", value)} required value={values.kilocalories} /><NumberField label="Proteínas (g)" onChange={(value) => update("protein", value)} required value={values.protein} /><NumberField label="Carbohidratos (g)" onChange={(value) => update("carbohydrate", value)} required value={values.carbohydrate} /><NumberField label="Grasas (g)" onChange={(value) => update("fat", value)} required value={values.fat} /></div></fieldset>
    <fieldset className="product-fieldset"><legend>Presentación de compra</legend><p className="product-fieldset-description">El nombre del producto será el que aparezca en tu lista de compra.</p>
      {values.legacyPresentation && <p className="legacy-note">Este producto usa un formato heredado. Al guardarlo, elige una presentación actual o ninguna.</p>}
      <label className="product-field"><span>Tipo</span><select onChange={(event) => update("presentationKind", event.target.value as PresentationKind)} value={values.presentationKind}><option value="none">Sin presentación</option><option value="package">Paquete, bolsa o bandeja</option><option value="bulkByWeight">A granel por peso</option></select></label>
      {values.presentationKind === "package" && <div className="product-form-grid product-presentation-fields"><NumberField label="Peso total (g)" min="0.01" onChange={(value) => update("packageTotalGrams", value)} required step="1" value={values.packageTotalGrams} /><NumberField label="Unidades por paquete · opcional" min="1" onChange={(value) => update("packageUnits", value)} step="1" value={values.packageUnits} /><label className="product-field"><span>Precio del paquete · €</span><input inputMode="decimal" onChange={(event) => update("packagePriceEur", event.target.value)} placeholder="2,99" value={values.packagePriceEur} /></label></div>}
      {values.presentationKind === "bulkByWeight" && <div className="product-presentation-fields"><label className="product-field"><span>Precio por kg · €</span><input inputMode="decimal" onChange={(event) => update("bulkWeightPriceEur", event.target.value)} placeholder="2,99" value={values.bulkWeightPriceEur} /></label></div>}
    </fieldset>
    {error && <p className="product-form-error" role="alert">{error}</p>}
    <div className="product-form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}</button></div>
  </form>;
}

export default function ProductsPage({ filters, onFiltersChange, onSearchMeals }: { filters: ProductCatalogFilters; onFiltersChange: (filters: ProductCatalogFilters) => void; onSearchMeals: (product: Product) => void }) {
  const [products, setProducts] = useState<Product[]>([]); const [status, setStatus] = useState<ProductStatus>("active");
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [removal, setRemoval] = useState<{ product: Product; meals: Meal[] } | null>(null); const [categoryOpen, setCategoryOpen] = useState(false); const [actionsFor, setActionsFor] = useState<string | null>(null);
  async function loadProducts() { setLoading(true); setError(null); try { setProducts(await productApi.list(status)); } catch (reason) { setError(errorMessage(reason)); } finally { setLoading(false); } }
  useEffect(() => { void loadProducts(); }, [status]);
  const visible = useMemo(() => products.filter((product) => (filters.category === "all" || product.category === filters.category) && product.name.toLocaleLowerCase("es").includes(filters.query.trim().toLocaleLowerCase("es"))), [filters, products]);
  async function changeStatus(product: Product) { try { if (product.status === "active") await productApi.archive(product.id); else await productApi.restore(product.id); await loadProducts(); } catch (reason) { setError(errorMessage(reason)); } }
  async function inspectRemoval(product: Product) { try { const meals = await mealsApi.mealsAffectedByProduct(product.id); if (!meals.length) { setError(`${product.name} no aparece en ninguna comida.`); return; } setRemoval({ product, meals }); } catch (reason) { setError(errorMessage(reason)); } }
  async function removeFromMeals() { if (!removal) return; try { await mealsApi.removeProductFromMeals(removal.product.id); setRemoval(null); } catch (reason) { setError(errorMessage(reason)); } }
  const categoryLabel = filters.category === "all" ? "Todas las categorías" : categoryLabels[filters.category];
  return <section className="products-page">
    <div className="products-toolbar"><div className="catalog-search"><Search size={17} /><input aria-label="Buscar productos" onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} placeholder="Buscar productos" value={filters.query} /></div><div className="toolbar-actions"><button className="archive-link" onClick={() => setStatus((current) => current === "active" ? "archived" : "active")} type="button"><Archive size={15} /> {status === "active" ? "Archivo" : "Volver al catálogo"}</button><button className="primary-button" onClick={() => setEditing(null)} type="button"><Plus size={16} /> Añadir producto</button></div></div>
    {editing !== undefined && <ProductForm product={editing ?? undefined} onCancel={() => setEditing(undefined)} onSaved={async () => { await loadProducts(); setEditing(undefined); }} />}
    <div className="products-catalog-heading"><div><p className="section-kicker">{status === "active" ? "CATÁLOGO" : "ARCHIVO"}</p><h2>{status === "active" ? "Tus productos" : "Productos archivados"}</h2></div><div className="category-control"><button aria-expanded={categoryOpen} className="category-button" onClick={() => setCategoryOpen((value) => !value)} type="button">{categoryLabel}</button>{categoryOpen && <div className="category-menu"><button className={filters.category === "all" ? "active" : ""} onClick={() => { onFiltersChange({ ...filters, category: "all" }); setCategoryOpen(false); }} type="button">Todas las categorías</button>{productCategories.map((category) => <button className={filters.category === category ? "active" : ""} key={category} onClick={() => { onFiltersChange({ ...filters, category }); setCategoryOpen(false); }} type="button">{categoryLabels[category]}</button>)}</div>}</div></div>
    {error && <p className="products-error" role="alert">{error}</p>}{loading && <p className="products-empty">Cargando productos…</p>}
    {!loading && !error && !visible.length && <p className="products-empty">{status === "active" ? "Aún no hay productos que coincidan. Añade el primero para empezar." : "No hay productos archivados."}</p>}
    {!loading && !error && visible.length > 0 && <div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><div className="product-card-heading"><div><span className="product-category">{categoryLabels[product.category]}</span><h3>{product.name}</h3>{product.supermarket && <p>{supermarketLabels[product.supermarket]}</p>}</div><div className="card-icon-actions"><button aria-label={`Editar ${product.name}`} className="product-icon-button" onClick={() => setEditing(product)} type="button"><Pencil size={16} /></button><button aria-expanded={actionsFor === product.id} aria-label={`Más acciones de ${product.name}`} className="product-icon-button" onClick={() => setActionsFor((current) => current === product.id ? null : product.id)} type="button"><MoreHorizontal size={17} /></button>{actionsFor === product.id && <div className="card-menu"><button onClick={() => { setActionsFor(null); void changeStatus(product); }} type="button">{product.status === "active" ? "Archivar" : "Restaurar"}</button>{product.status === "active" && <><button onClick={() => { setActionsFor(null); void inspectRemoval(product); }} type="button">Retirar de recetas</button><button onClick={() => { setActionsFor(null); onSearchMeals(product); }} type="button">Buscar comidas con este producto</button></>}</div>}</div></div><p className="product-presentation"><strong>{presentationSummary(product.presentation)}</strong></p><dl className="product-macros"><div><dt>Kcal</dt><dd>{product.kilocaloriesPer100g}</dd></div><div><dt>Prot.</dt><dd>{product.proteinGramsPer100g} g</dd></div><div><dt>Carbs.</dt><dd>{product.carbohydrateGramsPer100g} g</dd></div><div><dt>Grasas</dt><dd>{product.fatGramsPer100g} g</dd></div></dl></article>)}</div>}
    {removal && <div className="workspace-modal"><section className="product-removal-dialog"><div className="product-form-heading"><div><p className="section-kicker">RETIRAR PRODUCTO</p><h2>{removal.product.name}</h2></div><button aria-label="Cerrar confirmación" className="product-icon-button" onClick={() => setRemoval(null)} type="button"><X size={18} /></button></div><p>Se retirará de estas recetas base. Las comidas ya planificadas no cambian.</p><ul>{removal.meals.map((meal) => <li key={meal.id}>{meal.name}</li>)}</ul><div className="product-form-actions"><button className="secondary-button" onClick={() => setRemoval(null)} type="button">Cancelar</button><button className="primary-button" onClick={() => void removeFromMeals()} type="button">Confirmar retirada</button></div></section></div>}
  </section>;
}
