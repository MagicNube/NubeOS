import { invoke } from "@tauri-apps/api/core";
import type { Product, ProductStatus } from "./products/api";

export type QuantityUnit = "grams" | "units";
export type MealStatus = "active" | "archived";
export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner" | "extra";

export interface MacroTotals {
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  kilocalories: number;
}

export interface MealIngredientInput {
  productId: string;
  quantity: number;
  unit: QuantityUnit;
}

export interface MealIngredient extends MealIngredientInput {
  productName: string;
}

export interface MealInput {
  name: string;
  ingredients: MealIngredientInput[];
}

export interface Meal {
  id: string;
  name: string;
  status: MealStatus;
  ingredients: MealIngredient[];
  macros: MacroTotals;
}

export interface PlannedInstance {
  id: string;
  weekday: number;
  slot: MealSlot;
  position: number;
  sourceMealId?: string;
  isModified: boolean;
  ingredients: MealIngredient[];
  macros: MacroTotals;
}

export interface DailyMacros {
  weekday: number;
  macros: MacroTotals;
}

export interface WeeklyPlan {
  weekStart: string;
  instances: PlannedInstance[];
  dailyMacros: DailyMacros[];
  weeklyMacros: MacroTotals;
}

export type PurchaseRecommendation =
  | { kind: "grams"; grams: number }
  | { kind: "packages"; packages: number; grams: number }
  | { kind: "units"; units: number; grams: number };

export interface ShoppingEntry {
  product: Product;
  neededGrams: number;
  availableGrams: number;
  purchasedGrams: number;
  pendingGrams: number;
  recommendation?: PurchaseRecommendation;
  estimatedCostCents?: number;
  theoreticalLeftoverGrams?: number;
}

export const mealsApi = {
  listMeals(status: MealStatus) {
    return invoke<Meal[]>("list_meals", { status });
  },
  createMeal(input: MealInput) {
    return invoke<Meal>("create_meal", { input });
  },
  updateMeal(id: string, input: MealInput) {
    return invoke<Meal>("update_meal", { id, input });
  },
  archiveMeal(id: string) {
    return invoke<void>("archive_meal", { id });
  },
  restoreMeal(id: string) {
    return invoke<void>("restore_meal", { id });
  },
  mealsAffectedByProduct(productId: string) {
    return invoke<Meal[]>("meals_affected_by_product", { productId });
  },
  removeProductFromMeals(productId: string) {
    return invoke<void>("remove_product_from_meals", { productId, confirmed: true });
  },
  listWeek(weekStart: string) {
    return invoke<WeeklyPlan>("list_week", { weekStart });
  },
  createPlannedInstance(input: { weekStart: string; weekday: number; slot: MealSlot; mealId: string }) {
    return invoke<PlannedInstance>("create_planned_instance", { input });
  },
  updatePlannedInstance(id: string, ingredients: MealIngredientInput[]) {
    return invoke<void>("update_planned_instance", { id, input: { ingredients } });
  },
  removePlannedInstance(id: string) {
    return invoke<void>("remove_planned_instance", { id });
  },
  reorderPlannedInstance(id: string, position: number) {
    return invoke<void>("reorder_planned_instance", { id, position });
  },
  listShoppingList(weekStart: string) {
    return invoke<ShoppingEntry[]>("list_shopping_list", { weekStart });
  },
  setWeeklyAvailable(weekStart: string, productId: string, quantity: { value: number; unit: QuantityUnit }) {
    return invoke<void>("set_weekly_available", { weekStart, productId, quantity });
  },
  addPartialPurchase(weekStart: string, productId: string, quantity: { value: number; unit: QuantityUnit }) {
    return invoke<void>("add_partial_purchase", { weekStart, productId, quantity });
  },
  completeShoppingEntry(weekStart: string, productId: string) {
    return invoke<void>("complete_shopping_entry", { weekStart, productId });
  },
};
