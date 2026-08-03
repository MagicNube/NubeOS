//! Comandos Tauri del flujo de recetas, planificación y compra.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use super::{
    commands::{ProductDatabase, ProductDto},
    meal::{MacroTotals, Meal, MealDomainError, MealId, MealIngredient, MealStatus},
    meal_repository::{MealRepository, MealRepositoryError, PlanningRepository},
    planning::{MealSlot, PlannedInstance, PlannedInstanceId, WeekStart},
    product::{IngredientQuantity, Product, ProductId, ProductStatus, QuantityUnit},
    repository::ProductRepository,
    shopping::{self, PurchaseRecommendation},
};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum QuantityUnitDto {
    Grams,
    Units,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealIngredientInput {
    pub product_id: String,
    pub quantity: f64,
    pub unit: QuantityUnitDto,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MealIngredientDto {
    pub product_id: String,
    pub product_name: String,
    pub quantity: f64,
    pub unit: QuantityUnitDto,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealInput {
    pub name: String,
    pub ingredients: Vec<MealIngredientInput>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MealStatusDto {
    Active,
    Archived,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MacroTotalsDto {
    pub protein_grams: f64,
    pub carbohydrate_grams: f64,
    pub fat_grams: f64,
    pub kilocalories: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MealDto {
    pub id: String,
    pub name: String,
    pub status: MealStatusDto,
    pub ingredients: Vec<MealIngredientDto>,
    pub macros: MacroTotalsDto,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MealSlotDto {
    Breakfast,
    Lunch,
    Snack,
    Dinner,
    Extra,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlannedInstanceInput {
    pub week_start: String,
    pub weekday: u8,
    pub slot: MealSlotDto,
    pub meal_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePlannedInstanceInput {
    pub ingredients: Vec<MealIngredientInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlannedInstanceDto {
    pub id: String,
    pub weekday: u8,
    pub slot: MealSlotDto,
    pub position: u32,
    pub source_meal_id: Option<String>,
    pub is_modified: bool,
    pub ingredients: Vec<MealIngredientDto>,
    pub macros: MacroTotalsDto,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyMacroDto {
    pub weekday: u8,
    pub macros: MacroTotalsDto,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyPlanDto {
    pub week_start: String,
    pub instances: Vec<PlannedInstanceDto>,
    pub daily_macros: Vec<DailyMacroDto>,
    pub weekly_macros: MacroTotalsDto,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageQuantityInput {
    pub value: f64,
    pub unit: QuantityUnitDto,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum PurchaseRecommendationDto {
    Grams { grams: f64 },
    Packages { packages: u32, grams: f64 },
    Units { units: u32, grams: f64 },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShoppingEntryDto {
    pub product: ProductDto,
    pub needed_grams: f64,
    pub available_grams: f64,
    pub purchased_grams: f64,
    pub pending_grams: f64,
    pub recommendation: Option<PurchaseRecommendationDto>,
    pub estimated_cost_cents: Option<f64>,
    pub theoretical_leftover_grams: Option<f64>,
}

#[tauri::command]
pub fn list_meals(
    state: State<'_, ProductDatabase>,
    status: Option<MealStatusDto>,
) -> Result<Vec<MealDto>, String> {
    with_connection(&state, |connection| {
        let meals = MealRepository::new(connection)
            .list(status.map(meal_status_from_dto))
            .map_err(meal_error)?;
        let products = all_products(connection)?;
        meals
            .iter()
            .map(|meal| meal_to_dto(meal, &products))
            .collect()
    })
}

#[tauri::command]
pub fn create_meal(state: State<'_, ProductDatabase>, input: MealInput) -> Result<MealDto, String> {
    with_connection(&state, |connection| {
        let (ingredients, products) = ingredients_from_input(connection, &input.ingredients, &[])?;
        let meal = Meal::new(
            MealId::new(Uuid::new_v4().to_string()).map_err(domain_error)?,
            input.name,
            ingredients,
        )
        .map_err(domain_error)?;
        MealRepository::new(connection)
            .create(&meal)
            .map_err(meal_error)?;
        meal_to_dto(&meal, &products)
    })
}

#[tauri::command]
pub fn update_meal(
    state: State<'_, ProductDatabase>,
    id: String,
    input: MealInput,
) -> Result<MealDto, String> {
    with_connection(&state, |connection| {
        let id = MealId::new(id).map_err(domain_error)?;
        let existing = MealRepository::new(connection)
            .find_by_id(&id)
            .map_err(meal_error)?
            .ok_or_else(|| format!("No existe la comida {}.", id.as_str()))?;
        let (ingredients, products) =
            ingredients_from_input(connection, &input.ingredients, existing.ingredients())?;
        let meal = Meal::new(id, input.name, ingredients).map_err(domain_error)?;
        MealRepository::new(connection)
            .update(&meal)
            .map_err(meal_error)?;
        meal_to_dto(&meal, &products)
    })
}

#[tauri::command]
pub fn archive_meal(state: State<'_, ProductDatabase>, id: String) -> Result<(), String> {
    with_connection(&state, |connection| {
        MealRepository::new(connection)
            .archive(&MealId::new(id).map_err(domain_error)?)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn restore_meal(state: State<'_, ProductDatabase>, id: String) -> Result<(), String> {
    with_connection(&state, |connection| {
        MealRepository::new(connection)
            .restore(&MealId::new(id).map_err(domain_error)?)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn meals_affected_by_product(
    state: State<'_, ProductDatabase>,
    product_id: String,
) -> Result<Vec<MealDto>, String> {
    with_connection(&state, |connection| {
        let product_id = ProductId::new(product_id).map_err(|error| error.to_string())?;
        let meals = MealRepository::new(connection)
            .affected_by_product(&product_id)
            .map_err(meal_error)?;
        let products = all_products(connection)?;
        meals
            .iter()
            .map(|meal| meal_to_dto(meal, &products))
            .collect()
    })
}

#[tauri::command]
pub fn remove_product_from_meals(
    state: State<'_, ProductDatabase>,
    product_id: String,
    confirmed: bool,
) -> Result<(), String> {
    if !confirmed {
        return Err("Confirma la retirada del producto de las recetas afectadas.".to_owned());
    }
    with_connection(&state, |connection| {
        let product_id = ProductId::new(product_id).map_err(|error| error.to_string())?;
        MealRepository::new(connection)
            .remove_product_from_recipes(&product_id)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn list_week(
    state: State<'_, ProductDatabase>,
    week_start: String,
) -> Result<WeeklyPlanDto, String> {
    with_connection(&state, |connection| {
        weekly_plan_to_dto(
            connection,
            WeekStart::new(week_start).map_err(domain_error)?,
        )
    })
}

#[tauri::command]
pub fn create_planned_instance(
    state: State<'_, ProductDatabase>,
    input: CreatePlannedInstanceInput,
) -> Result<PlannedInstanceDto, String> {
    with_connection(&state, |connection| {
        let week_start = WeekStart::new(input.week_start).map_err(domain_error)?;
        let meal_id = MealId::new(input.meal_id).map_err(domain_error)?;
        let meal = MealRepository::new(connection)
            .find_by_id(&meal_id)
            .map_err(meal_error)?
            .ok_or_else(|| format!("No existe la comida {}.", meal_id.as_str()))?;
        if meal.status() == MealStatus::Archived {
            return Err("No se puede planificar una comida archivada.".to_owned());
        }
        let slot = slot_from_dto(input.slot);
        let position = PlanningRepository::new(connection)
            .next_position(&week_start, input.weekday, slot)
            .map_err(meal_error)?;
        let instance = PlannedInstance::new(
            PlannedInstanceId::new(Uuid::new_v4().to_string()).map_err(domain_error)?,
            week_start,
            input.weekday,
            slot,
            position,
            Some(meal_id),
            meal.ingredients().to_vec(),
        )
        .map_err(domain_error)?;
        PlanningRepository::new(connection)
            .create(&instance)
            .map_err(meal_error)?;
        let products = all_products(connection)?;
        instance_to_dto(&instance, &products)
    })
}

#[tauri::command]
pub fn update_planned_instance(
    state: State<'_, ProductDatabase>,
    id: String,
    input: UpdatePlannedInstanceInput,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        let id = PlannedInstanceId::new(id).map_err(domain_error)?;
        let existing = PlanningRepository::new(connection)
            .find_by_id(&id)
            .map_err(meal_error)?
            .ok_or_else(|| format!("No existe la instancia planificada {}.", id.as_str()))?;
        let (ingredients, _) =
            ingredients_from_input(connection, &input.ingredients, existing.ingredients())?;
        PlanningRepository::new(connection)
            .update_ingredients(&id, &ingredients)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn remove_planned_instance(
    state: State<'_, ProductDatabase>,
    id: String,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        PlanningRepository::new(connection)
            .remove(&PlannedInstanceId::new(id).map_err(domain_error)?)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn reorder_planned_instance(
    state: State<'_, ProductDatabase>,
    id: String,
    position: u32,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        PlanningRepository::new(connection)
            .reorder(&PlannedInstanceId::new(id).map_err(domain_error)?, position)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn list_shopping_list(
    state: State<'_, ProductDatabase>,
    week_start: String,
) -> Result<Vec<ShoppingEntryDto>, String> {
    with_connection(&state, |connection| {
        shopping_entries(
            connection,
            WeekStart::new(week_start).map_err(domain_error)?,
        )
    })
}

#[tauri::command]
pub fn set_weekly_available(
    state: State<'_, ProductDatabase>,
    week_start: String,
    product_id: String,
    quantity: CoverageQuantityInput,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        let week_start = WeekStart::new(week_start).map_err(domain_error)?;
        let product = product_by_id(connection, &product_id)?;
        let grams = coverage_grams(&product, quantity, true)?;
        PlanningRepository::new(connection)
            .set_available(&week_start, product.id(), grams)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn add_partial_purchase(
    state: State<'_, ProductDatabase>,
    week_start: String,
    product_id: String,
    quantity: CoverageQuantityInput,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        let week_start = WeekStart::new(week_start).map_err(domain_error)?;
        let product = product_by_id(connection, &product_id)?;
        let grams = coverage_grams(&product, quantity, false)?;
        PlanningRepository::new(connection)
            .add_purchase(&week_start, product.id(), grams)
            .map_err(meal_error)
    })
}

#[tauri::command]
pub fn complete_shopping_entry(
    state: State<'_, ProductDatabase>,
    week_start: String,
    product_id: String,
) -> Result<(), String> {
    with_connection(&state, |connection| {
        let week_start = WeekStart::new(week_start).map_err(domain_error)?;
        let product = product_by_id(connection, &product_id)?;
        let needed = needed_grams_for_week(connection, &week_start, product.id())?;
        let (available, purchased) = PlanningRepository::new(connection)
            .coverage(&week_start, product.id())
            .map_err(meal_error)?;
        let calculation = shopping::calculate(&product, needed, available, purchased);
        if let Some(grams) = shopping::complete_purchase_grams(&calculation) {
            if grams.value() > 0.0 {
                PlanningRepository::new(connection)
                    .add_purchase(&week_start, product.id(), grams.value())
                    .map_err(meal_error)?;
            }
        }
        Ok(())
    })
}

fn with_connection<T>(
    state: &ProductDatabase,
    operation: impl FnOnce(&mut rusqlite::Connection) -> Result<T, String>,
) -> Result<T, String> {
    let mut connection = state
        .connection
        .lock()
        .map_err(|_| "No se ha podido acceder a los datos de comidas.".to_owned())?;
    operation(&mut connection)
}

fn ingredients_from_input(
    connection: &mut rusqlite::Connection,
    inputs: &[MealIngredientInput],
    existing_ingredients: &[MealIngredient],
) -> Result<(Vec<MealIngredient>, Vec<Product>), String> {
    if inputs.is_empty() {
        return Err(MealDomainError::MealRequiresIngredients.to_string());
    }
    let mut ingredients = Vec::with_capacity(inputs.len());
    let mut products = Vec::with_capacity(inputs.len());
    for (position, input) in inputs.iter().enumerate() {
        let product = product_by_id(connection, &input.product_id)?;
        let was_already_used = existing_ingredients
            .iter()
            .any(|ingredient| ingredient.product_id() == product.id());
        if product.status() == ProductStatus::Archived && !was_already_used {
            return Err("No se puede añadir un producto archivado.".to_owned());
        }
        let quantity = quantity_from_input(input.quantity, input.unit, &product)?;
        ingredients.push(MealIngredient::new(
            product.id().clone(),
            quantity,
            position as u32,
        ));
        products.push(product);
    }
    Ok((ingredients, products))
}

fn quantity_from_input(
    value: f64,
    unit: QuantityUnitDto,
    product: &Product,
) -> Result<IngredientQuantity, String> {
    let quantity = match unit {
        QuantityUnitDto::Grams => IngredientQuantity::grams(value),
        QuantityUnitDto::Units => IngredientQuantity::units(value),
    }
    .map_err(|error| error.to_string())?;
    quantity
        .normalize_to_grams(product)
        .map_err(|error| error.to_string())?;
    Ok(quantity)
}

fn coverage_grams(
    product: &Product,
    input: CoverageQuantityInput,
    allow_zero: bool,
) -> Result<f64, String> {
    if !input.value.is_finite() || input.value < 0.0 || (!allow_zero && input.value == 0.0) {
        return Err("La cantidad de cobertura no es válida.".to_owned());
    }
    if input.value == 0.0 {
        return Ok(0.0);
    }
    quantity_from_input(input.value, input.unit, product).and_then(|quantity| {
        quantity
            .normalize_to_grams(product)
            .map(|grams| grams.value())
            .map_err(|error| error.to_string())
    })
}

fn product_by_id(connection: &mut rusqlite::Connection, id: &str) -> Result<Product, String> {
    let id = ProductId::new(id.to_owned()).map_err(|error| error.to_string())?;
    ProductRepository::new(connection)
        .find_by_id(&id)
        .map_err(product_error)?
        .ok_or_else(|| format!("No existe el producto {}.", id.as_str()))
}

fn all_products(connection: &mut rusqlite::Connection) -> Result<Vec<Product>, String> {
    ProductRepository::new(connection)
        .list(None)
        .map_err(product_error)
}

fn meal_to_dto(meal: &Meal, products: &[Product]) -> Result<MealDto, String> {
    Ok(MealDto {
        id: meal.id().as_str().to_owned(),
        name: meal.name().to_owned(),
        status: meal_status_to_dto(meal.status()),
        ingredients: ingredients_to_dto(meal.ingredients(), products)?,
        macros: macros_to_dto(meal.macros(products).map_err(domain_error)?),
    })
}

fn instance_to_dto(
    instance: &PlannedInstance,
    products: &[Product],
) -> Result<PlannedInstanceDto, String> {
    Ok(PlannedInstanceDto {
        id: instance.id().as_str().to_owned(),
        weekday: instance.weekday(),
        slot: slot_to_dto(instance.slot()),
        position: instance.position(),
        source_meal_id: instance.source_meal_id().map(|id| id.as_str().to_owned()),
        is_modified: instance.is_modified(),
        ingredients: ingredients_to_dto(instance.ingredients(), products)?,
        macros: macros_to_dto(instance.macros(products).map_err(domain_error)?),
    })
}

fn ingredients_to_dto(
    ingredients: &[MealIngredient],
    products: &[Product],
) -> Result<Vec<MealIngredientDto>, String> {
    ingredients
        .iter()
        .map(|ingredient| {
            let product = products
                .iter()
                .find(|product| product.id() == ingredient.product_id())
                .ok_or_else(|| {
                    format!(
                        "No existe el producto {}.",
                        ingredient.product_id().as_str()
                    )
                })?;
            Ok(MealIngredientDto {
                product_id: product.id().as_str().to_owned(),
                product_name: product.name().to_owned(),
                quantity: ingredient.quantity().value(),
                unit: quantity_unit_to_dto(ingredient.quantity().unit()),
            })
        })
        .collect()
}

fn weekly_plan_to_dto(
    connection: &mut rusqlite::Connection,
    week_start: WeekStart,
) -> Result<WeeklyPlanDto, String> {
    let instances = PlanningRepository::new(connection)
        .list_week(&week_start)
        .map_err(meal_error)?;
    let products = all_products(connection)?;
    let mut daily = [MacroTotals::default(); 7];
    let mut weekly = MacroTotals::default();
    for instance in &instances {
        let macros = instance.macros(&products).map_err(domain_error)?;
        daily[instance.weekday() as usize].add_assign(macros);
        weekly.add_assign(macros);
    }
    Ok(WeeklyPlanDto {
        week_start: week_start.as_str().to_owned(),
        instances: instances
            .iter()
            .map(|instance| instance_to_dto(instance, &products))
            .collect::<Result<_, _>>()?,
        daily_macros: daily
            .into_iter()
            .enumerate()
            .map(|(weekday, macros)| DailyMacroDto {
                weekday: weekday as u8,
                macros: macros_to_dto(macros),
            })
            .collect(),
        weekly_macros: macros_to_dto(weekly),
    })
}

fn needed_grams_for_week(
    connection: &mut rusqlite::Connection,
    week_start: &WeekStart,
    product_id: &ProductId,
) -> Result<f64, String> {
    let instances = PlanningRepository::new(connection)
        .list_week(week_start)
        .map_err(meal_error)?;
    let products = all_products(connection)?;
    let product = products
        .iter()
        .find(|product| product.id() == product_id)
        .ok_or_else(|| format!("No existe el producto {}.", product_id.as_str()))?;
    instances
        .iter()
        .flat_map(|instance| instance.ingredients())
        .filter(|ingredient| ingredient.product_id() == product_id)
        .try_fold(0.0, |total, ingredient| {
            ingredient
                .quantity()
                .normalize_to_grams(product)
                .map(|grams| total + grams.value())
                .map_err(|error| error.to_string())
        })
}

fn shopping_entries(
    connection: &mut rusqlite::Connection,
    week_start: WeekStart,
) -> Result<Vec<ShoppingEntryDto>, String> {
    let instances = PlanningRepository::new(connection)
        .list_week(&week_start)
        .map_err(meal_error)?;
    let products = all_products(connection)?;
    let mut needs = BTreeMap::<String, f64>::new();
    for instance in &instances {
        for ingredient in instance.ingredients() {
            let product = products
                .iter()
                .find(|product| product.id() == ingredient.product_id())
                .ok_or_else(|| {
                    format!(
                        "No existe el producto {}.",
                        ingredient.product_id().as_str()
                    )
                })?;
            let grams = ingredient
                .quantity()
                .normalize_to_grams(product)
                .map_err(|error| error.to_string())?;
            *needs.entry(product.id().as_str().to_owned()).or_default() += grams.value();
        }
    }
    needs
        .into_iter()
        .map(|(id, needed_grams)| {
            let product = products
                .iter()
                .find(|product| product.id().as_str() == id)
                .ok_or_else(|| format!("No existe el producto {id}."))?;
            let (available_grams, purchased_grams) = PlanningRepository::new(connection)
                .coverage(&week_start, product.id())
                .map_err(meal_error)?;
            let calculation =
                shopping::calculate(product, needed_grams, available_grams, purchased_grams);
            Ok(ShoppingEntryDto {
                product: ProductDto::from(product),
                needed_grams,
                available_grams,
                purchased_grams,
                pending_grams: calculation.pending_grams,
                recommendation: calculation.recommendation.map(recommendation_to_dto),
                estimated_cost_cents: calculation.estimated_cost_cents,
                theoretical_leftover_grams: calculation.theoretical_leftover_grams,
            })
        })
        .collect()
}

fn macros_to_dto(macros: MacroTotals) -> MacroTotalsDto {
    MacroTotalsDto {
        protein_grams: macros.protein_grams(),
        carbohydrate_grams: macros.carbohydrate_grams(),
        fat_grams: macros.fat_grams(),
        kilocalories: macros.kilocalories(),
    }
}
fn quantity_unit_to_dto(unit: QuantityUnit) -> QuantityUnitDto {
    match unit {
        QuantityUnit::Grams => QuantityUnitDto::Grams,
        QuantityUnit::Units => QuantityUnitDto::Units,
    }
}
fn meal_status_from_dto(status: MealStatusDto) -> MealStatus {
    match status {
        MealStatusDto::Active => MealStatus::Active,
        MealStatusDto::Archived => MealStatus::Archived,
    }
}
fn meal_status_to_dto(status: MealStatus) -> MealStatusDto {
    match status {
        MealStatus::Active => MealStatusDto::Active,
        MealStatus::Archived => MealStatusDto::Archived,
    }
}
fn slot_from_dto(slot: MealSlotDto) -> MealSlot {
    match slot {
        MealSlotDto::Breakfast => MealSlot::Breakfast,
        MealSlotDto::Lunch => MealSlot::Lunch,
        MealSlotDto::Snack => MealSlot::Snack,
        MealSlotDto::Dinner => MealSlot::Dinner,
        MealSlotDto::Extra => MealSlot::Extra,
    }
}
fn slot_to_dto(slot: MealSlot) -> MealSlotDto {
    match slot {
        MealSlot::Breakfast => MealSlotDto::Breakfast,
        MealSlot::Lunch => MealSlotDto::Lunch,
        MealSlot::Snack => MealSlotDto::Snack,
        MealSlot::Dinner => MealSlotDto::Dinner,
        MealSlot::Extra => MealSlotDto::Extra,
    }
}
fn recommendation_to_dto(recommendation: PurchaseRecommendation) -> PurchaseRecommendationDto {
    match recommendation {
        PurchaseRecommendation::Grams { grams } => PurchaseRecommendationDto::Grams { grams },
        PurchaseRecommendation::Packages { packages, grams } => {
            PurchaseRecommendationDto::Packages { packages, grams }
        }
        PurchaseRecommendation::Units { units, grams } => {
            PurchaseRecommendationDto::Units { units, grams }
        }
    }
}
fn domain_error(error: MealDomainError) -> String {
    error.to_string()
}
fn product_error(_: super::repository::ProductRepositoryError) -> String {
    "No se ha podido acceder a los productos.".to_owned()
}
fn meal_error(error: MealRepositoryError) -> String {
    match error {
        MealRepositoryError::MealNotFound(_)
        | MealRepositoryError::InstanceNotFound(_)
        | MealRepositoryError::MealWouldBeEmpty(_)
        | MealRepositoryError::InvalidStoredData(_) => error.to_string(),
        MealRepositoryError::Database(_) => {
            "No se ha podido acceder a los datos de comidas.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::{
        product::{NutrientsPer100Grams, ProductCategory},
        repository::apply_migrations,
    };

    #[test]
    fn coverage_accepts_zero_only_when_setting_available() {
        let product = Product::new(
            ProductId::new("product").unwrap(),
            "Producto",
            ProductCategory::Other,
            NutrientsPer100Grams::new(0.0, 0.0, 0.0, 0.0).unwrap(),
            None,
            None,
            None,
        )
        .unwrap();
        assert_eq!(
            coverage_grams(
                &product,
                CoverageQuantityInput {
                    value: 0.0,
                    unit: QuantityUnitDto::Grams
                },
                true
            )
            .unwrap(),
            0.0
        );
        assert!(coverage_grams(
            &product,
            CoverageQuantityInput {
                value: 0.0,
                unit: QuantityUnitDto::Grams
            },
            false
        )
        .is_err());
    }

    #[test]
    fn plan_command_copies_the_recipe_ingredients() {
        let mut connection = rusqlite::Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let product = Product::new(
            ProductId::new("product").unwrap(),
            "Producto",
            ProductCategory::Other,
            NutrientsPer100Grams::new(1.0, 1.0, 1.0, 1.0).unwrap(),
            None,
            None,
            None,
        )
        .unwrap();
        ProductRepository::new(&mut connection)
            .create(&product)
            .unwrap();
        let meal = Meal::new(
            MealId::new("meal").unwrap(),
            "Receta",
            vec![MealIngredient::new(
                product.id().clone(),
                IngredientQuantity::grams(100.0).unwrap(),
                0,
            )],
        )
        .unwrap();
        MealRepository::new(&mut connection).create(&meal).unwrap();
        let week = WeekStart::new("2026-08-03").unwrap();
        let instance = PlannedInstance::new(
            PlannedInstanceId::new("instance").unwrap(),
            week.clone(),
            0,
            MealSlot::Breakfast,
            0,
            Some(meal.id().clone()),
            meal.ingredients().to_vec(),
        )
        .unwrap();
        PlanningRepository::new(&mut connection)
            .create(&instance)
            .unwrap();
        let result = weekly_plan_to_dto(&mut connection, week).unwrap();
        assert_eq!(result.instances[0].ingredients[0].quantity, 100.0);
    }
}
