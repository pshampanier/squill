use std::sync::Arc;

use crate::{agent_db, pool::ConnectionPool, resources};
use anyhow::Result;
use squill_drivers::{async_conn::Connection, params};
use uuid::Uuid;

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
#[allow(dead_code)]
pub fn set_readonly(path: &std::path::Path) -> std::fs::Permissions {
    let permissions = std::fs::metadata(path).unwrap().permissions();
    let mut readonly = permissions.clone();
    readonly.set_readonly(true);
    std::fs::set_permissions(path, readonly).unwrap();
    permissions
}

#[allow(dead_code)]
pub fn retry_some<F, T>(f: F) -> Option<T>
where
    F: Fn() -> Option<T>,
{
    for _ in 0..10 {
        if let Some(result) = f() {
            return Some(result);
        }
        std::thread::sleep(std::time::Duration::from_millis(1000));
    }
    None
}

#[allow(dead_code)]
pub mod settings {
    use crate::settings_getters;
    use crate::{models::agent::AgentSettings, settings};
    use std::{
        cell::RefCell,
        path::{Path, PathBuf},
    };

    thread_local! {
        pub static SETTINGS: RefCell<AgentSettings> = RefCell::new(AgentSettings::default());
    }

    macro_rules! settings_setters {
        ($($setter:ident, $field:ident: $type:ty),* $(,)?) => {
        $(
            pub fn $setter(value: $type) {
                SETTINGS.with(|settings| {
                    settings.borrow_mut().$field = value.into();
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

    settings_setters!(set_base_dir, base_dir: &str);
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
    // ```
    // use crate::utils::tests;
    //
    // let base_dir = tests::settings::get_base_dir();
    // let api_key = tests::settings::get_api_key();
    // ```
    settings_getters! {
        get_api_key, api_key: String,
        get_port, port: u16,
    }

    // Get the directory used to store the files for the specified user.
    pub fn get_user_dir<S: AsRef<str>>(username: S) -> PathBuf {
        settings::get_user_dir(username.as_ref())
    }
}

// For convenience, initialize the agent database in a temporary directory and return the directory.
//
// The temporary directory is automatically deleted when the returned object is dropped, so the caller must keep it in
// scope as long as the agent database is needed.
//
// ```rust
// use crate::utils::tests;
//
// #[tokio::test]
// async fn test_something() {
//     let _base_dir = tests::setup().await;
//     // ...do something
// }
// ```
//
// The temporary directory is used as the base directory and can also be accessed using `tests::settings::get_base_dir()`.
pub async fn setup() -> Result<(tempfile::TempDir, Arc<ConnectionPool>)> {
    let base_dir = tempfile::tempdir()?;
    settings::set_base_dir(base_dir.path().to_str().unwrap());
    let conn_pool = agent_db::init().await?;
    Ok((base_dir, conn_pool))
}

pub async fn get_local_user_id(conn: &mut Connection) -> Uuid {
    let username = resources::users::local_username();
    match conn
        .query_map_row("SELECT user_id FROM users WHERE username=?", params!(username.as_str()), |row| {
            row.try_get::<_, String>("user_id").map_err(|e| e.into())
        })
        .await
    {
        Ok(Some(user_id)) => Uuid::parse_str(&user_id).unwrap(),
        _ => Uuid::nil(),
    }
}
