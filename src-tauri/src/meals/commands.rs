//! Comandos Tauri y contratos serializables del catálogo de productos.

use std::{fmt, path::Path, sync::Mutex};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use super::{
    product::{
        DomainError, Grams, NutrientsPer100Grams, Product, ProductCategory, ProductId,
        ProductStatus, PurchasePresentation, PurchasePresentationKind, Supermarket,
    },
    repository::{apply_migrations, ProductRepository, ProductRepositoryError},
};

pub struct ProductDatabase {
    pub(crate) connection: Mutex<Connection>,
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
    pub supermarket: Option<SupermarketDto>,
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
    pub supermarket: Option<SupermarketDto>,
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

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SupermarketDto {
    Mercadona,
    Lidl,
    Consum,
    FamilyCash,
    Other,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum PurchasePresentationDto {
    Package {
        total_grams: f64,
        price_eur: Option<String>,
        units_per_package: Option<u32>,
    },
    BulkByWeight {
        price_eur_per_kilogram: Option<String>,
    },
    /// Se devuelve para visualizar datos antiguos, pero no se acepta al guardar.
    BulkByUnit {
        grams_per_unit: Option<f64>,
        price_eur_per_unit: Option<String>,
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
        input.supermarket.map(supermarket_from_dto),
        presentation,
    )
    .map_err(Into::into)
}

fn presentation_from_dto(
    presentation: PurchasePresentationDto,
) -> Result<PurchasePresentation, ProductCommandError> {
    match presentation {
        PurchasePresentationDto::Package {
            total_grams,
            price_eur,
            units_per_package,
        } => Ok(PurchasePresentation::package(
            Grams::new(total_grams)?,
            price_eur.map(|price| euros_to_cents(&price)).transpose()?,
            units_per_package,
        )?),
        PurchasePresentationDto::BulkByWeight {
            price_eur_per_kilogram,
        } => Ok(PurchasePresentation::bulk_by_weight(
            price_eur_per_kilogram
                .map(|price| euros_to_cents(&price))
                .transpose()?,
        )),
        PurchasePresentationDto::BulkByUnit { .. } => {
            Err(DomainError::LegacyPresentationCannotBeSaved.into())
        }
    }
}

/// Convierte una cantidad introducida en euros a céntimos exactos. La frontera
/// acepta coma o punto y rechaza más de dos decimales antes de persistir.
fn euros_to_cents(value: &str) -> Result<u64, ProductCommandError> {
    let normalized = value.trim().replace(',', ".");
    let (euros, decimals) = normalized.split_once('.').unwrap_or((&normalized, ""));
    if normalized.is_empty()
        || normalized.matches('.').count() > 1
        || !euros.chars().all(|character| character.is_ascii_digit())
        || !decimals.chars().all(|character| character.is_ascii_digit())
        || decimals.len() > 2
    {
        return Err(DomainError::InvalidValue {
            field: "precio en euros",
        }
        .into());
    }
    let whole = euros
        .parse::<u64>()
        .map_err(|_| DomainError::InvalidValue {
            field: "precio en euros",
        })?;
    let fraction = match decimals.len() {
        0 => 0,
        1 => decimals.parse::<u64>().unwrap_or(0) * 10,
        2 => decimals.parse::<u64>().unwrap_or(0),
        _ => unreachable!(),
    };
    whole
        .checked_mul(100)
        .and_then(|amount| amount.checked_add(fraction))
        .ok_or_else(|| {
            DomainError::InvalidValue {
                field: "precio en euros",
            }
            .into()
        })
}

fn cents_to_euros(cents: u64) -> String {
    format!("{}.{:02}", cents / 100, cents % 100)
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
            supermarket: product.supermarket().map(supermarket_to_dto),
            status: status_to_dto(product.status()),
            presentation: product.presentation().map(presentation_to_dto),
        }
    }
}

fn presentation_to_dto(presentation: &PurchasePresentation) -> PurchasePresentationDto {
    match presentation.kind() {
        PurchasePresentationKind::Package {
            total_grams,
            price_cents,
            units_per_package,
        } => PurchasePresentationDto::Package {
            total_grams: total_grams.value(),
            price_eur: price_cents.map(cents_to_euros),
            units_per_package: *units_per_package,
        },
        PurchasePresentationKind::BulkByWeight {
            price_cents_per_kilogram,
        } => PurchasePresentationDto::BulkByWeight {
            price_eur_per_kilogram: price_cents_per_kilogram.map(cents_to_euros),
        },
        PurchasePresentationKind::BulkByUnit {
            grams_per_unit,
            price_cents_per_unit,
        } => PurchasePresentationDto::BulkByUnit {
            grams_per_unit: grams_per_unit.map(Grams::value),
            price_eur_per_unit: price_cents_per_unit.map(cents_to_euros),
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
fn supermarket_from_dto(supermarket: SupermarketDto) -> Supermarket {
    match supermarket {
        SupermarketDto::Mercadona => Supermarket::Mercadona,
        SupermarketDto::Lidl => Supermarket::Lidl,
        SupermarketDto::Consum => Supermarket::Consum,
        SupermarketDto::FamilyCash => Supermarket::FamilyCash,
        SupermarketDto::Other => Supermarket::Other,
    }
}
fn supermarket_to_dto(supermarket: Supermarket) -> SupermarketDto {
    match supermarket {
        Supermarket::Mercadona => SupermarketDto::Mercadona,
        Supermarket::Lidl => SupermarketDto::Lidl,
        Supermarket::Consum => SupermarketDto::Consum,
        Supermarket::FamilyCash => SupermarketDto::FamilyCash,
        Supermarket::Other => SupermarketDto::Other,
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
            supermarket: Some(SupermarketDto::Mercadona),
            presentation: Some(PurchasePresentationDto::Package {
                total_grams: 320.0,
                price_eur: Some("1,99".into()),
                units_per_package: Some(8),
            }),
        }
    }

    #[test]
    fn accepts_comma_or_dot_and_keeps_exact_cents() {
        assert_eq!(euros_to_cents("2,99").unwrap(), 299);
        assert_eq!(euros_to_cents("2.50").unwrap(), 250);
        assert!(euros_to_cents("2,999").is_err());
    }

    #[test]
    fn product_adapters_create_list_update_archive_and_restore() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let created = create_product_for_connection(&mut connection, tortilla_input()).unwrap();
        assert_eq!(created.status, ProductStatusDto::Active);
        assert!(
            matches!(created.presentation.as_ref(), Some(PurchasePresentationDto::Package { price_eur: Some(price), .. }) if price == "1.99")
        );
        let listed =
            list_products_for_connection(&mut connection, Some(ProductStatusDto::Active)).unwrap();
        assert_eq!(listed.len(), 1);
        let mut updated_input = tortilla_input();
        updated_input.name = "Tortillas integrales".into();
        update_product_for_connection(&mut connection, created.id.clone(), updated_input).unwrap();
        archive_product_for_connection(&mut connection, created.id.clone()).unwrap();
        assert!(
            list_products_for_connection(&mut connection, Some(ProductStatusDto::Active))
                .unwrap()
                .is_empty()
        );
        restore_product_for_connection(&mut connection, created.id).unwrap();
        assert_eq!(
            list_products_for_connection(&mut connection, Some(ProductStatusDto::Active)).unwrap()
                [0]
            .name,
            "Tortillas integrales"
        );
    }
}
