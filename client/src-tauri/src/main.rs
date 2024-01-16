// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * The default port used by the local agent.
 */
#[cfg(debug_assertions)]
const DEFAULT_LOCAL_AGENT_PORT: &'static str = "1420";
#[cfg(not(debug_assertions))]
const DEFAULT_LOCAL_AGENT_PORT: &'static str = "4173";

/**
 * Show/Hide the developer tools
 */
#[tauri::command]
fn toogle_devtools(_window: tauri::Window) {
    #[cfg(debug_assertions)]
    if _window.is_devtools_open() {
        _window.close_devtools();
    } else {
        _window.open_devtools();
    }
}

#[tauri::command]
fn get_variable(name: &str) -> String {
    if name == "LOCAL_AGENT_URL" {
        return format!("http://localhost:{}", DEFAULT_LOCAL_AGENT_PORT);
    } else {
        return "".to_string();
    }
}

use tauri::Manager;
fn main() {
    tauri::Builder
        ::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![toogle_devtools, get_variable])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
