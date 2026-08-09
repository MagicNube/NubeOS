//! Tipos de dominio para el catálogo de productos y sus cantidades.
//!
//! Este módulo no conoce Tauri, SQLite ni React. Solo modela reglas que deben
//! seguir siendo válidas con independencia de cómo se guarden o se muestren
//! los datos.

use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DomainError {
    EmptyProductId,
    EmptyProductName,
    InvalidValue { field: &'static str },
    InvalidSupermarket,
    PurchasePresentationRequired,
    UnitsRequireGramsPerUnit,
    LegacyPresentationCannotBeSaved,
}

impl fmt::Display for DomainError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyProductId => write!(formatter, "El identificador del producto es obligatorio."),
            Self::EmptyProductName => write!(formatter, "El nombre del producto es obligatorio."),
            Self::InvalidValue { field } => write!(formatter, "El valor de {field} no es válido."),
            Self::InvalidSupermarket => write!(formatter, "El supermercado seleccionado no es válido."),
            Self::PurchasePresentationRequired => write!(formatter, "Elige una presentación de compra."),
            Self::UnitsRequireGramsPerUnit => write!(formatter, "Este producto no tiene gramos por unidad definidos."),
            Self::LegacyPresentationCannotBeSaved => write!(formatter, "La presentación a granel por unidad es heredada. Elige paquete, bolsa o bandeja, o a granel por peso."),
        }
    }
}

impl std::error::Error for DomainError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProductId(String);

impl ProductId {
    pub fn new(value: impl Into<String>) -> Result<Self, DomainError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(DomainError::EmptyProductId);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Grams(f64);

impl Grams {
    pub fn new(value: f64) -> Result<Self, DomainError> {
        validate_positive(value, "gramos")?;
        Ok(Self(value))
    }

    pub fn value(self) -> f64 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct NutrientsPer100Grams {
    protein_grams: f64,
    carbohydrate_grams: f64,
    fat_grams: f64,
    kilocalories: f64,
}

impl NutrientsPer100Grams {
    pub fn new(
        protein_grams: f64,
        carbohydrate_grams: f64,
        fat_grams: f64,
        kilocalories: f64,
    ) -> Result<Self, DomainError> {
        validate_non_negative(protein_grams, "proteínas por 100 g")?;
        validate_non_negative(carbohydrate_grams, "carbohidratos por 100 g")?;
        validate_non_negative(fat_grams, "grasas por 100 g")?;
        validate_non_negative(kilocalories, "kcal por 100 g")?;
        Ok(Self {
            protein_grams,
            carbohydrate_grams,
            fat_grams,
            kilocalories,
        })
    }

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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProductCategory {
    Vegetable,
    Fruit,
    Yogurt,
    Meat,
    Fish,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProductStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Supermarket {
    Mercadona,
    Lidl,
    Consum,
    FamilyCash,
}

impl Supermarket {
    pub fn from_database(value: &str) -> Option<Self> {
        match value {
            "Mercadona" => Some(Self::Mercadona),
            "Lidl" => Some(Self::Lidl),
            "Consum" => Some(Self::Consum),
            "FamilyCash" => Some(Self::FamilyCash),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mercadona => "Mercadona",
            Self::Lidl => "Lidl",
            Self::Consum => "Consum",
            Self::FamilyCash => "FamilyCash",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct PurchasePresentation {
    kind: PurchasePresentationKind,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum PurchasePresentationKind {
    Package {
        total_grams: Grams,
        price_cents: Option<u64>,
        units_per_package: Option<u32>,
    },
    BulkByWeight {
        price_cents_per_kilogram: Option<u64>,
    },
    /// Se conserva exclusivamente al leer registros creados por versiones anteriores.
    BulkByUnit {
        grams_per_unit: Option<Grams>,
        price_cents_per_unit: Option<u64>,
    },
}

impl PurchasePresentation {
    pub fn package(
        total_grams: Grams,
        price_cents: Option<u64>,
        units_per_package: Option<u32>,
    ) -> Result<Self, DomainError> {
        if units_per_package == Some(0) {
            return Err(DomainError::InvalidValue {
                field: "unidades por paquete",
            });
        }
        Ok(Self {
            kind: PurchasePresentationKind::Package {
                total_grams,
                price_cents,
                units_per_package,
            },
        })
    }

    pub fn bulk_by_weight(price_cents_per_kilogram: Option<u64>) -> Self {
        Self {
            kind: PurchasePresentationKind::BulkByWeight {
                price_cents_per_kilogram,
            },
        }
    }

    pub(crate) fn legacy_bulk_by_unit(
        grams_per_unit: Option<Grams>,
        price_cents_per_unit: Option<u64>,
    ) -> Self {
        Self {
            kind: PurchasePresentationKind::BulkByUnit {
                grams_per_unit,
                price_cents_per_unit,
            },
        }
    }

    pub fn grams_per_unit(&self) -> Option<Grams> {
        match &self.kind {
            PurchasePresentationKind::Package {
                total_grams,
                units_per_package: Some(units),
                ..
            } => Grams::new(total_grams.value() / f64::from(*units)).ok(),
            PurchasePresentationKind::BulkByUnit {
                grams_per_unit: Some(grams_per_unit),
                ..
            } => Some(*grams_per_unit),
            _ => None,
        }
    }

    pub fn is_legacy(&self) -> bool {
        matches!(self.kind, PurchasePresentationKind::BulkByUnit { .. })
    }
    pub(crate) fn kind(&self) -> &PurchasePresentationKind {
        &self.kind
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Product {
    id: ProductId,
    name: String,
    category: ProductCategory,
    nutrients_per_100_grams: NutrientsPer100Grams,
    supermarket: Option<Supermarket>,
    status: ProductStatus,
    presentation: Option<PurchasePresentation>,
}

impl Product {
    pub fn new(
        id: ProductId,
        name: impl Into<String>,
        category: ProductCategory,
        nutrients_per_100_grams: NutrientsPer100Grams,
        supermarket: Option<Supermarket>,
        presentation: Option<PurchasePresentation>,
    ) -> Result<Self, DomainError> {
        let name = name.into();
        if name.trim().is_empty() {
            return Err(DomainError::EmptyProductName);
        }
        Ok(Self {
            id,
            name,
            category,
            nutrients_per_100_grams,
            supermarket,
            status: ProductStatus::Active,
            presentation,
        })
    }

    pub fn grams_per_unit(&self) -> Option<Grams> {
        self.presentation
            .as_ref()
            .and_then(PurchasePresentation::grams_per_unit)
    }
    pub fn id(&self) -> &ProductId {
        &self.id
    }
    pub fn name(&self) -> &str {
        &self.name
    }
    pub fn category(&self) -> ProductCategory {
        self.category
    }
    pub fn nutrients_per_100_grams(&self) -> NutrientsPer100Grams {
        self.nutrients_per_100_grams
    }
    pub fn supermarket(&self) -> Option<Supermarket> {
        self.supermarket
    }
    pub fn status(&self) -> ProductStatus {
        self.status
    }
    pub fn presentation(&self) -> Option<&PurchasePresentation> {
        self.presentation.as_ref()
    }

    pub(crate) fn from_persisted(
        id: ProductId,
        name: String,
        category: ProductCategory,
        nutrients_per_100_grams: NutrientsPer100Grams,
        supermarket: Option<Supermarket>,
        status: ProductStatus,
        presentation: Option<PurchasePresentation>,
    ) -> Result<Self, DomainError> {
        let mut product = Self::new(
            id,
            name,
            category,
            nutrients_per_100_grams,
            supermarket,
            presentation,
        )?;
        product.status = status;
        Ok(product)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuantityUnit {
    Grams,
    Units,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct IngredientQuantity {
    value: f64,
    unit: QuantityUnit,
}

impl IngredientQuantity {
    pub fn grams(value: f64) -> Result<Self, DomainError> {
        Self::new(value, QuantityUnit::Grams)
    }
    pub fn units(value: f64) -> Result<Self, DomainError> {
        Self::new(value, QuantityUnit::Units)
    }
    pub fn value(self) -> f64 {
        self.value
    }
    pub fn unit(self) -> QuantityUnit {
        self.unit
    }
    pub fn normalize_to_grams(self, product: &Product) -> Result<Grams, DomainError> {
        match self.unit {
            QuantityUnit::Grams => Grams::new(self.value),
            QuantityUnit::Units => product
                .grams_per_unit()
                .map(|grams_per_unit| Grams::new(self.value * grams_per_unit.value()))
                .transpose()?
                .ok_or(DomainError::UnitsRequireGramsPerUnit),
        }
    }
    fn new(value: f64, unit: QuantityUnit) -> Result<Self, DomainError> {
        validate_positive(value, "cantidad")?;
        Ok(Self { value, unit })
    }
}

fn validate_positive(value: f64, field: &'static str) -> Result<(), DomainError> {
    if !value.is_finite() || value <= 0.0 {
        return Err(DomainError::InvalidValue { field });
    }
    Ok(())
}

fn validate_non_negative(value: f64, field: &'static str) -> Result<(), DomainError> {
    if !value.is_finite() || value < 0.0 {
        return Err(DomainError::InvalidValue { field });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tortillas() -> Product {
        Product::new(
            ProductId::new("tortillas-mercadona").unwrap(),
            "Tortillas de trigo",
            ProductCategory::Other,
            NutrientsPer100Grams::new(8.0, 50.0, 7.0, 300.0).unwrap(),
            Some(Supermarket::Mercadona),
            Some(
                PurchasePresentation::package(Grams::new(320.0).unwrap(), Some(199), Some(8))
                    .unwrap(),
            ),
        )
        .unwrap()
    }

    #[test]
    fn normalizes_units_when_the_product_has_grams_per_unit() {
        let grams = IngredientQuantity::units(3.0)
            .unwrap()
            .normalize_to_grams(&tortillas())
            .unwrap();
        assert_eq!(grams, Grams::new(120.0).unwrap());
    }

    #[test]
    fn rejects_units_when_the_product_has_no_grams_per_unit() {
        let product = Product::new(
            ProductId::new("patata-granel").unwrap(),
            "Patata a granel",
            ProductCategory::Vegetable,
            NutrientsPer100Grams::new(2.0, 17.0, 0.0, 77.0).unwrap(),
            None,
            Some(PurchasePresentation::bulk_by_weight(Some(200))),
        )
        .unwrap();
        assert_eq!(
            IngredientQuantity::units(1.0)
                .unwrap()
                .normalize_to_grams(&product),
            Err(DomainError::UnitsRequireGramsPerUnit)
        );
    }

    #[test]
    fn maps_unknown_saved_supermarkets_to_any() {
        assert_eq!(Supermarket::from_database("Carrefour"), None);
    }
}
