use crate::{ agent::AgentWatcher, models::agent::AgentEndpoint };

/// Show/Hide the developer tools
///
/// This is only
#[tauri::command]
pub fn toggle_devtools(_window: tauri::Window) {
    #[cfg(debug_assertions)]
    if _window.is_devtools_open() {
        _window.close_devtools();
    } else {
        _window.open_devtools();
    }
}

#[tauri::command]
pub fn get_agent_endpoint() -> Option<AgentEndpoint> {
    let agent_endpoint: Option<AgentEndpoint> = AgentWatcher::get_pid_file().map(|pid_file| pid_file.into());
    agent_endpoint
}

#[macro_export]
macro_rules! generate_commands_handler {
    () => {
        tauri::generate_handler![commands::toggle_devtools, commands::get_agent_endpoint]
    };
}
