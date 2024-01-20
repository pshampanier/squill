use crate::commandline::{ self, CommandArgs };
use std::fmt;
use std::net::Ipv4Addr;
use std::path::{ PathBuf, Path };
use serde::{ Deserialize, Serialize };
use lazy_static::lazy_static;
use ini::Ini;
use anyhow::{ anyhow, Context, Result };

const AGENT_CONF: &str = "agent.conf";

/**
 * Default address used to serve the API.
 */
const DEFAULT_LISTEN_ADDRESS: &str = "127.0.0.1";

/**
 * Default port used to serve the API.
 * The default port is 0 which means that the OS will choose a free port.
 */
const DEFAULT_PORT: u16 = 0;

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
pub fn get_default_base_dir() -> String {
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

#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct AgentSettings {
    /// Specifies the TCP/IP address on which the server is to listen for connections from client applications.
    /// The entry 0.0.0.0 allows listening for all IPv4 addresses.
    pub listen_address: String,

    /// The tcpip port to listen to
    pub port: u16,

    /// The base directory used to store the files
    pub base_dir: String,
}

impl AgentSettings {
    pub fn load_from_file(&mut self, config_file: &String) -> Result<()> {
        let ini = Ini::load_from_file(config_file)?;
        let section = ini.section(None::<String>).unwrap();
        for (key, value) in section.iter() {
            match key {
                "listen_address" => {
                    let address: Ipv4Addr = value
                        .parse()
                        .with_context(|| { format!("{key}={value}") })?;
                    self.listen_address = address.to_string();
                }
                "port" => {
                    self.port = value.parse::<u16>().with_context(|| { format!("{key}={value}") })?;
                }
                "base_dir" => {
                    self.base_dir = value.to_string();
                }
                _ => {
                    return Err(anyhow!("Invalid entry: {}={}", key, value));
                }
            }
        }
        Ok(())
    }
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            listen_address: DEFAULT_LISTEN_ADDRESS.to_string(),
            port: DEFAULT_PORT,
            base_dir: get_default_base_dir(),
        }
    }
}

impl fmt::Display for AgentSettings {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut buffer = Vec::new();
        match
            get_config(self).write_to_opt(&mut buffer, ini::WriteOption {
                line_separator: ini::LineSeparator::CR,
                ..Default::default()
            })
        {
            Ok(_) => write!(f, "{}", String::from_utf8(buffer).unwrap()),
            Err(_) => Err(fmt::Error),
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
        .set("listen_address", settings.listen_address.to_string())
        .set("port", settings.port.to_string())
        .set("base_dir", settings.base_dir.to_string());
    ini
}

lazy_static! {
    static ref SETTINGS: AgentSettings = {
        let base_dir = get_default_base_dir();
        let args = commandline::get_args();
        match make_settings(&base_dir, args) {
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
        settings
            .load_from_file(&config_file)
            .with_context(|| format!("{}: unable to read the configuration file.", config_file))?;
    }

    // 3) apply command line
    if args.base_dir.is_some() {
        settings.base_dir = args.base_dir.clone().unwrap();
    }
    if args.port.is_some() {
        settings.port = args.port.unwrap();
    }
    if args.listen_address.is_some() {
        settings.listen_address = args.listen_address.unwrap().to_string();
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

#[cfg(test)]
mod tests {
    use clap::Parser;
    use tempfile::tempdir;
    use super::*;

    #[test]
    fn test_get_path() {
        assert_eq!(get_path("file.txt"), get_default_base_dir() + "/file.txt");
    }

    #[test]
    fn test_fmt_display_trait() {
        let settings = AgentSettings {
            base_dir: "/tmp".to_string(),
            ..Default::default()
        };
        assert_eq!("listen_address=127.0.0.1\nport=0\nbase_dir=/tmp\n", format!("{}", settings));
    }

    #[test]
    fn test_make_settings() {
        // 1) apply defaults
        {
            let expected = AgentSettings::default();
            let actual = make_settings("/tmp", &CommandArgs::parse_from(["agent"])).unwrap();
            assert_eq!(expected, actual);
        }

        // 2) override with command line
        {
            let mut expected = AgentSettings::default();
            expected.port = 1234;
            expected.base_dir = "/tmp".to_string();
            let actual = make_settings(
                "/tmp",
                &CommandArgs::parse_from(["agent", "--port", "1234", "--base-dir", "/tmp"])
            ).unwrap();
            assert_eq!(expected, actual);
        }

        // 3) override with config file
        {
            let mut expected = AgentSettings::default();
            expected.port = 1234;
            expected.base_dir = "/tmp".to_string();
            expected.listen_address = "0.0.0.0".to_string();
            let base_dir = tempdir().unwrap();
            let mut file = PathBuf::from(base_dir.path());
            file.push(AGENT_CONF);
            std::fs
                ::write(
                    file,
                    r#"
                port="1234"
                base_dir="/tmp"
                listen_address="0.0.0.0"
            "#
                )
                .unwrap();
            let actual = make_settings(
                base_dir.path().to_str().unwrap(),
                &CommandArgs::parse_from(["agent"])
            ).unwrap();
            assert_eq!(expected, actual);
        }

        // 4) override with config file and command line
        //    - command line overrides config file
        {
            let mut expected = AgentSettings::default();
            expected.port = 5678;
            expected.listen_address = "0.0.0.0".to_string();
            let base_dir = tempdir().unwrap();
            let mut file = PathBuf::from(base_dir.path());
            file.push(AGENT_CONF);
            std::fs::write(file, "port=1234").unwrap();
            let actual = make_settings(
                base_dir.path().to_str().unwrap(),
                &CommandArgs::parse_from(["agent", "--port", "5678", "--listen-address", "0.0.0.0"])
            ).unwrap();
            assert_eq!(expected, actual);
        }

        // 5.1) invalid config file (invalid value)
        {
            let base_dir = tempdir().unwrap();
            let mut file = PathBuf::from(base_dir.path());
            file.push(AGENT_CONF);
            std::fs::write(file, "listen_address=127.0.0.X").unwrap();
            let actual = make_settings(
                base_dir.path().to_str().unwrap(),
                &CommandArgs::parse_from(["agent"])
            );
            assert!(actual.is_err());
        }
        // 5.2) invalid config file (invalid entry)
        {
            let base_dir = tempdir().unwrap();
            let mut file = PathBuf::from(base_dir.path());
            file.push(AGENT_CONF);
            std::fs::write(file, "xyz").unwrap();
            let actual = make_settings(
                base_dir.path().to_str().unwrap(),
                &CommandArgs::parse_from(["agent"])
            );
            assert!(actual.is_err());
        }
    }
}
