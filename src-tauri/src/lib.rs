pub mod meals;

use tauri::Manager;

use meals::commands::{
    archive_product, create_product, list_products, restore_product, update_product,
    ProductDatabase,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running NubeOS");
}
