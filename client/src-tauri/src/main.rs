// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use agent::AgentWatcher;
use tauri::App;
use tauri::Manager;
use tracing::trace;

mod commands;
mod agent;
mod models;

fn setup(app: &App) {
    // We need to start the agent watcher as soon we can get an handle the main window.
    let window = app.get_window("main").expect("Error while getting the main window");
    let app_state: tauri::State<AppState> = app.state::<AppState>();
    let mut agent_watcher = app_state.agent_watcher.lock().unwrap();
    agent_watcher.start(window).expect("Error while starting agent watcher");
}

struct AppState {
    // The agent watcher is used to monitor the agent process.
    //
    // We need to keep it in the state in order to:
    // - make sure its lifetime is the same as the application.
    // - be able to access it from the commands.
    // - initialize it as soon as we have access to the main window.
    agent_watcher: Mutex<AgentWatcher>,
}

fn main() {
    tauri::Builder
        ::default()
        .manage(AppState {
            agent_watcher: Mutex::new(AgentWatcher::new()),
        })
        .invoke_handler(generate_commands_handler!())
        .setup(|app| {
            setup(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    trace!("Application closed.")
}
