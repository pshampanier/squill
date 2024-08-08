use crate::{ models::connections::Connection, utils::user_error::UserError };
use crate::api::error::ServerResult;
use crate::server::state::ServerState;
use axum::{ routing::{ get, post }, Json, Router };
use squill_drivers::futures::Connection as DriverConnection;

/// GET /connections/defaults
///
/// Create an new instance of a connection.
async fn get_connection_defaults() -> ServerResult<Json<Connection>> {
    Ok(Json(Connection::new("New Connection".to_string())))
}

/// POST /connections/test
///
/// Test if the connection is valid (can connect to the datasource).
async fn test_connection(Json(conn): Json<Connection>) -> ServerResult<()> {
    let uri = conn.to_uri()?;
    match DriverConnection::open(uri).await {
        Ok(_) => Ok(()),
        Err(e) => Err(UserError::InvalidParameter(e.to_string()).into()),
    }
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new()
        .route("/connections/defaults", get(get_connection_defaults))
        .route("/connections/test", post(test_connection))
        .with_state(state)
}
