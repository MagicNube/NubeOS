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
    MealMustBeArchived(String),
    MealHasPlannedInstances(String),
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
            Self::MealMustBeArchived(id) => {
                write!(
                    formatter,
                    "La comida {id} debe estar archivada antes de eliminarla."
                )
            }
            Self::MealHasPlannedInstances(id) => {
                write!(
                    formatter,
                    "La comida {id} sigue apareciendo en el historial planificado."
                )
            }
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
        transaction.execute(
            "DELETE FROM meals_recipe_recommended_slots WHERE meal_id = ?1",
            [meal.id().as_str()],
        )?;
        insert_recommended_slots(&transaction, meal.id(), meal.recommended_slots())?;
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
        self.list_matching(status, None, None)
    }

    pub fn list_matching(
        &mut self,
        status: Option<MealStatus>,
        search: Option<&str>,
        product_id: Option<&ProductId>,
    ) -> Result<Vec<Meal>, MealRepositoryError> {
        let status = status.map(meal_status_to_database);
        let search = search.unwrap_or("").trim();
        let product_id = product_id.map(ProductId::as_str);
        let sql = "SELECT recipe.id, recipe.name, recipe.status FROM meals_recipes recipe
            WHERE (?1 IS NULL OR recipe.status = ?1)
              AND (?2 = '' OR recipe.name LIKE '%' || ?2 || '%' COLLATE NOCASE)
              AND (?3 IS NULL OR EXISTS (
                  SELECT 1 FROM meals_recipe_ingredients ingredient
                  WHERE ingredient.meal_id = recipe.id AND ingredient.product_id = ?3
              ))
            ORDER BY recipe.name COLLATE NOCASE";
        let stored = {
            let mut statement = self.connection.prepare(sql)?;
            let rows =
                statement.query_map(params![status, search, product_id], StoredMeal::from_row)?;
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

    pub fn delete_archived(&mut self, id: &MealId) -> Result<(), MealRepositoryError> {
        let status = self
            .connection
            .query_row(
                "SELECT status FROM meals_recipes WHERE id = ?1",
                [id.as_str()],
                |row| row.get::<_, String>(0),
            )
            .optional()?
            .ok_or_else(|| MealRepositoryError::MealNotFound(id.as_str().to_owned()))?;
        if status != meal_status_to_database(MealStatus::Archived) {
            return Err(MealRepositoryError::MealMustBeArchived(
                id.as_str().to_owned(),
            ));
        }
        let planned_instances: i64 = self.connection.query_row(
            "SELECT COUNT(*) FROM meals_planned_instances WHERE source_meal_id = ?1",
            [id.as_str()],
            |row| row.get(0),
        )?;
        if planned_instances > 0 {
            return Err(MealRepositoryError::MealHasPlannedInstances(
                id.as_str().to_owned(),
            ));
        }
        let deleted = self
            .connection
            .execute("DELETE FROM meals_recipes WHERE id = ?1", [id.as_str()])?;
        if deleted == 0 {
            return Err(MealRepositoryError::MealNotFound(id.as_str().to_owned()));
        }
        Ok(())
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
        let recommended_slots = load_recommended_slots(self.connection, &id)?;
        Meal::from_persisted(
            id,
            stored.name,
            meal_status_from_database(&stored.status)?,
            ingredients,
            recommended_slots,
        )
        .map_err(Into::into)
    }
}

pub struct PlanningRepository<'connection> {
    connection: &'connection mut Connection,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WeeklyCoverage {
    pub available_grams: f64,
    pub is_checked: bool,
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
        let instance = self
            .find_by_id(id)?
            .ok_or_else(|| MealRepositoryError::InstanceNotFound(id.as_str().to_owned()))?;
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "DELETE FROM meals_planned_instances WHERE id = ?1",
            [id.as_str()],
        )?;
        reindex_instances(
            &transaction,
            instance.week_start(),
            instance.weekday(),
            instance.slot(),
        )?;
        transaction.commit()?;
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

    pub fn move_to(
        &mut self,
        id: &PlannedInstanceId,
        target_weekday: u8,
        target_slot: MealSlot,
        requested_position: u32,
    ) -> Result<(), MealRepositoryError> {
        if target_weekday > 6 {
            return Err(MealDomainError::InvalidWeekday.into());
        }
        let stored = self.connection.query_row(
            "SELECT id, week_start, weekday, slot, position, source_meal_id, is_modified FROM meals_planned_instances WHERE id = ?1",
            [id.as_str()], StoredInstance::from_row,
        ).optional()?.ok_or_else(|| MealRepositoryError::InstanceNotFound(id.as_str().to_owned()))?;
        let source_slot = MealSlot::from_database(&stored.slot)?;
        let same_slot = stored.weekday == target_weekday && source_slot == target_slot;
        if same_slot {
            return self.reorder(id, requested_position);
        }
        let count: u32 = self.connection.query_row(
            "SELECT COUNT(*) FROM meals_planned_instances WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3",
            params![stored.week_start, target_weekday, target_slot.as_str()], |row| row.get(0),
        )?;
        let target_position = requested_position.min(count);
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "UPDATE meals_planned_instances SET position = position - 1
             WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3 AND position > ?4",
            params![
                stored.week_start,
                stored.weekday,
                stored.slot,
                stored.position
            ],
        )?;
        transaction.execute(
            "UPDATE meals_planned_instances SET position = position + 1
             WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3 AND position >= ?4",
            params![
                stored.week_start,
                target_weekday,
                target_slot.as_str(),
                target_position
            ],
        )?;
        transaction.execute(
            "UPDATE meals_planned_instances SET weekday = ?2, slot = ?3, position = ?4 WHERE id = ?1",
            params![id.as_str(), target_weekday, target_slot.as_str(), target_position],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn coverage(
        &mut self,
        week_start: &WeekStart,
        product_id: &ProductId,
    ) -> Result<WeeklyCoverage, MealRepositoryError> {
        self.connection.query_row(
            "SELECT available_grams, is_checked FROM meals_weekly_coverage WHERE week_start = ?1 AND product_id = ?2",
            params![week_start.as_str(), product_id.as_str()],
            |row| Ok(WeeklyCoverage { available_grams: row.get(0)?, is_checked: row.get::<_, i64>(1)? != 0 }),
        ).optional().map(|coverage| coverage.unwrap_or(WeeklyCoverage { available_grams: 0.0, is_checked: false })).map_err(Into::into)
    }

    pub fn set_available(
        &mut self,
        week_start: &WeekStart,
        product_id: &ProductId,
        grams: f64,
    ) -> Result<(), MealRepositoryError> {
        self.connection.execute(
            "INSERT INTO meals_weekly_coverage (week_start, product_id, available_grams) VALUES (?1, ?2, ?3)
             ON CONFLICT(week_start, product_id) DO UPDATE SET available_grams = excluded.available_grams",
            params![week_start.as_str(), product_id.as_str(), grams],
        )?;
        Ok(())
    }

    pub fn set_checked(
        &mut self,
        week_start: &WeekStart,
        product_id: &ProductId,
        is_checked: bool,
    ) -> Result<(), MealRepositoryError> {
        self.connection.execute(
            "INSERT INTO meals_weekly_coverage (week_start, product_id, available_grams, is_checked) VALUES (?1, ?2, 0, ?3)
             ON CONFLICT(week_start, product_id) DO UPDATE SET is_checked = excluded.is_checked",
            params![week_start.as_str(), product_id.as_str(), is_checked as i64],
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
    insert_recipe_ingredients(transaction, meal.id(), meal.ingredients())?;
    insert_recommended_slots(transaction, meal.id(), meal.recommended_slots())
}

fn insert_recommended_slots(
    transaction: &Transaction<'_>,
    meal_id: &MealId,
    slots: &[MealSlot],
) -> Result<(), MealRepositoryError> {
    for slot in slots {
        transaction.execute(
            "INSERT INTO meals_recipe_recommended_slots (meal_id, slot) VALUES (?1, ?2)",
            params![meal_id.as_str(), slot.as_str()],
        )?;
    }
    Ok(())
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

fn load_recommended_slots(
    connection: &Connection,
    meal_id: &MealId,
) -> Result<Vec<MealSlot>, MealRepositoryError> {
    let mut statement = connection.prepare(
        "SELECT slot FROM meals_recipe_recommended_slots WHERE meal_id = ?1 ORDER BY slot",
    )?;
    let slots = statement
        .query_map([meal_id.as_str()], |row| row.get::<_, String>(0))?
        .map(|slot| MealSlot::from_database(&slot?).map_err(MealRepositoryError::from))
        .collect();
    slots
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

fn reindex_instances(
    transaction: &Transaction<'_>,
    week_start: &WeekStart,
    weekday: u8,
    slot: MealSlot,
) -> Result<(), MealRepositoryError> {
    let mut statement = transaction.prepare(
        "SELECT id FROM meals_planned_instances WHERE week_start = ?1 AND weekday = ?2 AND slot = ?3 ORDER BY position",
    )?;
    let ids = statement
        .query_map(
            params![week_start.as_str(), weekday, slot.as_str()],
            |row| row.get::<_, String>(0),
        )?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);
    for (position, id) in ids.into_iter().enumerate() {
        transaction.execute(
            "UPDATE meals_planned_instances SET position = ?1 WHERE id = ?2",
            params![position as u32, id],
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
        repository::{apply_migrations, ProductRepository, ProductRepositoryError},
    };

    fn product() -> Product {
        Product::new(
            ProductId::new("product").unwrap(),
            "Producto",
            ProductCategory::Other,
            NutrientsPer100Grams::new(1.0, 1.0, 1.0, 1.0).unwrap(),
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
            vec![],
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
    fn permanently_deletes_an_archived_meal_without_planned_instances() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        let id = MealId::new("meal").unwrap();
        let mut repository = MealRepository::new(&mut connection);
        repository.create(&meal()).unwrap();
        repository.archive(&id).unwrap();
        repository.delete_archived(&id).unwrap();
        assert!(repository.find_by_id(&id).unwrap().is_none());
    }

    #[test]
    fn refuses_to_delete_an_archived_product_referenced_by_a_meal() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        MealRepository::new(&mut connection)
            .create(&meal())
            .unwrap();
        let id = ProductId::new("product").unwrap();
        let mut repository = ProductRepository::new(&mut connection);
        repository.archive(&id).unwrap();
        assert!(matches!(
            repository.delete_archived(&id),
            Err(ProductRepositoryError::ProductHasReferences(_))
        ));
    }

    #[test]
    fn refuses_to_delete_an_archived_meal_with_planned_history() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        MealRepository::new(&mut connection)
            .create(&meal())
            .unwrap();
        let week = WeekStart::new("2026-08-03").unwrap();
        PlanningRepository::new(&mut connection)
            .create(
                &PlannedInstance::new(
                    PlannedInstanceId::new("instance").unwrap(),
                    week,
                    0,
                    MealSlot::Breakfast,
                    0,
                    Some(MealId::new("meal").unwrap()),
                    meal().ingredients().to_vec(),
                )
                .unwrap(),
            )
            .unwrap();
        let id = MealId::new("meal").unwrap();
        let mut repository = MealRepository::new(&mut connection);
        repository.archive(&id).unwrap();
        assert!(matches!(
            repository.delete_archived(&id),
            Err(MealRepositoryError::MealHasPlannedInstances(_))
        ));
    }

    #[test]
    fn recipes_persist_recommended_slots_and_filter_by_name_or_product() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        let breakfast = Meal::new(
            MealId::new("breakfast").unwrap(),
            "Tostada de prueba",
            meal().ingredients().to_vec(),
            vec![MealSlot::Breakfast, MealSlot::Snack],
        )
        .unwrap();
        MealRepository::new(&mut connection)
            .create(&breakfast)
            .unwrap();
        let found = MealRepository::new(&mut connection)
            .list_matching(
                Some(MealStatus::Active),
                Some("tostada"),
                Some(&ProductId::new("product").unwrap()),
            )
            .unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(
            found[0].recommended_slots(),
            &[MealSlot::Breakfast, MealSlot::Snack]
        );
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
        repository.set_checked(&week, &product_id, true).unwrap();
        let coverage = repository.coverage(&week, &product_id).unwrap();
        assert_eq!(coverage.available_grams, 120.0);
        assert!(coverage.is_checked);
    }

    #[test]
    fn moving_instances_between_slots_reindexes_both_lists() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        ProductRepository::new(&mut connection)
            .create(&product())
            .unwrap();
        MealRepository::new(&mut connection)
            .create(&meal())
            .unwrap();
        let week = WeekStart::new("2026-08-03").unwrap();
        for (id, slot, position) in [
            ("breakfast-first", MealSlot::Breakfast, 0),
            ("breakfast-second", MealSlot::Breakfast, 1),
            ("dinner-first", MealSlot::Dinner, 0),
        ] {
            PlanningRepository::new(&mut connection)
                .create(
                    &PlannedInstance::new(
                        PlannedInstanceId::new(id).unwrap(),
                        week.clone(),
                        0,
                        slot,
                        position,
                        Some(MealId::new("meal").unwrap()),
                        meal().ingredients().to_vec(),
                    )
                    .unwrap(),
                )
                .unwrap();
        }

        let moved = PlannedInstanceId::new("breakfast-second").unwrap();
        PlanningRepository::new(&mut connection)
            .move_to(&moved, 0, MealSlot::Dinner, 0)
            .unwrap();
        let after_first_move = PlanningRepository::new(&mut connection)
            .list_week(&week)
            .unwrap();
        let breakfast = after_first_move
            .iter()
            .filter(|item| item.slot() == MealSlot::Breakfast)
            .collect::<Vec<_>>();
        let dinner = after_first_move
            .iter()
            .filter(|item| item.slot() == MealSlot::Dinner)
            .collect::<Vec<_>>();
        assert_eq!(breakfast.len(), 1);
        assert_eq!(breakfast[0].position(), 0);
        assert_eq!(
            dinner
                .iter()
                .map(|item| item.position())
                .collect::<Vec<_>>(),
            vec![0, 1]
        );
        assert_eq!(dinner[0].id().as_str(), "breakfast-second");

        PlanningRepository::new(&mut connection)
            .move_to(&moved, 0, MealSlot::Breakfast, 1)
            .unwrap();
        let after_second_move = PlanningRepository::new(&mut connection)
            .list_week(&week)
            .unwrap();
        let breakfast = after_second_move
            .iter()
            .filter(|item| item.slot() == MealSlot::Breakfast)
            .collect::<Vec<_>>();
        let dinner = after_second_move
            .iter()
            .filter(|item| item.slot() == MealSlot::Dinner)
            .collect::<Vec<_>>();
        assert_eq!(
            breakfast
                .iter()
                .map(|item| item.position())
                .collect::<Vec<_>>(),
            vec![0, 1]
        );
        assert_eq!(breakfast[1].id().as_str(), "breakfast-second");
        assert_eq!(dinner.len(), 1);
        assert_eq!(dinner[0].position(), 0);
    }
}
