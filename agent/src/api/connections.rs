use crate::models::connections::Connection;
use crate::api::error::ServerResult;
use crate::server::state::ServerState;
use axum::{ routing::get, Json, Router };

/// GET /connections/new
///
/// Create an new instance of a connection.
async fn new_connection() -> ServerResult<Json<Connection>> {
    Ok(Json(Connection::new("New Connection".to_string())))
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new().route("/connections/new", get(new_connection)).with_state(state)
}
