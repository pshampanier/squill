/// Set a path to read-only and return its original permissions.
///
/// # Example
///
///    let restore_permissions = set_readonly(path);
///    // ...do something
///    std::fs::set_permissions(path, restore_permissions).unwrap();
///
/// # Arguments
/// path: &std::path::Path - A path to set read-only.
///
/// # Returns
/// std::fs::Permissions - Original permissions.
pub fn set_readonly(path: &std::path::Path) -> std::fs::Permissions {
    let permissions = std::fs::metadata(path).unwrap().permissions();
    let mut readonly = permissions.clone();
    readonly.set_readonly(true);
    std::fs::set_permissions(path, readonly).unwrap();
    permissions
}

#[allow(dead_code)]
pub fn retry_some<F, T>(f: F) -> Option<T> where F: Fn() -> Option<T> {
    for _ in 0..10 {
        if let Some(result) = f() {
            return Some(result);
        }
        std::thread::sleep(std::time::Duration::from_millis(1000));
    }
    None
}

pub mod settings {
    use crate::{ models::agent::AgentSettings, settings };
    use std::{ cell::RefCell, path::{ Path, PathBuf } };
    use crate::settings_getters;

    thread_local! {
        pub static SETTINGS: RefCell<AgentSettings> = RefCell::new(AgentSettings::default());
    }

    macro_rules! settings_setters {
        ($($setter:ident, $field:ident: $type:ty),* $(,)?) => {
        $(
            pub fn $setter(value: $type) {
                SETTINGS.with(|settings| {
                    settings.borrow_mut().$field = value;
                });
            }
        )*
        };
    }

    // For convenience, generate getters & setters for the settings used in tests.
    // This allows to get/set the settings in tests modules as follows:
    //
    //    use crate::utils::tests::settings;
    //
    //    settings::set_base_dir("new_base_dir");
    //    let base_dir = settings::get_base_dir();
    //
    //    let api_key = settings::get_api_key();
    //    settings::set_api_key("new_api_key");

    settings_setters!(set_base_dir, base_dir: String);
    settings_setters!(set_token_expiration, token_expiration: std::time::Duration);
    settings_setters!(set_listen_address, listen_address: String);
    settings_setters!(set_port, port: u16);
    settings_setters!(set_log_dir, log_dir: String);
    settings_setters!(set_log_level, log_level: crate::models::agent::LogLevel);
    settings_setters!(set_log_collector, log_collector: bool);

    pub fn set_app_dir(new_app_dir: &Path) {
        common::set_app_dir(new_app_dir);
    }

    // For convenience, generate getters for the settings used in tests.
    // This allows to get the settings in tests modules as follows:
    //
    //    use crate::utils::tests::settings;
    //
    //    let base_dir = settings::get_base_dir();
    //    let api_key = settings::get_api_key();

    settings_getters! {
        get_api_key, api_key: String,
        get_port, port: u16,
    }

    /// Get the directory used to store the files for the specified user.
    pub fn get_user_dir(username: &str) -> PathBuf {
        settings::get_user_dir(username)
    }
}
