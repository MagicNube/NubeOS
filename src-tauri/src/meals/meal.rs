//! Reglas de dominio para recetas, ingredientes y sus macros.

use super::planning::MealSlot;
use super::product::{DomainError, IngredientQuantity, Product, ProductId};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MealDomainError {
    EmptyMealId,
    EmptyMealName,
    MealRequiresIngredients,
    ProductNotFound(String),
    InvalidIngredient(DomainError),
    InvalidWeekStart,
    InvalidWeekday,
    InvalidPosition,
}

impl std::fmt::Display for MealDomainError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EmptyMealId => write!(formatter, "El identificador de la comida es obligatorio."),
            Self::EmptyMealName => write!(formatter, "El nombre de la comida es obligatorio."),
            Self::MealRequiresIngredients => {
                write!(formatter, "Una comida debe tener al menos un ingrediente.")
            }
            Self::ProductNotFound(id) => write!(formatter, "No existe el producto {id}."),
            Self::InvalidIngredient(error) => write!(formatter, "Ingrediente no válido: {error}"),
            Self::InvalidWeekStart => write!(
                formatter,
                "La semana debe empezar en lunes y usar formato AAAA-MM-DD."
            ),
            Self::InvalidWeekday => write!(formatter, "El día de la semana no es válido."),
            Self::InvalidPosition => write!(formatter, "La posición no es válida."),
        }
    }
}

impl std::error::Error for MealDomainError {}

impl From<DomainError> for MealDomainError {
    fn from(error: DomainError) -> Self {
        Self::InvalidIngredient(error)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct MealId(String);

impl MealId {
    pub fn new(value: impl Into<String>) -> Result<Self, MealDomainError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(MealDomainError::EmptyMealId);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MealStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct MacroTotals {
    protein_grams: f64,
    carbohydrate_grams: f64,
    fat_grams: f64,
    kilocalories: f64,
}

impl MacroTotals {
    pub fn protein_grams(self) -> f64 {
        self.protein_grams
    }
    pub fn carbohydrate_grams(self) -> f64 {
        self.carbohydrate_grams
    }
    pub fn fat_grams(self) -> f64 {
        self.fat_grams
    }
    pub fn kilocalories(self) -> f64 {
        self.kilocalories
    }

    pub fn add_assign(&mut self, other: Self) {
        self.protein_grams += other.protein_grams;
        self.carbohydrate_grams += other.carbohydrate_grams;
        self.fat_grams += other.fat_grams;
        self.kilocalories += other.kilocalories;
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct MealIngredient {
    product_id: ProductId,
    quantity: IngredientQuantity,
    position: u32,
}

impl MealIngredient {
    pub fn new(product_id: ProductId, quantity: IngredientQuantity, position: u32) -> Self {
        Self {
            product_id,
            quantity,
            position,
        }
    }

    pub fn product_id(&self) -> &ProductId {
        &self.product_id
    }
    pub fn quantity(&self) -> IngredientQuantity {
        self.quantity
    }
    pub fn position(&self) -> u32 {
        self.position
    }

    pub fn macros(&self, product: &Product) -> Result<MacroTotals, MealDomainError> {
        let grams = self.quantity.normalize_to_grams(product)?;
        let nutrients = product.nutrients_per_100_grams();
        let factor = grams.value() / 100.0;
        Ok(MacroTotals {
            protein_grams: nutrients.protein_grams() * factor,
            carbohydrate_grams: nutrients.carbohydrate_grams() * factor,
            fat_grams: nutrients.fat_grams() * factor,
            kilocalories: nutrients.kilocalories() * factor,
        })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Meal {
    id: MealId,
    name: String,
    status: MealStatus,
    revision: u32,
    ingredients: Vec<MealIngredient>,
    recommended_slots: Vec<MealSlot>,
}

impl Meal {
    pub fn new(
        id: MealId,
        name: impl Into<String>,
        ingredients: Vec<MealIngredient>,
        recommended_slots: Vec<MealSlot>,
    ) -> Result<Self, MealDomainError> {
        Self::from_persisted(
            id,
            name,
            MealStatus::Active,
            1,
            ingredients,
            recommended_slots,
        )
    }

    pub fn from_persisted(
        id: MealId,
        name: impl Into<String>,
        status: MealStatus,
        revision: u32,
        mut ingredients: Vec<MealIngredient>,
        mut recommended_slots: Vec<MealSlot>,
    ) -> Result<Self, MealDomainError> {
        let name = name.into();
        if name.trim().is_empty() {
            return Err(MealDomainError::EmptyMealName);
        }
        if ingredients.is_empty() {
            return Err(MealDomainError::MealRequiresIngredients);
        }
        ingredients.sort_by_key(MealIngredient::position);
        recommended_slots.sort_by_key(|slot| slot.as_str());
        recommended_slots.dedup();
        Ok(Self {
            id,
            name,
            status,
            revision,
            ingredients,
            recommended_slots,
        })
    }

    pub fn id(&self) -> &MealId {
        &self.id
    }
    pub fn name(&self) -> &str {
        &self.name
    }
    pub fn status(&self) -> MealStatus {
        self.status
    }
    pub fn revision(&self) -> u32 {
        self.revision
    }
    pub fn ingredients(&self) -> &[MealIngredient] {
        &self.ingredients
    }
    pub fn recommended_slots(&self) -> &[MealSlot] {
        &self.recommended_slots
    }

    pub fn macros(&self, products: &[Product]) -> Result<MacroTotals, MealDomainError> {
        calculate_macros(&self.ingredients, products)
    }
}

pub fn calculate_macros(
    ingredients: &[MealIngredient],
    products: &[Product],
) -> Result<MacroTotals, MealDomainError> {
    let mut totals = MacroTotals::default();
    for ingredient in ingredients {
        let product = products
            .iter()
            .find(|product| product.id() == ingredient.product_id())
            .ok_or_else(|| {
                MealDomainError::ProductNotFound(ingredient.product_id().as_str().to_owned())
            })?;
        totals.add_assign(ingredient.macros(product)?);
    }
    Ok(totals)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::product::{
        Grams, NutrientsPer100Grams, ProductCategory, PurchasePresentation,
    };

    fn chicken() -> Product {
        Product::new(
            ProductId::new("chicken").unwrap(),
            "Pollo",
            ProductCategory::Meat,
            NutrientsPer100Grams::new(20.0, 0.0, 5.0, 130.0).unwrap(),
            None,
            Some(PurchasePresentation::package(Grams::new(150.0).unwrap(), None, Some(1)).unwrap()),
        )
        .unwrap()
    }

    #[test]
    fn a_meal_requires_an_ingredient() {
        let result = Meal::new(MealId::new("meal").unwrap(), "Cena", vec![], vec![]);
        assert_eq!(
            result.unwrap_err(),
            MealDomainError::MealRequiresIngredients
        );
    }

    #[test]
    fn meal_macros_normalize_units_before_summing() {
        let ingredient = MealIngredient::new(
            ProductId::new("chicken").unwrap(),
            IngredientQuantity::units(2.0).unwrap(),
            0,
        );
        let meal = Meal::new(
            MealId::new("meal").unwrap(),
            "Pollo",
            vec![ingredient],
            vec![],
        )
        .unwrap();
        let totals = meal.macros(&[chicken()]).unwrap();

        assert_eq!(totals.protein_grams(), 60.0);
        assert_eq!(totals.fat_grams(), 15.0);
        assert_eq!(totals.kilocalories(), 390.0);
    }
}
