use crate::api::error::ServerResult;
use crate::err_forbidden;
use crate::models;
use crate::resources::catalog;
use crate::server::context::RequestContext;
use crate::server::state::ServerState;
use crate::{models::Connection, utils::user_error::UserError};
use axum::extract::Path;
use axum::extract::State;
use axum::{
    routing::{get, post},
    Json, Router,
};
use squill_drivers::futures::Connection as DriverConnection;
use uuid::Uuid;

/// GET /connections/defaults
///
/// Create an new instance of a connection.
async fn get_connection_defaults(context: ServerResult<RequestContext>) -> ServerResult<Json<Connection>> {
    let user_session = context?.get_user_session()?;
    Ok(Json(Connection::new(user_session.get_user_id(), "New Connection".to_string())))
}

/// GET /connections/:id
///
/// Get a connection from its identifier.
async fn get_connection(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
) -> ServerResult<Json<Connection>> {
    let user_session = context?.get_user_session()?;
    let conn = state.get_agentdb_connection().await?;
    let connection: models::Connection = catalog::get(&conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }
    Ok(Json(connection))
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
        .route("/connections/:id", get(get_connection))
        .with_state(state)
}
