import { invoke } from "@tauri-apps/api/core";

export const productCategories = [
  "vegetable",
  "fruit",
  "yogurt",
  "meat",
  "fish",
  "other",
] as const;
export type ProductCategory = (typeof productCategories)[number];
export type ProductStatus = "active" | "archived";
export type Supermarket =
  | "mercadona"
  | "lidl"
  | "consum"
  | "familyCash"
  | "other";

export const categoryLabels: Record<ProductCategory, string> = {
  vegetable: "Verdura",
  fruit: "Fruta",
  yogurt: "Lácteos",
  meat: "Carne",
  fish: "Pescado",
  other: "Otro",
};

export const supermarketLabels: Record<Supermarket, string> = {
  mercadona: "Mercadona",
  lidl: "Lidl",
  consum: "Consum",
  familyCash: "FamilyCash",
  other: "Otro",
};

export type PurchasePresentation =
  | {
      kind: "package";
      totalGrams: number;
      priceEur?: string;
      unitsPerPackage?: number;
    }
  | { kind: "bulkByWeight"; priceEurPerKilogram?: string }
  | { kind: "bulkByUnit"; gramsPerUnit?: number; priceEurPerUnit?: string };

export interface ProductInput {
  name: string;
  category: ProductCategory;
  proteinGramsPer100g: number;
  carbohydrateGramsPer100g: number;
  fatGramsPer100g: number;
  kilocaloriesPer100g: number;
  supermarket?: Supermarket;
  presentation: Exclude<PurchasePresentation, { kind: "bulkByUnit" }>;
}

export interface Product extends Omit<ProductInput, "presentation"> {
  id: string;
  status: ProductStatus;
  presentation?: PurchasePresentation;
}

export const productApi = {
  list(status: ProductStatus) {
    return invoke<Product[]>("list_products", { status });
  },
  create(input: ProductInput) {
    return invoke<Product>("create_product", { input });
  },
  update(id: string, input: ProductInput) {
    return invoke<Product>("update_product", { id, input });
  },
  archive(id: string) {
    return invoke<void>("archive_product", { id });
  },
  restore(id: string) {
    return invoke<void>("restore_product", { id });
  },
  delete(id: string) {
    return invoke<void>("delete_product", { id });
  },
};
