use std::path::PathBuf;

#[cfg(any(test, feature = "test-hooks"))]
use std::cell::RefCell;

#[cfg(not(any(test, feature = "test-hooks")))]
use lazy_static::lazy_static;

pub mod constants;
pub mod pid_file;

/// Name of the environment variable used to specify the app directory.
pub const ENV_VAR_APP_DIR: &str = "SQUILL_APP_DIR";

#[cfg(not(any(test, feature = "test-hooks")))]
lazy_static! {
    /// Application directory location.
    ///
    /// The app directory (app_dir) is used to store files used internally by the agent  (e.g. agent.conf, .agent.pid, ...).
    /// This location can only be override by an environment variable, otherwise it's always located in a directory
    /// specific to the OS where the agent can access without requiring elevated privileges.
    static ref APP_DIR: PathBuf = {
        let mut root_dir = PathBuf::new();
        if let Ok(app_dir) = std::env::var(ENV_VAR_APP_DIR) {
            root_dir.push(app_dir);
        } else {
            #[cfg(target_os = "macos")]
            {
                root_dir.push(std::env::var("HOME").unwrap());
                root_dir.push(format!("Library/Application Support/{}", env!("CARGO_PKG_NAME")));
            }
            #[cfg(target_os = "linux")]
            {
                root_dir.push(std::env::var("HOME").unwrap());
                root_dir.push(format!(".{}", env!("CARGO_PKG_NAME")));
            }
            #[cfg(target_os = "windows")]
            {
                root_dir.push(std::env::var("APPDATA").unwrap());
                root_dir.push(env!("CARGO_PKG_NAME"));
            }
        }
        if root_dir.is_relative() {
            root_dir = std::env::current_dir().unwrap().join(root_dir);
        }
        root_dir
    };
}

#[cfg(any(test, feature = "test-hooks"))]
thread_local! {
    pub static APP_DIR: RefCell<PathBuf> = RefCell::new(
        PathBuf::from(std::env::var(ENV_VAR_APP_DIR).unwrap_or(".".to_string()))
    );
}

pub fn set_app_dir(_new_app_dir: &std::path::Path) {
    #[cfg(any(test, feature = "test-hooks"))]
    APP_DIR.with(|app_dir| {
        *app_dir.borrow_mut() = _new_app_dir.to_path_buf();
    });
}

/// Get the app directory for the agent.
///
/// The app directory (app_dir) is used to store files used internally by the agent  (e.g. agent.conf, .agent.pid,
/// log files, ...).
/// It's also used as the default location for the base directory (base_dir) used to store the user files
/// (e.g. workspace, shared environment, ...).
/// While the base directory can be overridden in agent.conf or the command line, the app directory cannot be overridden.
///
/// - Windows: %APPDATA%\squill\
/// - macOS:   $HOME/Library/Application\ Support/squill/
/// - Linux:   $HOME/.squill/
pub fn get_app_dir() -> PathBuf {
    #[cfg(any(test, feature = "test-hooks"))]
    {
        APP_DIR.with(|app_dir| app_dir.borrow().clone())
    }
    #[cfg(not(any(test, feature = "test-hooks")))]
    APP_DIR.clone()
}
