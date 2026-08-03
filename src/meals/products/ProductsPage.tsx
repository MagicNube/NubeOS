import { Archive, ChevronDown, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  productApi,
  productCategories,
  type Product,
  type ProductCategory,
  type ProductInput,
  type ProductStatus,
  type PurchasePresentation,
} from "./api";
import "./products.css";

type PresentationKind = PurchasePresentation["kind"] | "none";

type ProductFormValues = {
  name: string;
  category: ProductCategory;
  proteinGramsPer100g: string;
  carbohydrateGramsPer100g: string;
  fatGramsPer100g: string;
  kilocaloriesPer100g: string;
  store: string;
  brand: string;
  presentationKind: PresentationKind;
  packageLabel: string;
  packageTotalGrams: string;
  packagePriceCents: string;
  packageUnits: string;
  bulkWeightPriceCents: string;
  bulkUnitGrams: string;
  bulkUnitPriceCents: string;
};

const categoryLabels: Record<ProductCategory, string> = {
  vegetable: "Verdura",
  fruit: "Fruta",
  yogurt: "Yogur",
  meat: "Carne",
  fish: "Pescado",
  other: "Otro",
};

const initialValues: ProductFormValues = {
  name: "",
  category: "other",
  proteinGramsPer100g: "0",
  carbohydrateGramsPer100g: "0",
  fatGramsPer100g: "0",
  kilocaloriesPer100g: "0",
  store: "",
  brand: "",
  presentationKind: "none",
  packageLabel: "",
  packageTotalGrams: "",
  packagePriceCents: "",
  packageUnits: "",
  bulkWeightPriceCents: "",
  bulkUnitGrams: "",
  bulkUnitPriceCents: "",
};

function optionalNumberToString(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

function valuesFromProduct(product: Product): ProductFormValues {
  const values = {
    ...initialValues,
    name: product.name,
    category: product.category,
    proteinGramsPer100g: String(product.proteinGramsPer100g),
    carbohydrateGramsPer100g: String(product.carbohydrateGramsPer100g),
    fatGramsPer100g: String(product.fatGramsPer100g),
    kilocaloriesPer100g: String(product.kilocaloriesPer100g),
    store: product.store ?? "",
    brand: product.brand ?? "",
  };

  if (!product.presentation) return values;

  switch (product.presentation.kind) {
    case "package":
      return { ...values, presentationKind: "package", packageLabel: product.presentation.label, packageTotalGrams: String(product.presentation.totalGrams), packagePriceCents: optionalNumberToString(product.presentation.priceCents), packageUnits: optionalNumberToString(product.presentation.unitsPerPackage) };
    case "bulkByWeight":
      return { ...values, presentationKind: "bulkByWeight", bulkWeightPriceCents: optionalNumberToString(product.presentation.priceCentsPerKilogram) };
    case "bulkByUnit":
      return { ...values, presentationKind: "bulkByUnit", bulkUnitGrams: optionalNumberToString(product.presentation.gramsPerUnit), bulkUnitPriceCents: optionalNumberToString(product.presentation.priceCentsPerUnit) };
  }
}

function optionalNumber(value: string) {
  return value.trim() === "" ? undefined : Number(value);
}

function presentationFromValues(values: ProductFormValues): PurchasePresentation | undefined {
  switch (values.presentationKind) {
    case "none": return undefined;
    case "package": return { kind: "package", label: values.packageLabel, totalGrams: Number(values.packageTotalGrams), priceCents: optionalNumber(values.packagePriceCents), unitsPerPackage: optionalNumber(values.packageUnits) };
    case "bulkByWeight": return { kind: "bulkByWeight", priceCentsPerKilogram: optionalNumber(values.bulkWeightPriceCents) };
    case "bulkByUnit": return { kind: "bulkByUnit", gramsPerUnit: optionalNumber(values.bulkUnitGrams), priceCentsPerUnit: optionalNumber(values.bulkUnitPriceCents) };
  }
}

function inputFromValues(values: ProductFormValues): ProductInput {
  return {
    name: values.name,
    category: values.category,
    proteinGramsPer100g: Number(values.proteinGramsPer100g),
    carbohydrateGramsPer100g: Number(values.carbohydrateGramsPer100g),
    fatGramsPer100g: Number(values.fatGramsPer100g),
    kilocaloriesPer100g: Number(values.kilocaloriesPer100g),
    store: values.store.trim() || undefined,
    brand: values.brand.trim() || undefined,
    presentation: presentationFromValues(values),
  };
}

function errorMessage(error: unknown) {
  return typeof error === "string" ? error : "No se ha podido guardar el producto.";
}

function presentationSummary(presentation: PurchasePresentation | undefined) {
  if (!presentation) return "Sin presentación de compra";

  switch (presentation.kind) {
    case "package": return `${presentation.label} · ${presentation.totalGrams} g${presentation.unitsPerPackage ? ` · ${presentation.unitsPerPackage} uds` : ""}`;
    case "bulkByWeight": return "A granel por peso";
    case "bulkByUnit": return `A granel por unidad${presentation.gramsPerUnit ? ` · ${presentation.gramsPerUnit} g/ud` : ""}`;
  }
}

function NumberField({ label, value, onChange, required, min = "0", step = "0.01" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; min?: string; step?: string }) {
  return <label className="product-field"><span>{label}</span><input inputMode="decimal" min={min} onChange={(event) => onChange(event.target.value)} required={required} step={step} type="number" value={value} /></label>;
}

function ProductForm({ product, onCancel, onSaved }: { product?: Product; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [values, setValues] = useState<ProductFormValues>(() => (product ? valuesFromProduct(product) : initialValues));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <Key extends keyof ProductFormValues>(key: Key, value: ProductFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const input = inputFromValues(values);
      if (product) await productApi.update(product.id, input);
      else await productApi.create(input);
      await onSaved();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <div className="product-form-heading"><div><p className="section-kicker">{product ? "EDITAR PRODUCTO" : "NUEVO PRODUCTO"}</p><h2>{product ? product.name : "Añade un producto"}</h2></div><button aria-label="Cerrar formulario" className="product-icon-button" onClick={onCancel} type="button"><X size={18} /></button></div>
      <div className="product-form-grid">
        <label className="product-field product-field-wide"><span>Nombre</span><input autoFocus onChange={(event) => update("name", event.target.value)} required value={values.name} /></label>
        <label className="product-field"><span>Categoría</span><select onChange={(event) => update("category", event.target.value as ProductCategory)} value={values.category}>{productCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <label className="product-field"><span>Tienda <small>opcional</small></span><input onChange={(event) => update("store", event.target.value)} value={values.store} /></label>
        <label className="product-field"><span>Marca <small>opcional</small></span><input onChange={(event) => update("brand", event.target.value)} value={values.brand} /></label>
      </div>
      <fieldset className="product-fieldset"><legend>Macros por 100 g</legend><div className="product-form-grid product-macro-grid"><NumberField label="Kcal" required value={values.kilocaloriesPer100g} onChange={(value) => update("kilocaloriesPer100g", value)} /><NumberField label="Proteínas (g)" required value={values.proteinGramsPer100g} onChange={(value) => update("proteinGramsPer100g", value)} /><NumberField label="Carbohidratos (g)" required value={values.carbohydrateGramsPer100g} onChange={(value) => update("carbohydrateGramsPer100g", value)} /><NumberField label="Grasas (g)" required value={values.fatGramsPer100g} onChange={(value) => update("fatGramsPer100g", value)} /></div></fieldset>
      <fieldset className="product-fieldset">
        <legend>Presentación de compra</legend><p className="product-fieldset-description">Define cómo lo compras para preparar la lista semanal más adelante.</p>
        <label className="product-field"><span>Tipo</span><select onChange={(event) => update("presentationKind", event.target.value as PresentationKind)} value={values.presentationKind}><option value="none">Solo por gramos</option><option value="package">Paquete</option><option value="bulkByWeight">A granel por peso</option><option value="bulkByUnit">A granel por unidad</option></select></label>
        {values.presentationKind === "package" && <div className="product-form-grid product-presentation-fields"><label className="product-field product-field-wide"><span>Etiqueta del paquete</span><input onChange={(event) => update("packageLabel", event.target.value)} placeholder="Bolsa de tortillas" required value={values.packageLabel} /></label><NumberField label="Peso total (g)" min="0.01" onChange={(value) => update("packageTotalGrams", value)} required value={values.packageTotalGrams} /><NumberField label="Unidades por paquete" min="1" onChange={(value) => update("packageUnits", value)} step="1" value={values.packageUnits} /><NumberField label="Precio (céntimos)" onChange={(value) => update("packagePriceCents", value)} step="1" value={values.packagePriceCents} /></div>}
        {values.presentationKind === "bulkByWeight" && <div className="product-presentation-fields"><NumberField label="Precio por kg (céntimos)" onChange={(value) => update("bulkWeightPriceCents", value)} step="1" value={values.bulkWeightPriceCents} /></div>}
        {values.presentationKind === "bulkByUnit" && <div className="product-form-grid product-presentation-fields"><NumberField label="Gramos aproximados por unidad" min="0.01" onChange={(value) => update("bulkUnitGrams", value)} value={values.bulkUnitGrams} /><NumberField label="Precio por unidad (céntimos)" onChange={(value) => update("bulkUnitPriceCents", value)} step="1" value={values.bulkUnitPriceCents} /></div>}
      </fieldset>
      {error && <p className="product-form-error" role="alert">{error}</p>}
      <div className="product-form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}</button></div>
    </form>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<ProductStatus>("active");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);
    try { setProducts(await productApi.list(status)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadProducts(); }, [status]);
  const visibleProducts = useMemo(() => products.filter((product) => category === "all" || product.category === category), [category, products]);

  async function changeStatus(product: Product) {
    try {
      if (product.status === "active") await productApi.archive(product.id);
      else await productApi.restore(product.id);
      await loadProducts();
    } catch (reason) { setError(errorMessage(reason)); }
  }

  async function savedProduct() {
    await loadProducts();
    setEditingProduct(undefined);
  }

  return (
    <section className="products-page">
      <div className="products-toolbar"><div className="products-status-tabs" aria-label="Estado de productos"><button className={status === "active" ? "product-tab active" : "product-tab"} onClick={() => setStatus("active")} type="button">Catálogo</button><button className={status === "archived" ? "product-tab active" : "product-tab"} onClick={() => setStatus("archived")} type="button">Archivados</button></div><button className="primary-button" onClick={() => setEditingProduct(null)} type="button"><Plus size={16} /> Añadir producto</button></div>
      {editingProduct !== undefined && <ProductForm product={editingProduct ?? undefined} onCancel={() => setEditingProduct(undefined)} onSaved={savedProduct} />}
      <div className="products-catalog-heading"><div><p className="section-kicker">{status === "active" ? "CATÁLOGO" : "PRODUCTOS ARCHIVADOS"}</p><h2>{status === "active" ? "Tus productos" : "Historial de productos"}</h2></div><div className="product-filter"><span>Categoría</span><ChevronDown aria-hidden="true" size={15} /><select aria-label="Filtrar por categoría" onChange={(event) => setCategory(event.target.value as ProductCategory | "all")} value={category}><option value="all">Todas</option>{productCategories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></div></div>
      {error && <p className="products-error" role="alert">{error}</p>}
      {isLoading && <p className="products-empty">Cargando productos…</p>}
      {!isLoading && !error && visibleProducts.length === 0 && <p className="products-empty">{status === "active" ? "Aún no tienes productos. Añade el primero para empezar tu catálogo." : "No hay productos archivados."}</p>}
      {!isLoading && !error && visibleProducts.length > 0 && <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><div className="product-card-heading"><div><span className="product-category">{categoryLabels[product.category]}</span><h3>{product.name}</h3>{(product.store || product.brand) && <p>{[product.store, product.brand].filter(Boolean).join(" · ")}</p>}</div><button aria-label={`Editar ${product.name}`} className="product-icon-button" onClick={() => setEditingProduct(product)} type="button"><Pencil size={16} /></button></div><p className="product-presentation"><strong>{presentationSummary(product.presentation)}</strong></p><dl className="product-macros"><div><dt>Kcal</dt><dd>{product.kilocaloriesPer100g}</dd></div><div><dt>Prot.</dt><dd>{product.proteinGramsPer100g} g</dd></div><div><dt>Carbs.</dt><dd>{product.carbohydrateGramsPer100g} g</dd></div><div><dt>Grasas</dt><dd>{product.fatGramsPer100g} g</dd></div></dl><button className="product-status-action" onClick={() => void changeStatus(product)} type="button">{product.status === "active" ? <><Archive size={14} /> Archivar</> : <><RotateCcw size={14} /> Restaurar</>}</button></article>)}</div>}
    </section>
  );
}
