use axum::{ extract::Json, routing::get, Router };
use crate::{ api::error::ServerResult, models::agent::Agent };
use crate::server::state::ServerState;

/// GET /agent
///
/// This endpoint is moslty used to check if the agent is running. No authentication is required but the API key must be
/// passed in the X-API-Key header.
///
/// Returns the agent version.
async fn get_agent() -> ServerResult<Json<Agent>> {
    let response = Agent {
        version: env!("CARGO_PKG_VERSION"),
    };
    Ok(Json(response))
}

pub fn routes(state: ServerState) -> Router {
    Router::new().route("/agent", get(get_agent)).with_state(state)
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
