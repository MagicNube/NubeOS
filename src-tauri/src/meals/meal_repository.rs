//! Persistencia SQLite de recetas e instancias planificadas.

use std::fmt;

use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};

use super::{
    meal::{Meal, MealDomainError, MealId, MealIngredient, MealStatus},
    planning::{MealSlot, PlannedInstance, PlannedInstanceId, WeekStart},
    product::{IngredientQuantity, ProductId, QuantityUnit},
};

#[derive(Debug)]
pub enum MealRepositoryError {
    Database(rusqlite::Error),
    InvalidStoredData(MealDomainError),
    MealNotFound(String),
    InstanceNotFound(String),
    MealWouldBeEmpty(String),
}

impl fmt::Display for MealRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "Error de SQLite: {error}"),
            Self::InvalidStoredData(error) => {
                write!(formatter, "Datos de comidas no válidos: {error}")
            }
            Self::MealNotFound(id) => write!(formatter, "No existe la comida {id}."),
            Self::InstanceNotFound(id) => {
                write!(formatter, "No existe la instancia planificada {id}.")
            }
            Self::MealWouldBeEmpty(id) => write!(
                formatter,
                "No se puede retirar el producto porque la comida {id} quedaría vacía."
            ),
        }
    }
}

impl std::error::Error for MealRepositoryError {}

impl From<rusqlite::Error> for MealRepositoryError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

impl From<MealDomainError> for MealRepositoryError {
    fn from(error: MealDomainError) -> Self {
        Self::InvalidStoredData(error)
    }
}

pub struct MealRepository<'connection> {
    connection: &'connection mut Connection,
}

impl<'connection> MealRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn create(&mut self, meal: &Meal) -> Result<(), MealRepositoryError> {
        let transaction = self.connection.transaction()?;
        insert_meal(&transaction, meal)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn update(&mut self, meal: &Meal) -> Result<(), MealRepositoryError> {
        let transaction = self.connection.transaction()?;
        let changed = transaction.execute(
            "UPDATE meals_recipes SET name = ?2 WHERE id = ?1",
            params![meal.id().as_str(), meal.name()],
        )?;
        if changed == 0 {
            return Err(MealRepositoryError::MealNotFound(
                meal.id().as_str().to_owned(),
            ));
        }
        transaction.execute(
            "DELETE FROM meals_recipe_ingredients WHERE meal_id = ?1",
            [meal.id().as_str()],
        )?;
        insert_recipe_ingredients(&transaction, meal.id(), meal.ingredients())?;
        transaction.commit()?;
        Ok(())
    }

    pub fn find_by_id(&mut self, id: &MealId) -> Result<Option<Meal>, MealRepositoryError> {
        let stored = self
            .connection
            .query_row(
                "SELECT id, name, status FROM meals_recipes WHERE id = ?1",
                [id.as_str()],
                StoredMeal::from_row,
            )
            .optional()?;
        stored.map(|meal| self.to_meal(meal)).transpose()
    }

    pub fn list(&mut self, status: Option<MealStatus>) -> Result<Vec<Meal>, MealRepositoryError> {
        let sql = if status.is_some() {
            "SELECT id, name, status FROM meals_recipes WHERE status = ?1 ORDER BY name COLLATE NOCASE"
        } else {
            "SELECT id, name, status FROM meals_recipes ORDER BY name COLLATE NOCASE"
        };
        let stored = {
            let mut statement = self.connection.prepare(sql)?;
            let rows = match status {
                Some(status) => {
                    statement.query_map([meal_status_to_database(status)], StoredMeal::from_row)?
                }
                None => statement.query_map([], StoredMeal::from_row)?,
            };
            rows.collect::<Result<Vec<_>, _>>()?
        };
        stored.into_iter().map(|meal| self.to_meal(meal)).collect()
    }

    pub fn archive(&mut self, id: &MealId) -> Result<(), MealRepositoryError> {
        self.change_status(id, MealStatus::Archived)
    }
    pub fn restore(&mut self, id: &MealId) -> Result<(), MealRepositoryError> {
        self.change_status(id, MealStatus::Active)
    }

    pub fn affected_by_product(
        &mut self,
        product_id: &ProductId,
    ) -> Result<Vec<Meal>, MealRepositoryError> {
        let stored = {
            let mut statement = self.connection.prepare(
                "SELECT DISTINCT recipe.id, recipe.name, recipe.status FROM meals_recipes recipe
                 JOIN meals_recipe_ingredients ingredient ON ingredient.meal_id = recipe.id
                 WHERE ingredient.product_id = ?1 ORDER BY recipe.name COLLATE NOCASE",
            )?;
            let meals = statement
                .query_map([product_id.as_str()], StoredMeal::from_row)?
                .collect::<Result<Vec<_>, _>>()?;
            meals
        };
        stored.into_iter().map(|meal| self.to_meal(meal)).collect()
    }

    pub fn remove_product_from_recipes(
        &mut self,
        product_id: &ProductId,
    ) -> Result<(), MealRepositoryError> {
        let affected = self.affected_by_product(product_id)?;
        if let Some(meal) = affected.iter().find(|meal| meal.ingredients().len() == 1) {
            return Err(MealRepositoryError::MealWouldBeEmpty(
                meal.id().as_str().to_owned(),
            ));
        }
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "DELETE FROM meals_recipe_ingredients WHERE product_id = ?1",
            [product_id.as_str()],
        )?;
        for meal in affected {
            reindex_recipe_ingredients(&transaction, meal.id())?;
        }
        transaction.commit()?;
        Ok(())
    }

    fn change_status(
        &mut self,
        id: &MealId,
        status: MealStatus,
    ) -> Result<(), MealRepositoryError> {
        let changed = self.connection.execute(
            "UPDATE meals_recipes SET status = ?2 WHERE id = ?1",
            params![id.as_str(), meal_status_to_database(status)],
        )?;
        if changed == 0 {
            return Err(MealRepositoryError::MealNotFound(id.as_str().to_owned()));
        }
        Ok(())
    }

    fn to_meal(&mut self, stored: StoredMeal) -> Result<Meal, MealRepositoryError> {
        let id = MealId::new(stored.id)?;
        let ingredients = load_recipe_ingredients(self.connection, &id)?;
        Meal::from_persisted(
            id,
            stored.name,
            meal_status_from_database(&stored.status)?,
            ingredients,
        )
        .map_err(Into::into)
    }
}

pub struct PlanningRepository<'connection> {
    connection: &'connection mut Connection,
}

impl<'connection> PlanningRepository<'connection> {
    pub fn new(connection: &'connection mut Connection) -> Self {
        Self { connection }
    }

    pub fn next_position(
        &mut self,
        week_start: &WeekStart,
        weekday: u8,
        slot: MealSlot,
    ) -> Result<u32, MealRepositoryError> {
        self.connection.query_row(
            "SELECT COALESCE(MAX(position) + 1, 0) FROM meals_planned_instances WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3",
            params![week_start.as_str(), weekday, slot.as_str()], |row| row.get(0),
        ).map_err(Into::into)
    }

    pub fn create(&mut self, instance: &PlannedInstance) -> Result<(), MealRepositoryError> {
        let transaction = self.connection.transaction()?;
        insert_instance(&transaction, instance)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn list_week(
        &mut self,
        week_start: &WeekStart,
    ) -> Result<Vec<PlannedInstance>, MealRepositoryError> {
        let stored = {
            let mut statement = self.connection.prepare(
                "SELECT id, week_start, weekday, slot, position, source_meal_id, is_modified
                 FROM meals_planned_instances WHERE week_start = ?1 ORDER BY weekday, slot, position",
            )?;
            let instances = statement
                .query_map([week_start.as_str()], StoredInstance::from_row)?
                .collect::<Result<Vec<_>, _>>()?;
            instances
        };
        stored
            .into_iter()
            .map(|instance| self.to_instance(instance))
            .collect()
    }

    pub fn find_by_id(
        &mut self,
        id: &PlannedInstanceId,
    ) -> Result<Option<PlannedInstance>, MealRepositoryError> {
        let stored = self
            .connection
            .query_row(
                "SELECT id, week_start, weekday, slot, position, source_meal_id, is_modified
                 FROM meals_planned_instances WHERE id = ?1",
                [id.as_str()],
                StoredInstance::from_row,
            )
            .optional()?;
        stored
            .map(|instance| self.to_instance(instance))
            .transpose()
    }

    pub fn update_ingredients(
        &mut self,
        id: &PlannedInstanceId,
        ingredients: &[MealIngredient],
    ) -> Result<(), MealRepositoryError> {
        let transaction = self.connection.transaction()?;
        let changed = transaction.execute(
            "UPDATE meals_planned_instances SET is_modified = 1 WHERE id = ?1",
            [id.as_str()],
        )?;
        if changed == 0 {
            return Err(MealRepositoryError::InstanceNotFound(
                id.as_str().to_owned(),
            ));
        }
        transaction.execute(
            "DELETE FROM meals_planned_ingredients WHERE instance_id = ?1",
            [id.as_str()],
        )?;
        insert_planned_ingredients(&transaction, id, ingredients)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn remove(&mut self, id: &PlannedInstanceId) -> Result<(), MealRepositoryError> {
        let changed = self.connection.execute(
            "DELETE FROM meals_planned_instances WHERE id = ?1",
            [id.as_str()],
        )?;
        if changed == 0 {
            return Err(MealRepositoryError::InstanceNotFound(
                id.as_str().to_owned(),
            ));
        }
        Ok(())
    }

    pub fn reorder(
        &mut self,
        id: &PlannedInstanceId,
        new_position: u32,
    ) -> Result<(), MealRepositoryError> {
        let stored = self.connection.query_row(
            "SELECT id, week_start, weekday, slot, position, source_meal_id, is_modified FROM meals_planned_instances WHERE id = ?1", [id.as_str()], StoredInstance::from_row,
        ).optional()?.ok_or_else(|| MealRepositoryError::InstanceNotFound(id.as_str().to_owned()))?;
        let target = self.connection.query_row(
            "SELECT COUNT(*) FROM meals_planned_instances WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3",
            params![stored.week_start, stored.weekday, stored.slot], |row| row.get::<_, u32>(0),
        )?.saturating_sub(1);
        let target = new_position.min(target);
        let transaction = self.connection.transaction()?;
        if target < stored.position {
            transaction.execute("UPDATE meals_planned_instances SET position = position + 1 WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3 AND position >= ?4 AND position < ?5", params![stored.week_start, stored.weekday, stored.slot, target, stored.position])?;
        } else if target > stored.position {
            transaction.execute("UPDATE meals_planned_instances SET position = position - 1 WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3 AND position > ?4 AND position <= ?5", params![stored.week_start, stored.weekday, stored.slot, stored.position, target])?;
        }
        transaction.execute(
            "UPDATE meals_planned_instances SET position = ?2 WHERE id = ?1",
            params![id.as_str(), target],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn coverage(
        &mut self,
        week_start: &WeekStart,
        product_id: &ProductId,
    ) -> Result<(f64, f64), MealRepositoryError> {
        self.connection.query_row(
            "SELECT available_grams, purchased_grams FROM meals_weekly_coverage WHERE week_start = ?1 AND product_id = ?2",
            params![week_start.as_str(), product_id.as_str()], |row| Ok((row.get(0)?, row.get(1)?)),
        ).optional().map(|coverage| coverage.unwrap_or((0.0, 0.0))).map_err(Into::into)
    }

    pub fn set_available(
        &mut self,
        week_start: &WeekStart,
        product_id: &ProductId,
        grams: f64,
    ) -> Result<(), MealRepositoryError> {
        self.connection.execute(
            "INSERT INTO meals_weekly_coverage (week_start, product_id, available_grams, purchased_grams) VALUES (?1, ?2, ?3, 0)
             ON CONFLICT(week_start, product_id) DO UPDATE SET available_grams = excluded.available_grams",
            params![week_start.as_str(), product_id.as_str(), grams],
        )?;
        Ok(())
    }

    pub fn add_purchase(
        &mut self,
        week_start: &WeekStart,
        product_id: &ProductId,
        grams: f64,
    ) -> Result<(), MealRepositoryError> {
        self.connection.execute(
            "INSERT INTO meals_weekly_coverage (week_start, product_id, available_grams, purchased_grams) VALUES (?1, ?2, 0, ?3)
             ON CONFLICT(week_start, product_id) DO UPDATE SET purchased_grams = purchased_grams + excluded.purchased_grams",
            params![week_start.as_str(), product_id.as_str(), grams],
        )?;
        Ok(())
    }

    fn to_instance(
        &mut self,
        stored: StoredInstance,
    ) -> Result<PlannedInstance, MealRepositoryError> {
        let id = PlannedInstanceId::new(stored.id)?;
        let ingredients = load_planned_ingredients(self.connection, &id)?;
        PlannedInstance::from_persisted(
            id,
            WeekStart::new(stored.week_start)?,
            stored.weekday,
            MealSlot::from_database(&stored.slot)?,
            stored.position,
            stored.source_meal_id.map(MealId::new).transpose()?,
            stored.is_modified,
            ingredients,
        )
        .map_err(Into::into)
    }
}

fn insert_meal(transaction: &Transaction<'_>, meal: &Meal) -> Result<(), MealRepositoryError> {
    transaction.execute(
        "INSERT INTO meals_recipes (id, name, status) VALUES (?1, ?2, ?3)",
        params![
            meal.id().as_str(),
            meal.name(),
            meal_status_to_database(meal.status())
        ],
    )?;
    insert_recipe_ingredients(transaction, meal.id(), meal.ingredients())
}

fn insert_recipe_ingredients(
    transaction: &Transaction<'_>,
    meal_id: &MealId,
    ingredients: &[MealIngredient],
) -> Result<(), MealRepositoryError> {
    for ingredient in ingredients {
        transaction.execute("INSERT INTO meals_recipe_ingredients (meal_id, product_id, quantity, unit, position) VALUES (?1, ?2, ?3, ?4, ?5)", params![meal_id.as_str(), ingredient.product_id().as_str(), ingredient.quantity().value(), quantity_unit_to_database(ingredient.quantity().unit()), ingredient.position()])?;
    }
    Ok(())
}

fn insert_instance(
    transaction: &Transaction<'_>,
    instance: &PlannedInstance,
) -> Result<(), MealRepositoryError> {
    transaction.execute("INSERT INTO meals_planned_instances (id, week_start, weekday, slot, position, source_meal_id, is_modified) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", params![instance.id().as_str(), instance.week_start().as_str(), instance.weekday(), instance.slot().as_str(), instance.position(), instance.source_meal_id().map(MealId::as_str), i32::from(instance.is_modified())])?;
    insert_planned_ingredients(transaction, instance.id(), instance.ingredients())
}

fn insert_planned_ingredients(
    transaction: &Transaction<'_>,
    instance_id: &PlannedInstanceId,
    ingredients: &[MealIngredient],
) -> Result<(), MealRepositoryError> {
    for ingredient in ingredients {
        transaction.execute("INSERT INTO meals_planned_ingredients (instance_id, product_id, quantity, unit, position) VALUES (?1, ?2, ?3, ?4, ?5)", params![instance_id.as_str(), ingredient.product_id().as_str(), ingredient.quantity().value(), quantity_unit_to_database(ingredient.quantity().unit()), ingredient.position()])?;
    }
    Ok(())
}

fn load_recipe_ingredients(
    connection: &Connection,
    meal_id: &MealId,
) -> Result<Vec<MealIngredient>, MealRepositoryError> {
    let mut statement = connection.prepare("SELECT product_id, quantity, unit, position FROM meals_recipe_ingredients WHERE meal_id = ?1 ORDER BY position")?;
    let ingredients = statement
        .query_map([meal_id.as_str()], StoredIngredient::from_row)?
        .map(|ingredient| ingredient?.to_domain())
        .collect();
    ingredients
}

fn load_planned_ingredients(
    connection: &Connection,
    instance_id: &PlannedInstanceId,
) -> Result<Vec<MealIngredient>, MealRepositoryError> {
    let mut statement = connection.prepare("SELECT product_id, quantity, unit, position FROM meals_planned_ingredients WHERE instance_id = ?1 ORDER BY position")?;
    let ingredients = statement
        .query_map([instance_id.as_str()], StoredIngredient::from_row)?
        .map(|ingredient| ingredient?.to_domain())
        .collect();
    ingredients
}

fn reindex_recipe_ingredients(
    transaction: &Transaction<'_>,
    meal_id: &MealId,
) -> Result<(), MealRepositoryError> {
    let mut statement = transaction.prepare(
        "SELECT rowid FROM meals_recipe_ingredients WHERE meal_id = ?1 ORDER BY position",
    )?;
    let rowids = statement
        .query_map([meal_id.as_str()], |row| row.get::<_, i64>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);
    for (position, rowid) in rowids.into_iter().enumerate() {
        transaction.execute(
            "UPDATE meals_recipe_ingredients SET position = ?1 WHERE rowid = ?2",
            params![position as u32, rowid],
        )?;
    }
    Ok(())
}

struct StoredMeal {
    id: String,
    name: String,
    status: String,
}
impl StoredMeal {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            status: row.get(2)?,
        })
    }
}

struct StoredIngredient {
    product_id: String,
    quantity: f64,
    unit: String,
    position: u32,
}
impl StoredIngredient {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            product_id: row.get(0)?,
            quantity: row.get(1)?,
            unit: row.get(2)?,
            position: row.get(3)?,
        })
    }
    fn to_domain(self) -> Result<MealIngredient, MealRepositoryError> {
        let quantity = match self.unit.as_str() {
            "grams" => IngredientQuantity::grams(self.quantity).map_err(MealDomainError::from),
            "units" => IngredientQuantity::units(self.quantity).map_err(MealDomainError::from),
            _ => Err(MealDomainError::InvalidPosition),
        }?;
        let product_id = ProductId::new(self.product_id).map_err(MealDomainError::from)?;
        Ok(MealIngredient::new(product_id, quantity, self.position))
    }
}

struct StoredInstance {
    id: String,
    week_start: String,
    weekday: u8,
    slot: String,
    position: u32,
    source_meal_id: Option<String>,
    is_modified: bool,
}
impl StoredInstance {
    fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            week_start: row.get(1)?,
            weekday: row.get(2)?,
            slot: row.get(3)?,
            position: row.get(4)?,
            source_meal_id: row.get(5)?,
            is_modified: row.get::<_, i32>(6)? != 0,
        })
    }
}

fn meal_status_to_database(status: MealStatus) -> &'static str {
    match status {
        MealStatus::Active => "active",
        MealStatus::Archived => "archived",
    }
}
fn meal_status_from_database(value: &str) -> Result<MealStatus, MealRepositoryError> {
    match value {
        "active" => Ok(MealStatus::Active),
        "archived" => Ok(MealStatus::Archived),
        _ => Err(MealDomainError::InvalidPosition.into()),
    }
}
fn quantity_unit_to_database(unit: QuantityUnit) -> &'static str {
    match unit {
        QuantityUnit::Grams => "grams",
        QuantityUnit::Units => "units",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meals::{
        product::{NutrientsPer100Grams, Product, ProductCategory},
        repository::{apply_migrations, ProductRepository},
    };

    fn product() -> Product {
        Product::new(
            ProductId::new("product").unwrap(),
            "Producto",
            ProductCategory::Other,
            NutrientsPer100Grams::new(1.0, 1.0, 1.0, 1.0).unwrap(),
            None,
            None,
            None,
        )
        .unwrap()
    }
    fn meal() -> Meal {
        Meal::new(
            MealId::new("meal").unwrap(),
            "Receta",
            vec![MealIngredient::new(
                ProductId::new("product").unwrap(),
                IngredientQuantity::grams(100.0).unwrap(),
                0,
            )],
        )
        .unwrap()
    }

    #[test]
    fn recipes_persist_and_archive_without_deleting_ingredients() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        let mut repository = MealRepository::new(&mut connection);
        repository.create(&meal()).unwrap();
        repository.archive(&MealId::new("meal").unwrap()).unwrap();
        let archived = repository
            .find_by_id(&MealId::new("meal").unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(archived.status(), MealStatus::Archived);
        assert_eq!(archived.ingredients().len(), 1);
    }

    #[test]
    fn editing_a_planned_copy_does_not_change_its_recipe() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        MealRepository::new(&mut connection)
            .create(&meal())
            .unwrap();
        let week = WeekStart::new("2026-08-03").unwrap();
        let instance = PlannedInstance::new(
            PlannedInstanceId::new("instance").unwrap(),
            week.clone(),
            0,
            MealSlot::Breakfast,
            0,
            Some(MealId::new("meal").unwrap()),
            meal().ingredients().to_vec(),
        )
        .unwrap();
        PlanningRepository::new(&mut connection)
            .create(&instance)
            .unwrap();
        let changed = vec![MealIngredient::new(
            ProductId::new("product").unwrap(),
            IngredientQuantity::grams(250.0).unwrap(),
            0,
        )];
        PlanningRepository::new(&mut connection)
            .update_ingredients(instance.id(), &changed)
            .unwrap();

        let planned = PlanningRepository::new(&mut connection)
            .list_week(&week)
            .unwrap();
        let recipe = MealRepository::new(&mut connection)
            .find_by_id(&MealId::new("meal").unwrap())
            .unwrap()
            .unwrap();
        assert!(planned[0].is_modified());
        assert_eq!(planned[0].ingredients()[0].quantity().value(), 250.0);
        assert_eq!(recipe.ingredients()[0].quantity().value(), 100.0);
    }

    #[test]
    fn coverage_is_scoped_to_a_week_and_product() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        let week = WeekStart::new("2026-08-03").unwrap();
        let product_id = ProductId::new("product").unwrap();
        let mut repository = PlanningRepository::new(&mut connection);
        repository.set_available(&week, &product_id, 120.0).unwrap();
        repository.add_purchase(&week, &product_id, 250.0).unwrap();
        assert_eq!(
            repository.coverage(&week, &product_id).unwrap(),
            (120.0, 250.0)
        );
    }
}
