use crate::api::error::ServerResult;
use crate::err_forbidden;
use crate::models;
use crate::models::QueryExecution;
use crate::models::QueryExecutionStatus;
use crate::resources::catalog;
use crate::server::context::RequestContext;
use crate::server::state::ServerState;
use crate::tasks::execute_queries_task;
use crate::{models::Connection, utils::user_error::UserError};
use axum::extract::Path;
use axum::extract::State;
use axum::{
    routing::{get, post},
    Json, Router,
};
use squill_drivers::futures::Connection as DriverConnection;
use squill_drivers::params;
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

async fn execute_buffer(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
    buffer: String,
) -> ServerResult<Json<Vec<models::QueryExecution>>> {
    let user_session = context?.get_user_session()?;
    let conn = state.get_agentdb_connection().await?;
    let connection: models::Connection = catalog::get(&conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }

    let mut queries: Vec<models::QueryExecution> = Vec::new();

    // Parse the SQL query
    let statements = loose_sqlparser::parse(&buffer);
    for statement in statements {
        match conn
            .query_map_row(
                r#"INSERT INTO query_history(query_history_id, connection_id, user_id, query)
                           VALUES(?, ?, ?, ?) RETURNING query_history_id, created_at"#,
                params!(Uuid::new_v4(), id, user_session.get_user_id(), statement.sql()),
                |row| {
                    Ok(QueryExecution {
                        id: row.try_get(0)?,
                        connection_id: id,
                        user_id: user_session.get_user_id(),
                        query: statement.sql().to_string(),
                        is_result_set_query: Some(statement.is_query()),
                        status: QueryExecutionStatus::Pending,
                        error: None,
                        executed_at: None,
                        created_at: row.try_get(1)?,
                        affected_rows: 0,
                        execution_time: 0.0,
                    })
                },
            )
            .await
        {
            Ok(Some(query_execution)) => queries.push(query_execution),
            Ok(None) => return Err(UserError::InternalError("Failed to insert query history".to_string()).into()),
            Err(e) => return Err(UserError::InternalError(e.to_string()).into()),
        }
    }

    // Create a new task to execute the queries & push it to the task queue
    // let task = QueryTask { queries: queries.clone(), state: state.0.clone(), session_id: user_session.get_id() };
    state
        .push_task({
            let queries = queries.clone();
            let state = state.0.clone();
            let session_id = user_session.get_id();
            Box::new(move || execute_queries_task(state, session_id, queries))
        })
        .await?;

    // All good, return the queries
    Ok(Json(queries))
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
        .route("/connections/:id/execute", post(execute_buffer))
        .with_state(state)
}
