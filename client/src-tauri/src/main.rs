// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::App;

/// The default port used by the local agent.
#[cfg(debug_assertions)]
const DEFAULT_LOCAL_AGENT_PORT: &str = "8080";
#[cfg(not(debug_assertions))]
const DEFAULT_LOCAL_AGENT_PORT: &str = "4173";

/// Show/Hide the developer tools
#[tauri::command]
fn toggle_devtools(_window: tauri::Window) {
    #[cfg(debug_assertions)]
    if _window.is_devtools_open() {
        _window.close_devtools();
    } else {
        _window.open_devtools();
    }
}

#[tauri::command]
fn get_variable(name: &str) -> String {
    match name {
        "LOCAL_AGENT_URL" => format!("http://localhost:{}", DEFAULT_LOCAL_AGENT_PORT),
        _ => "".to_string(),
    }
}

fn setup(_app: &mut App) {
    #[cfg(debug_assertions)]
    {
        use tauri::Manager;
        if let Some(window) = _app.get_window("main") {
            window.open_devtools();
        }
    }
}

fn main() {
    tauri::Builder
        ::default()
        .invoke_handler(tauri::generate_handler![toggle_devtools, get_variable])
        .setup(|app| {
            setup(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
