use crate::models::agent::AgentSettings;
use crate::resources::agent::load_drivers;
use crate::server::state::ServerState;
use crate::{api::error::ServerResult, models::agent::Agent};
use axum::{extract::Json, routing::get, Router};

/// GET /agent
///
/// This endpoint is mostly used to check if the agent is running. No authentication is required but the API key must be
/// passed in the X-API-Key header.
///
/// Returns the agent version.
async fn get_agent() -> ServerResult<Json<Agent>> {
    let response = Agent { version: env!("CARGO_PKG_VERSION"), drivers: load_drivers()? };
    Ok(Json(response))
}

async fn get_agent_setting() -> ServerResult<Json<AgentSettings>> {
    // let response = settings::get_agent_settings();
    // Ok(Json(response))
    todo!()
}

pub fn routes(state: ServerState) -> Router {
    Router::new().route("/agent", get(get_agent)).with_state(state)
}

/// Create a router for the endpoints that requires authentication to be reached.
pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new().route("/agent/settings", get(get_agent_setting)).with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_agent() {
        let response = get_agent().await.unwrap();
        assert_eq!(response.0.version, env!("CARGO_PKG_VERSION"));
    }
}
