use crate::api::error::ServerResult;
use crate::err_forbidden;
use crate::err_param;
use crate::models;
use crate::models::Connection;
use crate::resources;
use crate::resources::catalog;
use crate::resources::queries;
use crate::server::contexts::RequestContext;
use crate::server::state::ServerState;
use crate::tasks::execute_queries_task;
use crate::utils::user_error::UserError;
use arrow_array::RecordBatch;
use arrow_ipc::writer::StreamWriter;
use axum::debug_handler;
use axum::extract::Query;
use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::http::HeaderName;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{Json, Router};
use common::constants::X_REQUEST_ORIGIN;
use serde::Deserialize;
use squill_drivers::futures::Connection as DriverConnection;
use std::io::Cursor;
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
    headers: HeaderMap,
    buffer: String,
) -> ServerResult<Json<Vec<models::QueryExecution>>> {
    let user_session = context?.get_user_session()?;
    let conn = state.get_agentdb_connection().await?;
    let connection: models::Connection = catalog::get(&conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }
    let origin = match headers
        .get(HeaderName::from_static(X_REQUEST_ORIGIN))
        .and_then(|o| o.to_str().ok())
        .filter(|o| !o.is_empty())
    {
        Some(o) => Ok::<_, UserError>(o.to_string()),
        None => Err(err_param!("HTTP header '{}' is missing.", X_REQUEST_ORIGIN)),
    }?;

    let mut queries: Vec<models::QueryExecution> = Vec::new();

    // Parse the SQL query
    let statements = loose_sqlparser::parse(&buffer);
    for statement in statements {
        // Insert the query into the database
        queries.push(
            resources::queries::create(
                &conn,
                id,
                &origin,
                user_session.get_user_id(),
                &statement.sql().to_string(),
                statement.is_query(),
            )
            .await?,
        );
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
async fn test_connection(state: State<ServerState>, Json(conn): Json<Connection>) -> ServerResult<()> {
    let jinja_env = state.get_jinja_env(&conn.driver);
    let uri = jinja_env.render_template("uri", &conn)?;
    match DriverConnection::open(uri).await {
        Ok(_) => Ok(()),
        Err(e) => Err(UserError::InvalidParameter(e.to_string()).into()),
    }
}

#[derive(Deserialize)]
struct PaginationParams {
    offset: Option<usize>,
    limit: Option<usize>,
}

/// GET /connections/{id}/history/{query_id}/data?offset=0&limit=1000
///
/// Get a connection from its identifier.
#[debug_handler]
async fn get_history_data(
    state: State<ServerState>,
    Path((id, query_history_id)): Path<(Uuid, Uuid)>,
    Query(params): Query<PaginationParams>,
) -> ServerResult<Response> {
    let conn = state.get_agentdb_connection().await?;
    let record_batches = queries::read_history_data(
        &conn,
        id,
        query_history_id,
        params.offset.unwrap_or(0),
        params.limit.unwrap_or(1000),
    )
    .await?;

    // Serialize the RecordBatch into IPC format
    let body = ipc_serialize(record_batches)?;

    let response = Response::builder()
        .status(axum::http::StatusCode::OK)
        .header(axum::http::header::CONTENT_TYPE, "application/vnd.apache.arrow.stream")
        .body(body.into());

    response.map_err(|e| e.into())
}

fn ipc_serialize(record_batches: Vec<RecordBatch>) -> anyhow::Result<Vec<u8>> {
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut writer = StreamWriter::try_new(&mut buffer, &record_batches[0].schema())?;
        for batch in record_batches {
            writer.write(&batch)?;
        }
        writer.finish()?;
    }

    Ok(buffer.into_inner())
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new()
        .route("/connections/defaults", get(get_connection_defaults))
        .route("/connections/test", post(test_connection))
        .route("/connections/:id", get(get_connection))
        .route("/connections/:id/execute", post(execute_buffer))
        //         .route("/connections/:id/history", post(list_history))
        .route("/connections/:id/history/:query_history_id/data", get(get_history_data))
        .with_state(state)
}
