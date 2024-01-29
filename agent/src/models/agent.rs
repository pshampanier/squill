use serde::{ Serialize, Deserialize };

/// Default address used to serve the API.
const DEFAULT_LISTEN_ADDRESS: &str = "127.0.0.1";

/// Default port used to serve the API.
/// The default port is 0 which means that the OS will choose a free port.
const DEFAULT_PORT: u16 = 0;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub version: &'static str,
}

// #[derive(Serialize, Deserialize, PartialEq, Debug)]
#[derive(Serialize, Deserialize)]
#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct AgentSettings {
    /// The base directory used to store the files
    pub base_dir: String,

    /// Specifies the TCP/IP address on which the server is to listen for connections from client applications.
    /// The entry 0.0.0.0 allows listening for all IPv4 addresses.
    pub listen_address: String,

    /// The tcpip port to listen to
    pub port: u16,

    /// The API key used to authenticate the client applications.
    pub api_key: String,

    /// The maximum number of user sessions that can be stored in memory at a given point of time.
    pub max_user_sessions: usize,

    /// The maximum number of refresh tokens that can be stored in memory at a given point of time.
    pub max_refresh_tokens: usize,

    /// The number of seconds after which a security token will expire.
    /// This does not applies to the refresh token which only expires when it is evicted from the cache.
    pub token_expiration: u32,
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            listen_address: DEFAULT_LISTEN_ADDRESS.to_string(),
            port: DEFAULT_PORT,
            base_dir: ".".to_string(),
            api_key: "".to_string(),
            max_user_sessions: 100,
            max_refresh_tokens: 100,
            token_expiration: 3600,
        }
    }
}
