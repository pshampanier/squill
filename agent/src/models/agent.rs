use serde::{ Serialize, Deserialize };

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub version: &'static str,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSettings {
    /// The maximum number of user sessions that can be stored in memory at a given point of time.
    pub max_user_sessions: usize,

    /// The number of seconds after which a security token will expire.
    pub token_expiration: u32,
}

impl Default for AgentSettings {
    fn default() -> Self {
        Self {
            max_user_sessions: 100,
            token_expiration: 3600,
        }
    }
}
