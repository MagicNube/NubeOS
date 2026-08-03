//! Adaptador SQLite del catálogo de productos.

use std::fmt;

use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};
use rusqlite_migration::{Migrations, M};

use super::product::{
    DomainError, Grams, NutrientsPer100Grams, Product, ProductCategory, ProductId, ProductStatus,
    PurchasePresentation, PurchasePresentationKind,
};

pub fn apply_migrations(connection: &mut Connection) -> rusqlite_migration::Result<()> {
    connection.pragma_update(None, "foreign_keys", "ON")?;
    Migrations::new(vec![M::up(include_str!(
        "../../migrations/0001_create_meals_products.sql"
    ))])
    .to_latest(connection)
}

#[derive(Debug)]
pub enum ProductRepositoryError {
    Database(rusqlite::Error),
    InvalidStoredProduct(DomainError),
    ProductNotFound(String),
}

impl fmt::Display for ProductRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "Error de SQLite: {error}"),
            Self::InvalidStoredProduct(error) => {
                write!(formatter, "Un producto guardado no es válido: {error}")
            }
            Self::ProductNotFound(id) => write!(formatter, "No existe el producto {id}."),
        }
    }
}

impl std::error::Error for ProductRepositoryError {}

impl From<rusqlite::Error> for ProductRepositoryError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

pub struct ProductRepository<'connection> {
    connection: &'connection mut Connection,
}

impl<'connection> ProductRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn create(&mut self, product: &Product) -> Result<(), ProductRepositoryError> {
        let transaction = self.connection.transaction()?;
        insert_product(&transaction, product)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn find_by_id(
        &mut self,
        id: &ProductId,
    ) -> Result<Option<Product>, ProductRepositoryError> {
        let stored = self
            .connection
            .query_row(
                "SELECT id, name, category, protein_grams_per_100g, carbohydrate_grams_per_100g, \
                 fat_grams_per_100g, kilocalories_per_100g, store, brand, status \
                 FROM meals_products WHERE id = ?1",
                [id.as_str()],
                StoredProduct::from_row,
            )
            .optional()?;

        stored.map(|product| self.to_domain(product)).transpose()
    }

    pub fn list(
        &mut self,
        status: Option<ProductStatus>,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let ids = match status {
            Some(status) => self.ids_for_status(status)?,
            None => self.all_ids()?,
        };

        ids.into_iter()
            .map(|id| {
                let id =
                    ProductId::new(id).map_err(ProductRepositoryError::InvalidStoredProduct)?;
                self.find_by_id(&id)?
                    .ok_or_else(|| ProductRepositoryError::ProductNotFound(id.as_str().to_owned()))
            })
            .collect()
    }

    pub fn update(&mut self, product: &Product) -> Result<(), ProductRepositoryError> {
        let transaction = self.connection.transaction()?;
        let changed = transaction.execute(
            "UPDATE meals_products
             SET name = ?2, category = ?3, protein_grams_per_100g = ?4,
                 carbohydrate_grams_per_100g = ?5, fat_grams_per_100g = ?6,
                 kilocalories_per_100g = ?7, store = ?8, brand = ?9
             WHERE id = ?1",
            params![
                product.id().as_str(),
                product.name(),
                category_to_database(product.category()),
                product.nutrients_per_100_grams().protein_grams(),
                product.nutrients_per_100_grams().carbohydrate_grams(),
                product.nutrients_per_100_grams().fat_grams(),
                product.nutrients_per_100_grams().kilocalories(),
                product.store(),
                product.brand(),
            ],
        )?;

        if changed == 0 {
            return Err(ProductRepositoryError::ProductNotFound(
                product.id().as_str().to_owned(),
            ));
        }

        transaction.execute(
            "DELETE FROM meals_product_presentations WHERE product_id = ?1",
            [product.id().as_str()],
        )?;
        insert_presentation(&transaction, product)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn archive(&mut self, id: &ProductId) -> Result<(), ProductRepositoryError> {
        self.change_status(id, ProductStatus::Archived)
    }

    pub fn restore(&mut self, id: &ProductId) -> Result<(), ProductRepositoryError> {
        self.change_status(id, ProductStatus::Active)
    }

    fn ids_for_status(
        &mut self,
        status: ProductStatus,
    ) -> Result<Vec<String>, ProductRepositoryError> {
        let mut statement = self.connection.prepare(
            "SELECT id FROM meals_products WHERE status = ?1 ORDER BY name COLLATE NOCASE",
        )?;
        let ids = statement
            .query_map([status_to_database(status)], |row| row.get(0))?
            .collect::<Result<_, _>>()
            .map_err(ProductRepositoryError::from);
        ids
    }

    fn all_ids(&mut self) -> Result<Vec<String>, ProductRepositoryError> {
        let mut statement = self
            .connection
            .prepare("SELECT id FROM meals_products ORDER BY name COLLATE NOCASE")?;
        let ids = statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<_, _>>()
            .map_err(ProductRepositoryError::from);
        ids
    }

    fn change_status(
        &mut self,
        id: &ProductId,
        status: ProductStatus,
    ) -> Result<(), ProductRepositoryError> {
        let changed = self.connection.execute(
            "UPDATE meals_products SET status = ?2 WHERE id = ?1",
            params![id.as_str(), status_to_database(status)],
        )?;
        if changed == 0 {
            return Err(ProductRepositoryError::ProductNotFound(
                id.as_str().to_owned(),
            ));
        }
        Ok(())
    }

    fn to_domain(&mut self, stored: StoredProduct) -> Result<Product, ProductRepositoryError> {
        let presentation = self.load_presentation(&stored.id)?;
        let id = ProductId::new(stored.id).map_err(ProductRepositoryError::InvalidStoredProduct)?;
        let nutrients = NutrientsPer100Grams::new(
            stored.protein_grams,
            stored.carbohydrate_grams,
            stored.fat_grams,
            stored.kilocalories,
        )
        .map_err(ProductRepositoryError::InvalidStoredProduct)?;

        Product::from_persisted(
            id,
            stored.name,
            category_from_database(&stored.category)?,
            nutrients,
            stored.store,
            stored.brand,
            status_from_database(&stored.status)?,
            presentation,
        )
        .map_err(ProductRepositoryError::InvalidStoredProduct)
    }

    fn load_presentation(
        &mut self,
        product_id: &str,
    ) -> Result<Option<PurchasePresentation>, ProductRepositoryError> {
        let stored = self
            .connection
            .query_row(
                "SELECT kind, label, total_grams, price_cents, units_per_package,
                        price_cents_per_kilogram, grams_per_unit, price_cents_per_unit
                 FROM meals_product_presentations WHERE product_id = ?1",
                [product_id],
                StoredPresentation::from_row,
            )
            .optional()?;

        stored.map(StoredPresentation::to_domain).transpose()
    }
}

fn insert_product(
    transaction: &Transaction<'_>,
    product: &Product,
) -> Result<(), ProductRepositoryError> {
    transaction.execute(
        "INSERT INTO meals_products (
             id, name, category, protein_grams_per_100g, carbohydrate_grams_per_100g,
             fat_grams_per_100g, kilocalories_per_100g, store, brand, status
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            product.id().as_str(),
            product.name(),
            category_to_database(product.category()),
            product.nutrients_per_100_grams().protein_grams(),
            product.nutrients_per_100_grams().carbohydrate_grams(),
            product.nutrients_per_100_grams().fat_grams(),
            product.nutrients_per_100_grams().kilocalories(),
            product.store(),
            product.brand(),
            status_to_database(product.status()),
        ],
    )?;
    insert_presentation(transaction, product)
}

fn insert_presentation(
    transaction: &Transaction<'_>,
    product: &Product,
) -> Result<(), ProductRepositoryError> {
    let Some(presentation) = product.presentation() else {
        return Ok(());
    };

    match presentation.kind() {
        PurchasePresentationKind::Package {
            label,
            total_grams,
            price_cents,
            units_per_package,
        } => transaction.execute(
            "INSERT INTO meals_product_presentations (
                 product_id, kind, label, total_grams, price_cents, units_per_package,
                 price_cents_per_kilogram, grams_per_unit, price_cents_per_unit
             ) VALUES (?1, 'package', ?2, ?3, ?4, ?5, NULL, NULL, NULL)",
            params![
                product.id().as_str(),
                label,
                total_grams.value(),
                price_cents,
                units_per_package,
            ],
        )?,
        PurchasePresentationKind::BulkByWeight {
            price_cents_per_kilogram,
        } => transaction.execute(
            "INSERT INTO meals_product_presentations (
                 product_id, kind, label, total_grams, price_cents, units_per_package,
                 price_cents_per_kilogram, grams_per_unit, price_cents_per_unit
             ) VALUES (?1, 'bulk_by_weight', NULL, NULL, NULL, NULL, ?2, NULL, NULL)",
            params![product.id().as_str(), price_cents_per_kilogram],
        )?,
        PurchasePresentationKind::BulkByUnit {
            grams_per_unit,
            price_cents_per_unit,
        } => transaction.execute(
            "INSERT INTO meals_product_presentations (
                 product_id, kind, label, total_grams, price_cents, units_per_package,
                 price_cents_per_kilogram, grams_per_unit, price_cents_per_unit
             ) VALUES (?1, 'bulk_by_unit', NULL, NULL, NULL, NULL, NULL, ?2, ?3)",
            params![
                product.id().as_str(),
                grams_per_unit.map(Grams::value),
                price_cents_per_unit,
            ],
        )?,
    };

    Ok(())
}

struct StoredProduct {
    id: String,
    name: String,
    category: String,
    protein_grams: f64,
    carbohydrate_grams: f64,
    fat_grams: f64,
    kilocalories: f64,
    store: Option<String>,
    brand: Option<String>,
    status: String,
}

impl StoredProduct {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            protein_grams: row.get(3)?,
            carbohydrate_grams: row.get(4)?,
            fat_grams: row.get(5)?,
            kilocalories: row.get(6)?,
            store: row.get(7)?,
            brand: row.get(8)?,
            status: row.get(9)?,
        })
    }
}

struct StoredPresentation {
    kind: String,
    label: Option<String>,
    total_grams: Option<f64>,
    price_cents: Option<u64>,
    units_per_package: Option<u32>,
    price_cents_per_kilogram: Option<u64>,
    grams_per_unit: Option<f64>,
    price_cents_per_unit: Option<u64>,
}

impl StoredPresentation {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            kind: row.get(0)?,
            label: row.get(1)?,
            total_grams: row.get(2)?,
            price_cents: row.get(3)?,
            units_per_package: row.get(4)?,
            price_cents_per_kilogram: row.get(5)?,
            grams_per_unit: row.get(6)?,
            price_cents_per_unit: row.get(7)?,
        })
    }

    fn to_domain(self) -> Result<PurchasePresentation, ProductRepositoryError> {
        match self.kind.as_str() {
            "package" => PurchasePresentation::package(
                self.label
                    .ok_or_else(|| invalid_stored("etiqueta del paquete"))?,
                Grams::new(
                    self.total_grams
                        .ok_or_else(|| invalid_stored("gramos totales del paquete"))?,
                )
                .map_err(ProductRepositoryError::InvalidStoredProduct)?,
                self.price_cents,
                self.units_per_package,
            )
            .map_err(ProductRepositoryError::InvalidStoredProduct),
            "bulk_by_weight" => Ok(PurchasePresentation::bulk_by_weight(
                self.price_cents_per_kilogram,
            )),
            "bulk_by_unit" => Ok(PurchasePresentation::bulk_by_unit(
                self.grams_per_unit
                    .map(Grams::new)
                    .transpose()
                    .map_err(ProductRepositoryError::InvalidStoredProduct)?,
                self.price_cents_per_unit,
            )),
            _ => Err(invalid_stored("tipo de presentación")),
        }
    }
}

fn category_to_database(category: ProductCategory) -> &'static str {
    match category {
        ProductCategory::Vegetable => "vegetable",
        ProductCategory::Fruit => "fruit",
        ProductCategory::Yogurt => "yogurt",
        ProductCategory::Meat => "meat",
        ProductCategory::Fish => "fish",
        ProductCategory::Other => "other",
    }
}

fn category_from_database(value: &str) -> Result<ProductCategory, ProductRepositoryError> {
    match value {
        "vegetable" => Ok(ProductCategory::Vegetable),
        "fruit" => Ok(ProductCategory::Fruit),
        "yogurt" => Ok(ProductCategory::Yogurt),
        "meat" => Ok(ProductCategory::Meat),
        "fish" => Ok(ProductCategory::Fish),
        "other" => Ok(ProductCategory::Other),
        _ => Err(invalid_stored("categoría")),
    }
}

fn status_to_database(status: ProductStatus) -> &'static str {
    match status {
        ProductStatus::Active => "active",
        ProductStatus::Archived => "archived",
    }
}

fn status_from_database(value: &str) -> Result<ProductStatus, ProductRepositoryError> {
    match value {
        "active" => Ok(ProductStatus::Active),
        "archived" => Ok(ProductStatus::Archived),
        _ => Err(invalid_stored("estado")),
    }
}

fn invalid_stored(field: &'static str) -> ProductRepositoryError {
    ProductRepositoryError::InvalidStoredProduct(DomainError::InvalidValue { field })
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
            Some("Mercadona".into()),
            Some("Hacendado".into()),
            Some(
                PurchasePresentation::package(
                    "Bolsa de tortillas",
                    Grams::new(320.0).unwrap(),
                    Some(199),
                    Some(8),
                )
                .unwrap(),
            ),
        )
        .unwrap()
    }

    #[test]
    fn migration_creates_the_product_tables() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();

        let table_count: i64 = connection
            .query_row(
                "SELECT count(*) FROM sqlite_master
                 WHERE type = 'table' AND name IN ('meals_products', 'meals_product_presentations')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 2);
    }

    #[test]
    fn products_and_presentations_persist_after_reopening() {
        let path = temporary_database_path();
        {
            let mut connection = Connection::open(&path).unwrap();
            apply_migrations(&mut connection).unwrap();
            ProductRepository::new(&mut connection)
                .create(&tortillas())
                .unwrap();
        }

        let mut connection = Connection::open(&path).unwrap();
        apply_migrations(&mut connection).unwrap();
        let product = ProductRepository::new(&mut connection)
            .find_by_id(&ProductId::new("tortillas-mercadona").unwrap())
            .unwrap()
            .unwrap();

        assert_eq!(product.name(), "Tortillas de trigo");
        assert_eq!(product.store(), Some("Mercadona"));
        assert_eq!(product.brand(), Some("Hacendado"));
        assert_eq!(product.grams_per_unit(), Some(Grams::new(40.0).unwrap()));
        drop(connection);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn product_without_presentation_persists() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let product = Product::new(
            ProductId::new("patata-granel").unwrap(),
            "Patata a granel",
            ProductCategory::Vegetable,
            NutrientsPer100Grams::new(2.0, 17.0, 0.0, 77.0).unwrap(),
            None,
            None,
            None,
        )
        .unwrap();

        let mut repository = ProductRepository::new(&mut connection);
        repository.create(&product).unwrap();
        let stored = repository
            .find_by_id(&ProductId::new("patata-granel").unwrap())
            .unwrap()
            .unwrap();

        assert!(stored.presentation().is_none());
    }

    #[test]
    fn updates_archive_and_restore_a_product() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let id = ProductId::new("tortillas-mercadona").unwrap();
        let mut repository = ProductRepository::new(&mut connection);
        repository.create(&tortillas()).unwrap();

        let replacement = Product::new(
            ProductId::new("tortillas-mercadona").unwrap(),
            "Tortillas integrales",
            ProductCategory::Other,
            NutrientsPer100Grams::new(9.0, 45.0, 6.0, 280.0).unwrap(),
            None,
            None,
            Some(PurchasePresentation::bulk_by_weight(Some(350))),
        )
        .unwrap();
        repository.update(&replacement).unwrap();
        repository.archive(&id).unwrap();

        let archived = repository.find_by_id(&id).unwrap().unwrap();
        assert_eq!(archived.status(), ProductStatus::Archived);
        assert_eq!(archived.name(), "Tortillas integrales");
        assert_eq!(archived.grams_per_unit(), None);
        assert!(repository
            .list(Some(ProductStatus::Active))
            .unwrap()
            .is_empty());

        repository.restore(&id).unwrap();
        let active = repository.list(Some(ProductStatus::Active)).unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].status(), ProductStatus::Active);
    }

    fn temporary_database_path() -> std::path::PathBuf {
        let unique = format!(
            "nubeos-meals-repository-{}-{}.sqlite",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        std::env::temp_dir().join(unique)
    }
}
