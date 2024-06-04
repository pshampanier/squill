use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct AgentEndpoint {
    /// The URL of the agent
    pub url: String,

    /// The API key used to authenticate the client applications.
    pub api_key: String,
}
