use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize)]
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
