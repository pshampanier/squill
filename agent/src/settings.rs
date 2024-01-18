use crate::commandline;
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
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap();
        return format!("{}/Library/Application Support/onesql", home);
    }
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap();
        return format!("{}/.onesql", home);
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap();
        return format!("{}/onesql", appdata);
    }
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

use std::fmt;
impl fmt::Display for AgentSettings {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut buffer = Vec::new();
        match get_ini().write_to(&mut buffer) {
            Ok(_) => {
                let s = String::from_utf8(buffer).unwrap();
                write!(f, "{}", s)
            }
            Err(_) => { Err(fmt::Error) }
        }
    }
}

lazy_static! {
    static ref SETTINGS: AgentSettings = {
        // 1) apply defaults
        let mut settings = AgentSettings::default();

        // 2) apply config file
        let base_dir = get_default_base_dir();
        let config_file = {
            let mut file = PathBuf::from(&base_dir);
            file.push(AGENT_CONF);
            file.to_str().unwrap().to_string()
        };
        if Path::new(&config_file).exists() {
            let ini = Ini::load_from_file(&config_file);
            if ini.is_err() {
                println!("Error loading agent.conf: {}", ini.err().unwrap());
                std::process::exit(1);
            }
            let ini = ini.unwrap();
            let section = ini.section(None::<String>).unwrap();
            if section.contains_key("port") {
                settings.port = section.get("port").unwrap().parse::<u16>().unwrap();
            }
            if section.contains_key("base_dir") {
                settings.base_dir = section.get("base_dir").unwrap().to_string();
            }
        }

        // 3) apply command line
        let args = commandline::get_args();
        if args.base_dir.is_some() {
            settings.base_dir = args.base_dir.clone().unwrap();
        }
        if args.port.is_some() {
            settings.port = args.port.unwrap();
        }

        settings
    };
}

fn get_ini() -> Ini {
    let mut ini = Ini::new();
    ini.with_section(None::<String>)
        .set("port", SETTINGS.port.to_string())
        .set("base_dir", SETTINGS.base_dir.to_string());
    ini
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
