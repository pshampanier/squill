use crate::json_enum;
use crate::models::drivers::Driver;
use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize)]
pub struct Agent {
    pub version: &'static str,
    pub drivers: Vec<Driver>,
}

json_enum!(LogLevel, Error, Warning, Info, Debug, Trace);

// #[derive(Serialize, Deserialize, PartialEq, Debug)]
#[derive(Serialize, Deserialize)]
#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct AgentSettings {
    /// The base directory used to store the files
    pub base_dir: String,

    /// Specifies the TCP/IP address on which the server is to listen for connections from client applications.
    /// The entry 0.0.0.0 allows listening for all IPv4 addresses.
    pub listen_address: String,

    /// The tcp/ip port to listen to
    pub port: u16,

    /// The API key used to authenticate the client applications.
    pub api_key: String,

    /// The maximum number of user sessions that can be stored in memory at a given point of time.
    pub max_user_sessions: usize,

    /// The maximum number of refresh tokens that can be stored in memory at a given point of time.
    pub max_refresh_tokens: usize,

    /// The number of seconds after which a security token will expire.
    /// This does not applies to the refresh token which only expires when it is evicted from the cache.
    pub token_expiration: std::time::Duration,

    /// Enable the logging collector to store the logs into log files.
    ///
    /// #default: false
    pub log_collector: bool,

    /// The location of the log file directory.
    pub log_dir: String,

    /// The log level to be used by the logging collector.
    /// Any log below this level will be ignored.
    ///
    /// #default: "Info"
    pub log_level: LogLevel,

    /// Set the value of the [Access-Control-Allow-Origin](https://mzl.la/3HIZBx5) header.
    ///
    /// The value of this header indicates what origin sites are allowed to access the resources of the server.
    /// #default: ["*"]
    pub cors_allowed_origins: Vec<String>,

    /// Set the value of the [Access-Control-Max-Age](https://mzl.la/4826hRC) header.
    ///
    /// #default: 86400
    pub cors_max_age: std::time::Duration,
}
