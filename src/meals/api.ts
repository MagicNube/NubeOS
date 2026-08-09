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
  macros: MacroTotals;
}
export interface MealInput {
  name: string;
  ingredients: MealIngredientInput[];
  recommendedSlots: MealSlot[];
}
export interface Meal {
  id: string;
  name: string;
  status: MealStatus;
  ingredients: MealIngredient[];
  macros: MacroTotals;
  recommendedSlots: MealSlot[];
}
export interface PlannedInstance {
  id: string;
  weekday: number;
  slot: MealSlot;
  position: number;
  sourceMealId?: string;
  isModified: boolean;
  isRecipeUpdated: boolean;
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
  plannedNeededGrams: number;
  manualNeededGrams: number;
  availableGrams: number;
  pendingGrams: number;
  recommendation?: PurchaseRecommendation;
  estimatedCostCents?: number;
  theoreticalLeftoverGrams?: number;
  isChecked: boolean;
  preferredUnit: QuantityUnit;
}
export interface ShoppingList {
  entries: ShoppingEntry[];
  estimatedTotalCents?: number | null;
  pendingEstimatedTotalCents?: number | null;
}

export const mealsApi = {
  listMeals(status: MealStatus, query?: string, productId?: string) {
    return invoke<Meal[]>("list_meals", {
      status,
      query: query || undefined,
      productId,
    });
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
  deleteMeal(id: string) {
    return invoke<void>("delete_meal", { id });
  },
  mealsAffectedByProduct(productId: string) {
    return invoke<Meal[]>("meals_affected_by_product", { productId });
  },
  removeProductFromMeals(productId: string) {
    return invoke<void>("remove_product_from_meals", {
      productId,
      confirmed: true,
    });
  },
  listWeek(weekStart: string) {
    return invoke<WeeklyPlan>("list_week", { weekStart });
  },
  createPlannedInstance(input: {
    weekStart: string;
    weekday: number;
    slot: MealSlot;
    mealId: string;
  }) {
    return invoke<PlannedInstance>("create_planned_instance", { input });
  },
  updatePlannedInstance(id: string, ingredients: MealIngredientInput[]) {
    return invoke<void>("update_planned_instance", {
      id,
      input: { ingredients },
    });
  },
  syncPlannedInstanceFromMeal(id: string) {
    return invoke<void>("sync_planned_instance_from_meal", { id });
  },
  removePlannedInstance(id: string) {
    return invoke<void>("remove_planned_instance", { id });
  },
  movePlannedInstance(
    id: string,
    input: { weekday: number; slot: MealSlot; position: number },
  ) {
    return invoke<void>("move_planned_instance", { id, input });
  },
  listShoppingList(weekStart: string) {
    return invoke<ShoppingList>("list_shopping_list", { weekStart });
  },
  setWeeklyAvailable(
    weekStart: string,
    productId: string,
    value: number,
    unit: QuantityUnit,
  ) {
    return invoke<void>("set_weekly_available", {
      weekStart,
      productId,
      input: { value, unit },
    });
  },
  setProductShoppingUnit(productId: string, unit: QuantityUnit) {
    return invoke<void>("set_product_shopping_unit", { productId, unit });
  },
  setShoppingEntryChecked(
    weekStart: string,
    productId: string,
    isChecked: boolean,
  ) {
    return invoke<void>("set_shopping_entry_checked", {
      weekStart,
      productId,
      input: { isChecked },
    });
  },
  addManualShoppingNeed(
    weekStart: string,
    productId: string,
    value: number,
    unit: QuantityUnit,
  ) {
    return invoke<void>("add_manual_shopping_need", {
      weekStart,
      productId,
      input: { value, unit },
    });
  },
  removeManualShoppingNeed(weekStart: string, productId: string) {
    return invoke<void>("remove_manual_shopping_need", {
      weekStart,
      productId,
    });
  },
};
