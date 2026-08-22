pub mod documents;
pub mod habits;
pub mod meals;
pub mod media;

use tauri::{Manager, WebviewWindow};

use documents::{
    commands::{
        archive_document, copy_document_pdf, delete_document, discard_pending_document_pdf,
        get_document, get_document_expiry_summary, import_document, list_document_tags,
        list_documents, open_document_pdf, read_document_pdf, replace_document_pdf,
        restore_document, save_document_copy, select_document_pdf, set_document_favorite,
        update_document, DocumentStoreState,
    },
    repository::DocumentRepository,
    store::PdfStore,
};

use habits::commands::{
    archive_habit, create_habit, delete_habit, get_habit_statistics, get_habits_overview,
    list_habits, pause_habit, reorder_habits, restore_habit, resume_habit, set_habit_log,
    update_habit,
};
use meals::commands::{
    archive_product, create_product, delete_product, list_products, restore_product,
    update_product, ProductDatabase,
};
use meals::meal_commands::{
    add_manual_shopping_need, archive_meal, create_meal, create_planned_instance, delete_meal,
    list_meals, list_shopping_list, list_week, meals_affected_by_product, move_planned_instance,
    remove_manual_shopping_need, remove_planned_instance, remove_product_from_meals,
    reorder_planned_instance, restore_meal, set_product_shopping_unit, set_shopping_entry_checked,
    set_weekly_available, sync_planned_instance_from_meal, update_meal, update_planned_instance,
};
use media::{
    commands::{
        archive_media_title, create_media_content, create_media_title, delete_media_content,
        delete_media_history_entry, delete_media_title, discard_pending_media_cover,
        get_media_statistics, get_media_title, increment_media_progress, list_media_history,
        list_media_studios, list_media_titles, read_media_cover, reorder_media_contents,
        restore_media_title, select_media_cover, set_media_progress, set_media_title_favorite,
        set_media_title_score, set_media_title_status, update_media_content,
        update_media_history_date, update_media_title, MediaCoverState,
    },
    cover::CoverStore,
};

/// Coloca la ventana principal en una pantalla secundaria cuando existe y, en
/// cualquier caso, inicia NubeOS maximizado pero conserva el modo ventana.
///
/// La segunda pantalla es una preferencia de comodidad: si se desconecta o el
/// sistema no la detecta, Tauri conserva la ventana en la pantalla principal.
fn configure_main_window(window: &WebviewWindow) {
    if let Ok(monitors) = window.available_monitors() {
        let primary_position = window
            .primary_monitor()
            .ok()
            .flatten()
            .map(|monitor| *monitor.position());
        let preferred_monitor = primary_position
            .and_then(|position| {
                monitors
                    .iter()
                    .find(|monitor| *monitor.position() != position)
            })
            .or_else(|| monitors.first());

        if let Some(monitor) = preferred_monitor {
            let _ = window.set_position(*monitor.position());
        }
    }

    let _ = window.maximize();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                configure_main_window(&window);
            }

            let data_directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_directory)?;
            let database = ProductDatabase::open(data_directory.join("nubeos.sqlite3"))?;
            let store = PdfStore::open(data_directory.join("documents"))?;
            let media_cover_store = CoverStore::open(data_directory.join("media"))?;
            {
                let mut connection = database
                    .connection
                    .lock()
                    .map_err(|_| "database lock poisoned")?;
                let referenced = DocumentRepository::new(&mut connection)
                    .stored_file_names()?
                    .into_iter()
                    .collect();
                store.reconcile(&referenced)?;
            }
            app.manage(database);
            app.manage(DocumentStoreState {
                store: std::sync::Mutex::new(store),
            });
            app.manage(MediaCoverState {
                store: std::sync::Mutex::new(media_cover_store),
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
            sync_planned_instance_from_meal,
            remove_planned_instance,
            reorder_planned_instance,
            move_planned_instance,
            list_shopping_list,
            set_weekly_available,
            set_product_shopping_unit,
            set_shopping_entry_checked,
            add_manual_shopping_need,
            remove_manual_shopping_need,
            select_document_pdf,
            discard_pending_document_pdf,
            import_document,
            list_documents,
            get_document,
            list_document_tags,
            get_document_expiry_summary,
            update_document,
            set_document_favorite,
            archive_document,
            restore_document,
            delete_document,
            replace_document_pdf,
            read_document_pdf,
            open_document_pdf,
            save_document_copy,
            copy_document_pdf,
            list_habits,
            create_habit,
            update_habit,
            set_habit_log,
            pause_habit,
            resume_habit,
            archive_habit,
            restore_habit,
            delete_habit,
            reorder_habits,
            get_habits_overview,
            get_habit_statistics,
            select_media_cover,
            discard_pending_media_cover,
            list_media_titles,
            get_media_title,
            set_media_title_status,
            set_media_title_score,
            set_media_title_favorite,
            list_media_studios,
            list_media_history,
            update_media_history_date,
            delete_media_history_entry,
            create_media_title,
            update_media_title,
            create_media_content,
            update_media_content,
            delete_media_content,
            reorder_media_contents,
            set_media_progress,
            increment_media_progress,
            archive_media_title,
            restore_media_title,
            delete_media_title,
            read_media_cover,
            get_media_statistics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NubeOS");
}
