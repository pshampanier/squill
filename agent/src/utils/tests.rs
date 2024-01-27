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

pub mod settings {
    use crate::{ models::agent::AgentSettings, settings };
    use std::{ cell::RefCell, path::{ Path, PathBuf } };
    pub fn set_app_dir(new_app_dir: &Path) {
        crate::settings::APP_DIR.with(|app_dir| {
            *app_dir.borrow_mut() = new_app_dir.to_path_buf();
        });
    }

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

    /// Get the directory used to store the files for the specified user.
    pub fn get_user_dir(username: &str) -> PathBuf {
        settings::get_user_dir(username)
    }

    settings_setters!(set_base_dir, base_dir: String);
    settings_setters!(set_token_expiration, token_expiration: u32);
}
