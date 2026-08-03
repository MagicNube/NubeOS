pub mod meals;

use tauri::Manager;

use meals::commands::{
    archive_product, create_product, delete_product, list_products, restore_product,
    update_product, ProductDatabase,
};
use meals::meal_commands::{
    archive_meal, create_meal, create_planned_instance, delete_meal, list_meals,
    list_shopping_list, list_week, meals_affected_by_product, move_planned_instance,
    remove_planned_instance, remove_product_from_meals, reorder_planned_instance, restore_meal,
    set_shopping_entry_checked, set_weekly_available, update_meal, update_planned_instance,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_directory)?;
            app.manage(ProductDatabase::open(
                data_directory.join("nubeos.sqlite3"),
            )?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_products,
            create_product,
            update_product,
            archive_product,
            restore_product,
            delete_product,
            list_meals,
            create_meal,
            update_meal,
            archive_meal,
            restore_meal,
            delete_meal,
            meals_affected_by_product,
            remove_product_from_meals,
            list_week,
            create_planned_instance,
            update_planned_instance,
            remove_planned_instance,
            reorder_planned_instance,
            move_planned_instance,
            list_shopping_list,
            set_weekly_available,
            set_shopping_entry_checked,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NubeOS");
}
