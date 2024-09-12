use crate::models::agent::AgentSettings;
use crate::resources::agent::load_drivers;
use crate::server::state::ServerState;
use crate::{api::error::ServerResult, models::agent::Agent};
use axum::extract::ws::{WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, State};
use axum::response::IntoResponse;
use axum::{extract::Json, routing::get, Router};
use std::net::SocketAddr;
use tracing::{debug, error, info, warn};

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

/// The handler for the HTTP request (this gets called when the HTTP GET lands at the start
/// of websocket negotiation). After this completes, the actual switching from HTTP to
/// websocket protocol will occur.
/// This is the last point where we can extract TCP/IP metadata such as IP address of the client
/// as well as things from HTTP headers such as user-agent of the browser etc.
async fn ws_handler(
    state: State<ServerState>,
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    info!("Notification Channel opened by {}", addr);
    // finalize the upgrade process by returning upgrade callback.
    // we can customize the callback by sending additional info such as address.
    ws.on_upgrade(move |socket| handle_socket(socket, addr))
}

/// Actual websocket state machine (one will be spawned per connection)
async fn handle_socket(mut socket: WebSocket, from: SocketAddr) {
    loop {
        // wait for a message
        match socket.recv().await {
            Some(Ok(message)) => {
                warn!("Unexpected message from {}: {:?}", from, message);
            }
            Some(Err(e)) => {
                error!("Error receiving message, closing the Notification Channel with {}. {:?}", from, e);
                break;
            }
            None => {
                debug!("Notification Channel closed by {}", from);
                break;
            }
        };
    }
}

pub fn routes(state: ServerState) -> Router {
    Router::new().route("/agent", get(get_agent)).with_state(state)
}

/// Create a router for the endpoints that requires authentication to be reached.
pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new().route("/agent/settings", get(get_agent_setting)).route("/ws", get(ws_handler)).with_state(state)
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
