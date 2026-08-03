//! Comandos Tauri y contratos serializables del catálogo de productos.

use std::{fmt, path::Path, sync::Mutex};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use super::{
    product::{
        DomainError, Grams, NutrientsPer100Grams, Product, ProductCategory, ProductId,
        ProductStatus, PurchasePresentation, PurchasePresentationKind,
    },
    repository::{apply_migrations, ProductRepository, ProductRepositoryError},
};

pub struct ProductDatabase {
    connection: Mutex<Connection>,
}

impl ProductDatabase {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, ProductDatabaseError> {
        let mut connection = Connection::open(path).map_err(ProductDatabaseError::Open)?;
        apply_migrations(&mut connection).map_err(ProductDatabaseError::Migrations)?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }
}

#[derive(Debug)]
pub enum ProductDatabaseError {
    Open(rusqlite::Error),
    Migrations(rusqlite_migration::Error),
}

impl fmt::Display for ProductDatabaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Open(error) => write!(formatter, "No se pudo abrir la base de datos: {error}"),
            Self::Migrations(error) => {
                write!(formatter, "No se pudo actualizar la base de datos: {error}")
            }
        }
    }
}

impl std::error::Error for ProductDatabaseError {}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductInput {
    pub name: String,
    pub category: ProductCategoryDto,
    pub protein_grams_per_100g: f64,
    pub carbohydrate_grams_per_100g: f64,
    pub fat_grams_per_100g: f64,
    pub kilocalories_per_100g: f64,
    pub store: Option<String>,
    pub brand: Option<String>,
    pub presentation: Option<PurchasePresentationDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductDto {
    pub id: String,
    pub name: String,
    pub category: ProductCategoryDto,
    pub protein_grams_per_100g: f64,
    pub carbohydrate_grams_per_100g: f64,
    pub fat_grams_per_100g: f64,
    pub kilocalories_per_100g: f64,
    pub store: Option<String>,
    pub brand: Option<String>,
    pub status: ProductStatusDto,
    pub presentation: Option<PurchasePresentationDto>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProductCategoryDto {
    Vegetable,
    Fruit,
    Yogurt,
    Meat,
    Fish,
    Other,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProductStatusDto {
    Active,
    Archived,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum PurchasePresentationDto {
    Package {
        label: String,
        total_grams: f64,
        price_cents: Option<u64>,
        units_per_package: Option<u32>,
    },
    BulkByWeight {
        price_cents_per_kilogram: Option<u64>,
    },
    BulkByUnit {
        grams_per_unit: Option<f64>,
        price_cents_per_unit: Option<u64>,
    },
}

#[tauri::command]
pub fn list_products(
    state: State<'_, ProductDatabase>,
    status: Option<ProductStatusDto>,
) -> Result<Vec<ProductDto>, String> {
    with_connection(&state, |connection| {
        list_products_for_connection(connection, status)
    })
    .map_err(command_error_message)
}

#[tauri::command]
pub fn create_product(
    state: State<'_, ProductDatabase>,
    input: ProductInput,
) -> Result<ProductDto, String> {
    with_connection(&state, |connection| {
        create_product_for_connection(connection, input)
    })
    .map_err(command_error_message)
}

#[tauri::command]
pub fn update_product(
    state: State<'_, ProductDatabase>,
    id: String,
    input: ProductInput,
) -> Result<ProductDto, String> {
    with_connection(&state, |connection| {
        update_product_for_connection(connection, id, input)
    })
    .map_err(command_error_message)
}

#[tauri::command]
pub fn archive_product(state: State<'_, ProductDatabase>, id: String) -> Result<(), String> {
    with_connection(&state, |connection| {
        archive_product_for_connection(connection, id)
    })
    .map_err(command_error_message)
}

#[tauri::command]
pub fn restore_product(state: State<'_, ProductDatabase>, id: String) -> Result<(), String> {
    with_connection(&state, |connection| {
        restore_product_for_connection(connection, id)
    })
    .map_err(command_error_message)
}

fn list_products_for_connection(
    connection: &mut Connection,
    status: Option<ProductStatusDto>,
) -> Result<Vec<ProductDto>, ProductCommandError> {
    ProductRepository::new(connection)
        .list(status.map(status_from_dto))
        .map(|products| products.iter().map(ProductDto::from).collect())
        .map_err(ProductCommandError::Repository)
}

fn create_product_for_connection(
    connection: &mut Connection,
    input: ProductInput,
) -> Result<ProductDto, ProductCommandError> {
    let product = product_from_input(ProductId::new(Uuid::new_v4().to_string())?, input)?;
    let response = ProductDto::from(&product);
    ProductRepository::new(connection)
        .create(&product)
        .map_err(ProductCommandError::Repository)?;
    Ok(response)
}

fn update_product_for_connection(
    connection: &mut Connection,
    id: String,
    input: ProductInput,
) -> Result<ProductDto, ProductCommandError> {
    let product = product_from_input(ProductId::new(id)?, input)?;
    let id = product.id().clone();
    let mut repository = ProductRepository::new(connection);
    repository
        .update(&product)
        .map_err(ProductCommandError::Repository)?;
    let updated = repository
        .find_by_id(&id)
        .map_err(ProductCommandError::Repository)?
        .ok_or_else(|| {
            ProductCommandError::Repository(ProductRepositoryError::ProductNotFound(
                id.as_str().to_owned(),
            ))
        })?;
    Ok(ProductDto::from(&updated))
}

fn archive_product_for_connection(
    connection: &mut Connection,
    id: String,
) -> Result<(), ProductCommandError> {
    ProductRepository::new(connection)
        .archive(&ProductId::new(id)?)
        .map_err(ProductCommandError::Repository)
}

fn restore_product_for_connection(
    connection: &mut Connection,
    id: String,
) -> Result<(), ProductCommandError> {
    ProductRepository::new(connection)
        .restore(&ProductId::new(id)?)
        .map_err(ProductCommandError::Repository)
}

fn with_connection<T>(
    database: &ProductDatabase,
    operation: impl FnOnce(&mut Connection) -> Result<T, ProductCommandError>,
) -> Result<T, ProductCommandError> {
    let mut connection = database
        .connection
        .lock()
        .map_err(|_| ProductCommandError::DatabaseUnavailable)?;
    operation(&mut connection)
}

fn product_from_input(id: ProductId, input: ProductInput) -> Result<Product, ProductCommandError> {
    let nutrients = NutrientsPer100Grams::new(
        input.protein_grams_per_100g,
        input.carbohydrate_grams_per_100g,
        input.fat_grams_per_100g,
        input.kilocalories_per_100g,
    )?;
    let presentation = input.presentation.map(presentation_from_dto).transpose()?;

    Product::new(
        id,
        input.name,
        category_from_dto(input.category),
        nutrients,
        input.store,
        input.brand,
        presentation,
    )
    .map_err(Into::into)
}

fn presentation_from_dto(
    presentation: PurchasePresentationDto,
) -> Result<PurchasePresentation, ProductCommandError> {
    match presentation {
        PurchasePresentationDto::Package {
            label,
            total_grams,
            price_cents,
            units_per_package,
        } => Ok(PurchasePresentation::package(
            label,
            Grams::new(total_grams)?,
            price_cents,
            units_per_package,
        )?),
        PurchasePresentationDto::BulkByWeight {
            price_cents_per_kilogram,
        } => Ok(PurchasePresentation::bulk_by_weight(
            price_cents_per_kilogram,
        )),
        PurchasePresentationDto::BulkByUnit {
            grams_per_unit,
            price_cents_per_unit,
        } => Ok(PurchasePresentation::bulk_by_unit(
            grams_per_unit.map(Grams::new).transpose()?,
            price_cents_per_unit,
        )),
    }
}

impl From<&Product> for ProductDto {
    fn from(product: &Product) -> Self {
        let nutrients = product.nutrients_per_100_grams();
        Self {
            id: product.id().as_str().to_owned(),
            name: product.name().to_owned(),
            category: category_to_dto(product.category()),
            protein_grams_per_100g: nutrients.protein_grams(),
            carbohydrate_grams_per_100g: nutrients.carbohydrate_grams(),
            fat_grams_per_100g: nutrients.fat_grams(),
            kilocalories_per_100g: nutrients.kilocalories(),
            store: product.store().map(str::to_owned),
            brand: product.brand().map(str::to_owned),
            status: status_to_dto(product.status()),
            presentation: product.presentation().map(presentation_to_dto),
        }
    }
}

fn presentation_to_dto(presentation: &PurchasePresentation) -> PurchasePresentationDto {
    match presentation.kind() {
        PurchasePresentationKind::Package {
            label,
            total_grams,
            price_cents,
            units_per_package,
        } => PurchasePresentationDto::Package {
            label: label.clone(),
            total_grams: total_grams.value(),
            price_cents: *price_cents,
            units_per_package: *units_per_package,
        },
        PurchasePresentationKind::BulkByWeight {
            price_cents_per_kilogram,
        } => PurchasePresentationDto::BulkByWeight {
            price_cents_per_kilogram: *price_cents_per_kilogram,
        },
        PurchasePresentationKind::BulkByUnit {
            grams_per_unit,
            price_cents_per_unit,
        } => PurchasePresentationDto::BulkByUnit {
            grams_per_unit: grams_per_unit.map(Grams::value),
            price_cents_per_unit: *price_cents_per_unit,
        },
    }
}

fn category_from_dto(category: ProductCategoryDto) -> ProductCategory {
    match category {
        ProductCategoryDto::Vegetable => ProductCategory::Vegetable,
        ProductCategoryDto::Fruit => ProductCategory::Fruit,
        ProductCategoryDto::Yogurt => ProductCategory::Yogurt,
        ProductCategoryDto::Meat => ProductCategory::Meat,
        ProductCategoryDto::Fish => ProductCategory::Fish,
        ProductCategoryDto::Other => ProductCategory::Other,
    }
}

fn category_to_dto(category: ProductCategory) -> ProductCategoryDto {
    match category {
        ProductCategory::Vegetable => ProductCategoryDto::Vegetable,
        ProductCategory::Fruit => ProductCategoryDto::Fruit,
        ProductCategory::Yogurt => ProductCategoryDto::Yogurt,
        ProductCategory::Meat => ProductCategoryDto::Meat,
        ProductCategory::Fish => ProductCategoryDto::Fish,
        ProductCategory::Other => ProductCategoryDto::Other,
    }
}

fn status_from_dto(status: ProductStatusDto) -> ProductStatus {
    match status {
        ProductStatusDto::Active => ProductStatus::Active,
        ProductStatusDto::Archived => ProductStatus::Archived,
    }
}

fn status_to_dto(status: ProductStatus) -> ProductStatusDto {
    match status {
        ProductStatus::Active => ProductStatusDto::Active,
        ProductStatus::Archived => ProductStatusDto::Archived,
    }
}

#[derive(Debug)]
enum ProductCommandError {
    Domain(DomainError),
    Repository(ProductRepositoryError),
    DatabaseUnavailable,
}

impl From<DomainError> for ProductCommandError {
    fn from(error: DomainError) -> Self {
        Self::Domain(error)
    }
}

fn command_error_message(error: ProductCommandError) -> String {
    match error {
        ProductCommandError::Domain(error) => error.to_string(),
        ProductCommandError::Repository(ProductRepositoryError::ProductNotFound(id)) => {
            format!("No existe el producto {id}.")
        }
        ProductCommandError::Repository(ProductRepositoryError::InvalidStoredProduct(_)) => {
            "Hay datos de productos guardados que ya no son válidos.".to_owned()
        }
        ProductCommandError::Repository(ProductRepositoryError::Database(_))
        | ProductCommandError::DatabaseUnavailable => {
            "No se ha podido acceder a los datos de productos.".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::repository::apply_migrations;

    fn tortilla_input() -> ProductInput {
        ProductInput {
            name: "Tortillas de trigo".into(),
            category: ProductCategoryDto::Other,
            protein_grams_per_100g: 8.0,
            carbohydrate_grams_per_100g: 50.0,
            fat_grams_per_100g: 7.0,
            kilocalories_per_100g: 300.0,
            store: Some("Mercadona".into()),
            brand: None,
            presentation: Some(PurchasePresentationDto::Package {
                label: "Bolsa de tortillas".into(),
                total_grams: 320.0,
                price_cents: Some(199),
                units_per_package: Some(8),
            }),
        }
    }

    #[test]
    fn product_adapters_create_list_update_archive_and_restore() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();

        let created = create_product_for_connection(&mut connection, tortilla_input()).unwrap();
        assert_eq!(created.status, ProductStatusDto::Active);
        assert!(matches!(
            created.presentation.as_ref(),
            Some(PurchasePresentationDto::Package { .. })
        ));

        let listed =
            list_products_for_connection(&mut connection, Some(ProductStatusDto::Active)).unwrap();
        assert_eq!(listed.len(), 1);

        let mut updated_input = tortilla_input();
        updated_input.name = "Tortillas integrales".into();
        update_product_for_connection(&mut connection, created.id.clone(), updated_input).unwrap();
        archive_product_for_connection(&mut connection, created.id.clone()).unwrap();
        assert!(
            list_products_for_connection(&mut connection, Some(ProductStatusDto::Active),)
                .unwrap()
                .is_empty()
        );

        restore_product_for_connection(&mut connection, created.id).unwrap();
        let restored =
            list_products_for_connection(&mut connection, Some(ProductStatusDto::Active)).unwrap();
        assert_eq!(restored[0].name, "Tortillas integrales");
    }

    #[test]
    fn adapter_returns_a_comprehensible_validation_error() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut input = tortilla_input();
        input.protein_grams_per_100g = -1.0;

        let error = create_product_for_connection(&mut connection, input).unwrap_err();

        assert_eq!(
            command_error_message(error),
            "El valor de proteínas por 100 g no es válido."
        );
    }
}
