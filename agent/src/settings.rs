use crate::commandline;
use std::fmt;
use std::net::Ipv4Addr;
use std::path::{ PathBuf, Path };
use serde::{ Deserialize, Serialize };
use ini::Ini;
use anyhow::{ anyhow, Context, Result };

#[cfg(not(test))]
use lazy_static::lazy_static;
#[cfg(not(test))]
use rand::Rng;

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

#[cfg(not(test))]
lazy_static! {
    static ref APP_DIR: PathBuf = {
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
        root_dir
    };
}

/**
 * Get the app directory for the agent.
 *
 * The app directory (app_dir) is used to store files used internally by the agent  (e.g. agent.conf, .agent.pid,
 * log files, ...).
 * It's also used as the default location for the base directory (base_dir) used to store the user files
 * (e.g. workspace, shared environment, ...).
 * While the base directory can be overridden in agent.conf or the command line, the app directory cannot be overridden.
 *
 * - Windows: %APPDATA%\onesql\
 * - macOS:   $HOME/Library/Application\ Support/onesql/
 * - Linux:   $HOME/.onesql/
 */
pub fn get_app_dir() -> PathBuf {
    #[cfg(test)]
    {
        tests::APP_DIR.with(|app_dir| { app_dir.borrow().clone() })
    }
    #[cfg(not(test))]
    APP_DIR.clone()
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
struct AgentSettings {
    /// Specifies the TCP/IP address on which the server is to listen for connections from client applications.
    /// The entry 0.0.0.0 allows listening for all IPv4 addresses.
    listen_address: String,

    /// The tcpip port to listen to
    port: u16,

    /// The base directory used to store the files
    base_dir: String,

    /// The API key used to authenticate the client applications.
    api_key: String,
}

/**
 * For each property of the AgentSettings struct, generate a getter function.
 *
 * The generated function will return the value of the property from the global SETTINGS static variable. In test mode,
 * the generated function will return a value from the thread local variable SETTINGS, allowing to override the value.
 */
macro_rules! generate_getters {
    ($($getter:ident, $field:ident: $type:ty),* $(,)?) => {
        $(
            pub fn $getter() -> $type {
                #[cfg(not(test))]
                {
                    SETTINGS.$field.clone()
                }
                #[cfg(test)]
                tests::SETTINGS.with(|settings| { settings.borrow().$field.clone() })
            }
        )*
    };
}

generate_getters! {
    get_listen_address, listen_address: String,
    get_port, port: u16,
    get_base_dir, base_dir: String,
    get_api_key, api_key: String,
}

impl AgentSettings {
    pub fn load_from_file(&mut self, config_file: &Path) -> Result<()> {
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
                "api_key" => {
                    self.api_key = value.to_string();
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
            base_dir: get_app_dir().to_str().unwrap().to_string(),
            api_key: generate_api_key(),
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
        .set("listen_address", &settings.listen_address)
        .set("port", settings.port.to_string())
        .set("base_dir", &settings.base_dir)
        .set("api_key", &settings.api_key);
    ini
}

fn make_settings(args: &commandline::CommandArgs) -> Result<AgentSettings> {
    // 1) apply defaults
    let mut settings = AgentSettings::default();

    // 2) apply config file
    let config_file = get_app_dir().join(AGENT_CONF);
    if config_file.exists() {
        settings
            .load_from_file(config_file.as_path())
            .with_context(||
                format!("{}: unable to read the configuration file.", config_file.to_str().unwrap())
            )?;
    }

    // 3) apply command line
    if args.base_dir.is_some() {
        settings.base_dir = args.base_dir.clone().unwrap().to_string();
    }
    if args.port.is_some() {
        settings.port = args.port.unwrap();
    }
    if args.listen_address.is_some() {
        settings.listen_address = args.listen_address.unwrap().to_string();
    }

    Ok(settings)
}

#[cfg(not(test))]
lazy_static! {
    static ref SETTINGS: AgentSettings = {
        match make_settings(commandline::get_args()) {
            Ok(settings) => { settings }
            Err(err) => {
                println!("Error: {}", err);
                std::process::exit(1);
            }
        }
    };
}

/**
 * Get the directory used to store the files for the specified user.
 */
pub fn get_user_dir(username: &str) -> PathBuf {
    let mut user_dir = PathBuf::from(get_base_dir());
    user_dir.push(username);
    user_dir
}

fn generate_api_key() -> String {
    #[cfg(not(test))]
    {
        let mut rng = rand::thread_rng();
        let token: [u8; 32] = rng.gen();
        return hex::encode(token);
    }
    #[cfg(test)]
    "cf55f65...".to_string()
}

pub fn show_config() {
    #[cfg(not(test))]
    println!("{}", *SETTINGS);
}

#[cfg(test)]
pub mod tests {
    use crate::commandline::CommandArgs;
    use clap::Parser;
    use tempfile::tempdir;
    use std::fs;
    use std::path::{ Path, PathBuf };
    use std::cell::RefCell;
    use super::*;

    thread_local! {
        pub static APP_DIR: RefCell<PathBuf> = RefCell::new(PathBuf::new());
    }

    pub fn set_app_dir(new_app_dir: &Path) {
        APP_DIR.with(|app_dir| {
            *app_dir.borrow_mut() = new_app_dir.to_path_buf();
        });
    }

    thread_local! {
        pub static SETTINGS: RefCell<AgentSettings> = RefCell::new(AgentSettings::default());
    }

    macro_rules! generate_setters {
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

    generate_setters!(set_base_dir, base_dir: String);

    #[test]
    fn test_fmt_display_trait() {
        let settings = AgentSettings {
            base_dir: "/tmp".to_string(),
            ..Default::default()
        };
        assert_eq!(
            r"listen_address=127.0.0.1
            port=0
            base_dir=/tmp
            api_key=cf55f65...
            "
                .to_string()
                .replace(" ", ""),
            format!("{}", settings)
        );
    }

    #[test]
    fn test_make_settings() {
        // 1) apply defaults
        {
            let expected = AgentSettings::default();
            let actual = make_settings(&CommandArgs::parse_from(["agent"])).unwrap();
            assert_eq!(expected, actual);
        }

        // 2) override with command line
        {
            let mut expected = AgentSettings::default();
            expected.port = 1234;
            expected.base_dir = "/test".to_string();
            let actual = make_settings(
                &CommandArgs::parse_from(["agent", "--port", "1234", "--base-dir", "/test"])
            ).unwrap();
            assert_eq!(expected, actual);
        }

        // 3) override with config file
        {
            let mut expected = AgentSettings::default();
            expected.port = 1234;
            expected.base_dir = "/test".to_string();
            expected.listen_address = "0.0.0.0".to_string();
            expected.api_key = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".to_string();
            let app_dir = tempdir().unwrap();
            set_app_dir(app_dir.path());
            std::fs
                ::write(
                    app_dir.path().join(AGENT_CONF),
                    r#"
                port="1234"
                base_dir="/test"
                listen_address="0.0.0.0"
                api_key="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            "#
                )
                .unwrap();
            let actual = make_settings(&CommandArgs::parse_from(["agent"])).unwrap();
            assert_eq!(expected, actual);
            fs::remove_dir_all(app_dir).unwrap();
        }

        // 4) override with config file and command line
        //    - command line overrides config file
        {
            let app_dir = tempdir().unwrap();
            set_app_dir(app_dir.path());
            let mut expected = AgentSettings::default();
            expected.port = 5678;
            expected.listen_address = "0.0.0.0".to_string();
            expected.base_dir = get_base_dir();
            std::fs::write(app_dir.path().join(AGENT_CONF), "port=1234").unwrap();
            let actual = make_settings(
                &CommandArgs::parse_from(["agent", "--port", "5678", "--listen-address", "0.0.0.0"])
            ).unwrap();
            assert_eq!(expected, actual);
            fs::remove_dir_all(app_dir).unwrap();
        }

        // 5.1) invalid config file (invalid value)
        {
            let app_dir = tempdir().unwrap();
            set_app_dir(app_dir.path());
            std::fs::write(app_dir.path().join(AGENT_CONF), "listen_address=127.0.0.X").unwrap();
            let actual = make_settings(&CommandArgs::parse_from(["agent"]));
            assert!(actual.is_err());
            assert!(
                actual.unwrap_err().to_string().ends_with("unable to read the configuration file.")
            );
            fs::remove_dir_all(app_dir).unwrap();
        }
        // 5.2) invalid config file (invalid entry)
        {
            let app_dir = tempdir().unwrap();
            set_app_dir(app_dir.path());
            std::fs::write(app_dir.path().join(AGENT_CONF), "xyz").unwrap();
            let actual = make_settings(&CommandArgs::parse_from(["agent"]));
            assert!(actual.is_err());
            fs::remove_dir_all(app_dir).unwrap();
        }
    }

    #[test]
    fn load_from_file() {
        let mut settings = AgentSettings::default();
        let app_dir = tempdir().unwrap();
        let file = app_dir.path().join(AGENT_CONF);

        // invalid listen_address
        std::fs::write(&file, "listen_address = x.y.z.1").unwrap();
        let result = settings.load_from_file(&file);
        assert!(result.is_err());
        assert_eq!("listen_address=x.y.z.1", result.unwrap_err().to_string());

        // invalid port
        std::fs::write(&file, "port = 123456").unwrap();
        let result = settings.load_from_file(&file);
        assert!(result.is_err());
        assert_eq!("port=123456", result.unwrap_err().to_string());

        // unknown entry
        std::fs::write(&file, "xyz = 123").unwrap();
        let result = settings.load_from_file(&file);
        assert!(result.is_err());
        assert_eq!("Invalid entry: xyz=123", result.unwrap_err().to_string());
    }
}
