use crate::commandline::{ self, CommandArgs };
use crate::error::UserError;
use crate::error::Result;
use crate::error::UserContext;
use std::fmt;
use std::path::{ PathBuf, Path };
use serde::{ Deserialize, Serialize };
use lazy_static::lazy_static;
use ini::Ini;

const AGENT_CONF: &str = "agent.conf";

/**
 * Get the default base directory for the agent.
 *
 * The base directory is used to store the user files (e.g. workspace, shared environment, ...) but also the agent
 * configuration (agent.conf). Nevertheless, while the base directory can be overridden in agent.conf of the command
 * line, the agent.conf file is always stored in the default base directory.
 *
 * Windows %APPDATA%\one-sql\
 * macOS $HOME/Library/Application\ Support/one-sql/
 * Linux $HOME/.one-sql/
 */
fn get_default_base_dir() -> String {
    let mut root_dir = PathBuf::new();
    #[cfg(target_os = "macos")]
    {
        root_dir.push(std::env::var("HOME").unwrap());
        root_dir.push("Library/Application Support/onesql");
    }
    #[cfg(target_os = "linux")]
    {
        root_dir.push(std::env::var("HOME").unwrap());
        root_dir.push(".onesql");
    }
    #[cfg(target_os = "windows")]
    {
        root_dir.push(std::env::var("APPDATA").unwrap());
        root_dir.push("onesql");
    }
    root_dir.to_str().unwrap().to_string()
}

#[derive(Serialize, Deserialize)]
pub struct AgentSettings {
    /// The tcpip port to listen to
    port: u16,

    /// The base directory used to store the files
    base_dir: String,
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            port: 8080, // default port
            base_dir: get_default_base_dir(),
        }
    }
}

impl fmt::Display for AgentSettings {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut buffer = Vec::new();
        match get_config(&SETTINGS).write_to(&mut buffer) {
            Ok(_) => {
                let s = String::from_utf8(buffer).unwrap();
                write!(f, "{}", s)
            }
            Err(_) => { Err(fmt::Error) }
        }
    }
}

/**
 * Get the current configuration as an ini::Ini object.
 * This is intended to be used to display the current configuration when using the command line argument --show-config.
 */
fn get_config(settings: &AgentSettings) -> Ini {
    let mut ini = Ini::new();
    ini.with_section(None::<String>)
        .set("port", settings.port.to_string())
        .set("base_dir", settings.base_dir.to_string());
    ini
}

lazy_static! {
    static ref SETTINGS: AgentSettings = {
        let base_dir = get_default_base_dir();
        let args = commandline::get_args();
        match make_settings(&base_dir, &args) {
            Ok(settings) => { settings }
            Err(err) => {
                println!("Error: {}", err);
                std::process::exit(1);
            }
        }
    };
}

fn make_settings(base_dir: &str, args: &CommandArgs) -> Result<AgentSettings> {
    // 1) apply defaults
    let mut settings = AgentSettings::default();

    // 2) apply config file
    let config_file = {
        let mut file = PathBuf::from(&base_dir);
        file.push(AGENT_CONF);
        file.to_str().unwrap().to_string()
    };
    if Path::new(&config_file).exists() {
        let ini = Ini::load_from_file(&config_file).context(
            &format!("Cannot read config file: {0}", config_file)
        )?;
        let section = ini.section(None::<String>).unwrap();
        if section.contains_key("port") {
            settings.port = section.get("port").unwrap().parse::<u16>().unwrap();
        }
        if section.contains_key("base_dir") {
            settings.base_dir = section.get("base_dir").unwrap().to_string();
        }
    }

    // 3) apply command line
    if args.base_dir.is_some() {
        settings.base_dir = args.base_dir.clone().unwrap();
    }
    if args.port.is_some() {
        settings.port = args.port.unwrap();
    }

    Ok(settings)
}

pub fn get_settings() -> &'static AgentSettings {
    &SETTINGS
}

/**
 * Get the path of a file in the base directory.
 */
pub fn get_path(file: &str) -> String {
    let mut path = PathBuf::from(&SETTINGS.base_dir);
    path.push(file);
    path.to_str().unwrap().to_string()
}

/**
 * Implement the From trait to convert an ini::Error into a UserError.
 */
impl From<ini::Error> for UserError {
    fn from(err: ini::Error) -> UserError {
        UserError::new(&err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_base_dir() {
        #[cfg(target_os = "macos")]
        {
            std::env::set_var("HOME", "/Users/__test__");
            assert_eq!(
                get_default_base_dir(),
                "/Users/__test__/Library/Application Support/onesql"
            );
        }
        #[cfg(target_os = "linux")]
        {
            std::env::set_var("HOME", "/home/__test__");
            assert_eq!(get_default_base_dir(), "/home/__test__/.onesql");
        }
        #[cfg(target_os = "windows")]
        {
            std::env::set_var("APPDATA", "C:\\Users\\__test__\\AppData\\Roaming");
            assert_eq!(get_default_base_dir(), "C:\\Users\\__test__\\AppData\\Roaming\\onesql");
        }
    }

    #[test]
    fn test_get_path() {
        assert_eq!(get_path("file.txt"), get_default_base_dir() + "/file.txt");
    }
}
