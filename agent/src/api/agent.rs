use crate::models::agent::AgentSettings;
use crate::resources::agent::load_drivers;
use crate::server::context::RequestContext;
use crate::server::notification_channel::NotificationChannel;
use crate::server::state::ServerState;
use crate::{api::error::ServerResult, models::agent::Agent};
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, State};
use axum::response::IntoResponse;
use axum::{extract::Json, routing::get, Router};
use futures::{sink::SinkExt, stream::StreamExt};
use std::net::SocketAddr;
use tracing::{debug, error, info, warn};
use uuid::Uuid; //allows to split the websocket stream into sender and receiver

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
    State(state): State<ServerState>,
    context: ServerResult<RequestContext>,
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    if let Ok(user_session) = context.and_then(|c| c.get_user_session()) {
        info!("Notification Channel opened by {}", addr);
        // finalize the upgrade process by returning upgrade callback.
        // we can customize the callback by sending additional info such as address.
        ws.on_upgrade(move |socket| handle_notification_channel(socket, state, user_session.get_id(), addr))
    } else {
        error!("Unauthorized Notification Channel opened by {}", addr);
        let err = crate::api::error::Error::Forbidden;
        err.into_response()
    }
}

/// Actual websocket state machine (one will be spawned per connection)
async fn handle_notification_channel(socket: WebSocket, state: ServerState, user_session_id: Uuid, from: SocketAddr) {
    let (sender, mut receiver) = socket.split();

    // Now that we have established the connection, we can create a new notification channel and make it available
    // in the user session.
    state.attach_notification_channel(user_session_id, NotificationChannel::new(sender));

    loop {
        // wait for a message
        match receiver.next().await {
            Some(Ok(message)) => match message {
                Message::Close(Some(CloseFrame { reason, code })) => {
                    info!("Closing Notification Channel with {} (code: {}, reason: {})", from, code, reason);
                    break;
                }
                _ => {
                    warn!("Unexpected message from {}: {:?}", from, message);
                }
            },
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

    // We are done with the connection, remove the notification channel from the user session.
    state.detach_notification_channel(user_session_id);
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
