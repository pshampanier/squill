use crate::commandline;
use crate::models::agent::{AgentSettings, LogLevel};
use crate::settings_getters;
use crate::utils::constants::USERS_DIRNAME;
use anyhow::{anyhow, Context, Result};
use ini::Ini;
use std::fmt;
use std::net::Ipv4Addr;
use std::path::{Path, PathBuf};

#[cfg(not(test))]
use ::{hex, lazy_static::lazy_static, rand::Rng, tracing::error};

const AGENT_CONF: &str = "agent.conf";

/// Default address used to serve the API.
const DEFAULT_LISTEN_ADDRESS: &str = "127.0.0.1";

/// Default port used to serve the API.
/// The default port is 0 which means that the OS will choose a free port.
const DEFAULT_PORT: u16 = 0;

/// Get the directory used by the application to store any additional data.
pub fn get_app_dir() -> PathBuf {
    common::get_app_dir()
}

settings_getters! {
    get_listen_address, listen_address: String,
    get_port, port: u16,
    get_base_dir, base_dir: String,
    get_api_key, api_key: String,
    get_max_user_sessions, max_user_sessions: usize,
    get_max_refresh_tokens, max_refresh_tokens: usize,
    get_token_expiration, token_expiration: std::time::Duration,
    get_log_collector, log_collector: bool,
    get_log_dir, log_dir: String,
    get_cors_allowed_origins, cors_allowed_origins: Vec<String>,
    get_cors_max_age, cors_max_age: std::time::Duration,
}

pub fn get_log_level() -> tracing::Level {
    #[cfg(not(test))]
    let log_level = &SETTINGS.log_level;
    #[cfg(test)]
    let log_level = crate::utils::tests::settings::SETTINGS.with(|settings| settings.borrow().log_level.clone());
    match log_level {
        LogLevel::Error => tracing::Level::ERROR,
        LogLevel::Warning => tracing::Level::WARN,
        LogLevel::Info => tracing::Level::INFO,
        LogLevel::Debug => tracing::Level::DEBUG,
        LogLevel::Trace => tracing::Level::TRACE,
    }
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            listen_address: DEFAULT_LISTEN_ADDRESS.to_string(),
            port: DEFAULT_PORT,
            base_dir: get_app_dir().to_str().unwrap().to_string(),
            api_key: generate_api_key(),
            max_user_sessions: 100,
            max_refresh_tokens: 100,
            token_expiration: std::time::Duration::from_secs(3600),
            log_collector: true,
            log_dir: get_app_dir().join("logs").to_str().unwrap().to_string(),
            log_level: LogLevel::Info,
            cors_allowed_origins: vec!["*".to_string()],
            cors_max_age: std::time::Duration::from_secs(86400),
        }
    }
}

impl AgentSettings {
    pub fn load_from_file(&mut self, config_file: &Path) -> Result<()> {
        let ini = Ini::load_from_file(config_file)?;
        let section = ini.section(None::<String>).unwrap();
        for (key, value) in section.iter() {
            match key {
                "listen_address" => {
                    let address: Ipv4Addr = value.parse().with_context(|| format!("{key}={value}"))?;
                    self.listen_address = address.to_string();
                }
                "port" => {
                    self.port = value.parse::<u16>().with_context(|| format!("{key}={value}"))?;
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

impl fmt::Display for AgentSettings {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut buffer = Vec::new();
        match get_config(self).write_to_opt(
            &mut buffer,
            ini::WriteOption { line_separator: ini::LineSeparator::CR, ..Default::default() },
        ) {
            Ok(_) => write!(f, "{}", String::from_utf8(buffer).unwrap()),
            Err(_) => Err(fmt::Error),
        }
    }
}

/// Get the current configuration as an ini::Ini object.
///
/// This is intended to be used to display the current configuration when using the command line argument --show-config.
fn get_config(settings: &AgentSettings) -> Ini {
    let mut ini = Ini::new();
    ini.with_section(None::<String>)
        .set("listen_address", &settings.listen_address)
        .set("port", settings.port.to_string())
        .set("base_dir", &settings.base_dir)
        .set("api_key", &settings.api_key);
    ini
}

fn make_settings(args: &commandline::Args) -> Result<AgentSettings> {
    // 1) apply defaults
    let mut settings = AgentSettings::default();

    // 2) apply config file
    let config_file = get_app_dir().join(AGENT_CONF);
    if config_file.exists() {
        settings
            .load_from_file(config_file.as_path())
            .with_context(|| format!("{}: unable to read the configuration file.", config_file.to_str().unwrap()))?;
    }

    // 3) apply command line
    if args.base_dir.is_some() {
        settings.base_dir = args.base_dir.clone().unwrap();
    }
    if args.verbose {
        settings.log_level = LogLevel::Debug;
    }

    if let commandline::Commands::Start { listen_address, port, api_key, .. } = &args.command {
        #[cfg(debug_assertions)]
        if let commandline::Commands::Start { dev, .. } = &args.command {
            // If the development flag is set, use the environment variables to set the address, port, and API key.
            // Those variables are expected to be set in the environment and be the same as the one defined in the
            // file `client/.env.local` used by vite to expose environment variables to the web client.
            // Please note that the development flag is only available in debug builds and should only be used when
            // using the webapp since the desktop client is capable of setting the address, port, and API key from the
            // pid file.
            if *dev {
                settings.log_level = LogLevel::Debug;
                settings.listen_address = env!("VITE_AGENT_ADDRESS").to_string();
                settings.port = env!("VITE_AGENT_PORT").parse().unwrap();
                settings.api_key = env!("VITE_AGENT_API_KEY").to_string();
            }
        }
        if listen_address.is_some() {
            settings.listen_address = (*listen_address).unwrap().to_string();
        }
        if port.is_some() {
            settings.port = (*port).unwrap();
        }
        if api_key.is_some() {
            settings.api_key = api_key.clone().unwrap().to_string();
        }
    }

    Ok(settings)
}

#[cfg(not(test))]
lazy_static! {
    static ref SETTINGS: AgentSettings = {
        match make_settings(commandline::get_args()) {
            Ok(settings) => settings,
            Err(err) => {
                error!("{}", err);
                std::process::exit(1);
            }
        }
    };
}

/// Get the directory used to store the files for the specified user.
pub fn get_user_dir<S: AsRef<str>>(username: S) -> PathBuf {
    PathBuf::from(get_base_dir()).join(USERS_DIRNAME).join(username.as_ref())
}

pub fn show_config() {
    #[cfg(not(test))]
    println!("{}", *SETTINGS);
}

/// Generate a random API key.
///
/// The API key is used to authenticate the client of the REST API with the web server. By default a random key is
/// generated every time the agent starts. This key can be overridden in the configuration file and the command line.
fn generate_api_key() -> String {
    #[cfg(not(test))]
    {
        let mut rng = rand::thread_rng();
        let token: [u8; 32] = rng.gen();
        hex::encode(token)
    }
    #[cfg(test)]
    "x-test-api-key".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commandline::Args;
    use crate::utils::tests::settings;
    use clap::Parser;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    #[ignore]
    fn test_fmt_display_trait() {
        let settings = AgentSettings { base_dir: "/tmp".to_string(), ..Default::default() };
        assert_eq!(
            r"listen_address=127.0.0.1
            port=0
            base_dir=/tmp
            api_key=cf55f65...
            "
            .to_string()
            .replace(' ', ""),
            format!("{}", settings)
        );
    }

    #[test]
    fn test_make_settings() {
        // 1) apply defaults
        {
            let expected = AgentSettings::default();
            let actual = make_settings(&Args::parse_from(["agent", "start"])).unwrap();
            assert_eq!(expected, actual);
        }

        // 2) override with command line
        {
            let expected = AgentSettings { port: 1234, base_dir: "/test".to_string(), ..Default::default() };
            let actual =
                make_settings(&Args::parse_from(["agent", "--base-dir", "/test", "start", "--port", "1234"])).unwrap();
            assert_eq!(expected, actual);
        }

        // 3) override with config file
        {
            let app_dir = tempdir().unwrap();
            settings::set_app_dir(app_dir.path());
            let expected = AgentSettings {
                port: 1234,
                base_dir: "/test".to_string(),
                listen_address: "0.0.0.0".to_string(),
                api_key: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".to_string(),
                ..Default::default()
            };
            std::fs::write(
                app_dir.path().join(AGENT_CONF),
                r#"
                port="1234"
                base_dir="/test"
                listen_address="0.0.0.0"
                api_key="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            "#,
            )
            .unwrap();
            let actual = make_settings(&Args::parse_from(["agent", "start"])).unwrap();
            assert_eq!(expected, actual);
            fs::remove_dir_all(app_dir).unwrap();
        }

        // 4) override with config file and command line
        //    - command line overrides config file
        {
            let app_dir = tempdir().unwrap();
            settings::set_app_dir(app_dir.path());
            let expected = AgentSettings {
                port: 5678,
                listen_address: "0.0.0.0".to_string(),
                base_dir: get_base_dir(),
                api_key: "xxx".to_string(),
                ..Default::default()
            };
            std::fs::write(app_dir.path().join(AGENT_CONF), "port=1234").unwrap();
            let actual = make_settings(&Args::parse_from([
                "agent",
                "start",
                "--port",
                "5678",
                "--listen-address",
                "0.0.0.0",
                "--api-key",
                "xxx",
            ]))
            .unwrap();
            assert_eq!(expected, actual);
            fs::remove_dir_all(app_dir).unwrap();
        }

        // 5.1) invalid config file (invalid value)
        {
            let app_dir = tempdir().unwrap();
            settings::set_app_dir(app_dir.path());
            std::fs::write(app_dir.path().join(AGENT_CONF), "listen_address=127.0.0.X").unwrap();
            let actual = make_settings(&Args::parse_from(["agent", "start"]));
            assert!(actual.is_err());
            assert!(actual.unwrap_err().to_string().ends_with("unable to read the configuration file."));
            fs::remove_dir_all(app_dir).unwrap();
        }
        // 5.2) invalid config file (invalid entry)
        {
            let app_dir = tempdir().unwrap();
            settings::set_app_dir(app_dir.path());
            std::fs::write(app_dir.path().join(AGENT_CONF), "xyz").unwrap();
            let actual = make_settings(&Args::parse_from(["agent", "start"]));
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
