//! Cálculos puros para las entradas de compra semanales.

use super::product::{Product, PurchasePresentation, PurchasePresentationKind};

#[derive(Debug, Clone, PartialEq)]
pub enum PurchaseRecommendation {
    Grams { grams: f64 },
    Packages { packages: u32, grams: f64 },
    Units { units: u32, grams: f64 },
}

impl PurchaseRecommendation {
    pub fn grams(&self) -> f64 {
        match self {
            Self::Grams { grams } | Self::Packages { grams, .. } | Self::Units { grams, .. } => {
                *grams
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ShoppingCalculation {
    pub pending_grams: f64,
    pub recommendation: Option<PurchaseRecommendation>,
    pub estimated_cost_cents: Option<u64>,
    pub theoretical_leftover_grams: Option<f64>,
}

pub fn calculate(
    product: &Product,
    needed_grams: f64,
    available_grams: f64,
) -> ShoppingCalculation {
    let pending_grams = (needed_grams - available_grams).max(0.0);
    if pending_grams == 0.0 {
        return ShoppingCalculation {
            pending_grams,
            recommendation: Some(zero_recommendation(product)),
            estimated_cost_cents: Some(0),
            theoretical_leftover_grams: Some((available_grams - needed_grams).max(0.0)),
        };
    }

    let Some(presentation) = product.presentation() else {
        return ShoppingCalculation {
            pending_grams,
            recommendation: Some(PurchaseRecommendation::Grams {
                grams: pending_grams,
            }),
            estimated_cost_cents: None,
            theoretical_leftover_grams: None,
        };
    };

    match presentation.kind() {
        PurchasePresentationKind::Package {
            total_grams,
            price_cents,
            ..
        } => {
            let packages = (pending_grams / total_grams.value()).ceil() as u32;
            let grams = f64::from(packages) * total_grams.value();
            ShoppingCalculation {
                pending_grams,
                recommendation: Some(PurchaseRecommendation::Packages { packages, grams }),
                estimated_cost_cents: price_cents
                    .and_then(|price| price.checked_mul(u64::from(packages))),
                theoretical_leftover_grams: Some((available_grams + grams - needed_grams).max(0.0)),
            }
        }
        PurchasePresentationKind::BulkByWeight {
            price_cents_per_kilogram,
        } => ShoppingCalculation {
            pending_grams,
            recommendation: Some(PurchaseRecommendation::Grams {
                grams: pending_grams,
            }),
            estimated_cost_cents: price_cents_per_kilogram
                .and_then(|price| rounded_cents(pending_grams * price as f64 / 1000.0)),
            theoretical_leftover_grams: Some(0.0),
        },
        PurchasePresentationKind::BulkByUnit {
            grams_per_unit: Some(grams_per_unit),
            price_cents_per_unit,
        } => {
            let units = (pending_grams / grams_per_unit.value()).ceil() as u32;
            let grams = f64::from(units) * grams_per_unit.value();
            ShoppingCalculation {
                pending_grams,
                recommendation: Some(PurchaseRecommendation::Units { units, grams }),
                estimated_cost_cents: price_cents_per_unit
                    .and_then(|price| price.checked_mul(u64::from(units))),
                theoretical_leftover_grams: Some((available_grams + grams - needed_grams).max(0.0)),
            }
        }
        PurchasePresentationKind::BulkByUnit {
            grams_per_unit: None,
            ..
        } => ShoppingCalculation {
            pending_grams,
            recommendation: Some(PurchaseRecommendation::Grams {
                grams: pending_grams,
            }),
            estimated_cost_cents: None,
            theoretical_leftover_grams: None,
        },
    }
}

fn rounded_cents(value: f64) -> Option<u64> {
    if !value.is_finite() || value < 0.0 || value > u64::MAX as f64 {
        return None;
    }
    Some(value.round() as u64)
}

fn zero_recommendation(product: &Product) -> PurchaseRecommendation {
    match product.presentation().map(PurchasePresentation::kind) {
        Some(PurchasePresentationKind::Package { .. }) => PurchaseRecommendation::Packages {
            packages: 0,
            grams: 0.0,
        },
        Some(PurchasePresentationKind::BulkByUnit { .. }) => PurchaseRecommendation::Units {
            units: 0,
            grams: 0.0,
        },
        _ => PurchaseRecommendation::Grams { grams: 0.0 },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::product::{
        Grams, NutrientsPer100Grams, ProductCategory, ProductId, PurchasePresentation,
    };

    #[test]
    fn package_rounds_up_and_reports_leftover() {
        let product = Product::new(
            ProductId::new("tortillas").unwrap(),
            "Tortillas",
            ProductCategory::Other,
            NutrientsPer100Grams::new(0.0, 0.0, 0.0, 0.0).unwrap(),
            None,
            Some(
                PurchasePresentation::package(
                    super::super::product::Grams::new(320.0).unwrap(),
                    Some(199),
                    Some(8),
                )
                .unwrap(),
            ),
        )
        .unwrap();
        let calculated = calculate(&product, 400.0, 0.0);
        assert_eq!(
            calculated.recommendation,
            Some(PurchaseRecommendation::Packages {
                packages: 2,
                grams: 640.0
            })
        );
        assert_eq!(calculated.estimated_cost_cents, Some(398));
        assert_eq!(calculated.theoretical_leftover_grams, Some(240.0));
    }

    #[test]
    fn availability_reduces_the_pending_amount() {
        let product = Product::new(
            ProductId::new("patata").unwrap(),
            "Patata",
            ProductCategory::Vegetable,
            NutrientsPer100Grams::new(0.0, 0.0, 0.0, 0.0).unwrap(),
            None,
            Some(PurchasePresentation::bulk_by_weight(Some(200))),
        )
        .unwrap();
        let calculated = calculate(&product, 800.0, 350.0);
        assert_eq!(calculated.pending_grams, 450.0);
        assert_eq!(
            calculated.recommendation,
            Some(PurchaseRecommendation::Grams { grams: 450.0 })
        );
        assert_eq!(calculated.estimated_cost_cents, Some(90));
    }

    #[test]
    fn package_keeps_its_recommendation_unit_when_nothing_is_pending() {
        let product = Product::new(
            ProductId::new("tortillas").unwrap(),
            "Tortillas",
            ProductCategory::Other,
            NutrientsPer100Grams::new(0.0, 0.0, 0.0, 0.0).unwrap(),
            None,
            Some(
                PurchasePresentation::package(Grams::new(320.0).unwrap(), Some(199), Some(8))
                    .unwrap(),
            ),
        )
        .unwrap();
        assert_eq!(
            calculate(&product, 320.0, 320.0).recommendation,
            Some(PurchaseRecommendation::Packages {
                packages: 0,
                grams: 0.0
            })
        );
    }

    #[test]
    fn bulk_cost_rounds_each_entry_to_the_nearest_cent() {
        let product = Product::new(
            ProductId::new("tomate").unwrap(),
            "Tomate",
            ProductCategory::Vegetable,
            NutrientsPer100Grams::new(0.0, 0.0, 0.0, 0.0).unwrap(),
            None,
            Some(PurchasePresentation::bulk_by_weight(Some(335))),
        )
        .unwrap();

        assert_eq!(
            calculate(&product, 100.0, 0.0).estimated_cost_cents,
            Some(34)
        );
    }
}
