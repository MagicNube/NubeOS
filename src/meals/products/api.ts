import { invoke } from "@tauri-apps/api/core";

export const productCategories = ["vegetable", "fruit", "yogurt", "meat", "fish", "other"] as const;

export type ProductCategory = (typeof productCategories)[number];
export type ProductStatus = "active" | "archived";

export type PurchasePresentation =
  | { kind: "package"; label: string; totalGrams: number; priceCents?: number; unitsPerPackage?: number }
  | { kind: "bulkByWeight"; priceCentsPerKilogram?: number }
  | { kind: "bulkByUnit"; gramsPerUnit?: number; priceCentsPerUnit?: number };

export interface ProductInput {
  name: string;
  category: ProductCategory;
  proteinGramsPer100g: number;
  carbohydrateGramsPer100g: number;
  fatGramsPer100g: number;
  kilocaloriesPer100g: number;
  store?: string;
  brand?: string;
  presentation?: PurchasePresentation;
}

export interface Product extends ProductInput {
  id: string;
  status: ProductStatus;
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
};
