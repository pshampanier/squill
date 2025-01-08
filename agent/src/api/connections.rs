use crate::api::error::ServerResult;
use crate::err_forbidden;
use crate::models;
use crate::models::connections::Datasource;
use crate::models::connections::RunRequest;
use crate::models::queries::QueryHistoryPage;
use crate::models::scheduled_tasks::ScheduledTaskName;
use crate::resources;
use crate::resources::catalog;
use crate::server::contexts::RequestContext;
use crate::server::state::ServerState;
use crate::settings;
use crate::tasks::execute_queries_task;
use crate::utils::user_error::UserError;
use arrow_array::RecordBatch;
use arrow_ipc::writer::StreamWriter;
use axum::extract::Query;
use axum::extract::{Path, State};
use axum::response::Response;
use axum::routing::delete;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use squill_drivers::async_conn::Connection;
use std::hash::DefaultHasher;
use std::hash::Hash;
use std::hash::Hasher;
use std::io::Cursor;
use uuid::Uuid;

/// GET /connections/defaults
///
/// Create an new instance of a connection.
async fn get_connection_defaults(context: ServerResult<RequestContext>) -> ServerResult<Json<models::Connection>> {
    let user_session = context?.get_user_session()?;
    Ok(Json(models::Connection::new(user_session.get_user_id(), "New Connection".to_string())))
}

/// GET /connections/:id
///
/// Get a connection from its identifier.
async fn get_connection(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
) -> ServerResult<Json<models::Connection>> {
    let user_session = context?.get_user_session()?;
    let mut conn = state.get_agentdb_connection().await?;
    let connection: models::Connection = catalog::get(&mut conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }
    Ok(Json(connection))
}

/// DELETE /connections/:id
///
/// Delete a connection from its identifier.
async fn delete_connection(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
) -> ServerResult<()> {
    let user_session = context?.get_user_session()?;

    // We want to limit the scope of `conn` to the block where it is used...
    {
        let mut conn = state.get_agentdb_connection().await?;
        let connection = catalog::get::<models::Connection>(&mut conn, id).await?;
        if connection.owner_user_id != user_session.get_user_id() {
            return Err(err_forbidden!("You are not allowed to access this connection."));
        }
        // Flag the connection and running queries for deletion.
        connection.delete(&mut conn).await
    }?;

    // Schedule the vacuum task to run immediately
    state.push_scheduled_task(ScheduledTaskName::Vacuum, Uuid::nil(), None).await?;
    Ok(())
}

/// POST /connections/:id/queries/run
///
/// Run the queries provided in the request body.
async fn run_queries(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
    Json(request_body): Json<RunRequest>,
) -> ServerResult<Json<Vec<models::QueryExecution>>> {
    let user_session = context?.get_user_session()?;
    let mut conn = state.get_agentdb_connection().await?;
    let connection: models::Connection = catalog::get(&mut conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }

    let mut queries: Vec<models::QueryExecution> = Vec::new();

    // Parse the SQL query
    let statements = loose_sqlparser::parse(&request_body.buffer);
    for statement in statements {
        // Generate a hash of the statement
        let mut hasher = DefaultHasher::new();
        statement.hash(&mut hasher);

        // Insert the query into the database
        queries.push(
            resources::queries::create(
                &mut conn,
                id,
                &request_body.datasource,
                &request_body.origin,
                user_session.get_user_id(),
                models::queries::Query {
                    text: statement.sql().to_string(),
                    hash: hasher.finish(),
                    with_result_set: statement.is_query(),
                },
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
            let datasource = request_body.datasource.clone();
            Box::new(move || execute_queries_task(state, session_id, connection.id, datasource, queries))
        })
        .await?;

    // All good, return the queries
    Ok(Json(queries))
}

/// POST /connections/validate
///
/// Check the validity of a connection definition.
///
/// The connection definition is validate by the agent to ensure that the connection can be established.
/// If the connection can be established the agent will return the connection information including the default
/// datasource and all other datasources available for the connection.
async fn validate_connection(
    state: State<ServerState>,
    Json(conn_def): Json<models::Connection>,
) -> ServerResult<Json<models::Connection>> {
    let jinja_env = state.get_jinja_env(&conn_def.driver);
    let uri = jinja_env.render_template("uri", &conn_def)?;
    match Connection::open(uri).await {
        Ok(mut conn) => {
            // We've successfully connected to the database, let's get the connection info and the datasources.
            // We don't take the list of datasources as given by list_datasources() because we want to keep the
            // hidden flag from the connection definition (if any).
            let conn_info = conn_def.get_info(&mut conn, &jinja_env).await?;
            let conn_datasources = conn_def.list_datasources(&mut conn, &jinja_env).await?;
            Ok(Json(models::Connection {
                default_datasource: conn_info.current_datasource,
                datasources: conn_datasources
                    .into_iter()
                    .map(|ds| Datasource {
                        name: ds.name.clone(),
                        description: ds.description,
                        size_in_bytes: ds.size_in_bytes,
                        hidden: conn_def
                            .datasources
                            .iter()
                            .find(|prev_ds| prev_ds.name == ds.name)
                            .map(|d| d.hidden)
                            .unwrap_or(false),
                    })
                    .collect(),
                ..conn_def
            }))
        }
        Err(e) => Err(UserError::InvalidParameter(e.to_string()).into()),
    }
}

/// GET /connections/{id}/datasources:
///
/// List the datasources available on a connection.
/// TODO: Finalize the implementation.
async fn list_datasources(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
) -> ServerResult<Json<Vec<Datasource>>> {
    let user_session = context?.get_user_session()?;
    let mut conn = state.get_agentdb_connection().await?;

    let conn_def: models::Connection = catalog::get(&mut conn, id).await?;
    if conn_def.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }

    let jinja_env = state.get_jinja_env(&conn_def.driver);
    Ok(Json(conn_def.list_datasources(&mut conn, &jinja_env).await?))
}

#[derive(Deserialize)]
struct ListHistoryParameters {
    origin: String,
    datasource: String,
    offset: Option<String>,
}

/// GET /connections/{id}/history:
///
/// List the history of queries executed on a connection.
/// TODO: Implement pagination.
async fn list_history(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(id): Path<Uuid>,
    Query(params): Query<ListHistoryParameters>,
) -> ServerResult<Json<QueryHistoryPage>> {
    let user_session = context?.get_user_session()?;
    let origin = params.origin;
    let datasource = params.datasource;
    let mut conn = state.get_agentdb_connection().await?;
    let limit = settings::get_max_query_history_fetch_size();
    let (queries, next_page) = resources::queries::list_history(
        &mut conn,
        id,
        user_session.get_user_id(),
        origin,
        datasource,
        params.offset,
        limit,
    )
    .await?;
    Ok(Json(QueryHistoryPage { queries, next_page: next_page.unwrap_or_default() }))
}

#[derive(Deserialize)]
struct QueryHistoryDataParams {
    offset: Option<usize>,
    limit: Option<usize>,
}

/// GET /connections/{id}/queries/{query_id}/data?offset=0&limit=1000
///
/// Get the data of the query execution.
async fn get_query_data(
    state: State<ServerState>,
    Path((id, query_id)): Path<(Uuid, Uuid)>,
    Query(params): Query<QueryHistoryDataParams>,
) -> ServerResult<Response> {
    let mut conn = state.get_agentdb_connection().await?;
    let record_batches = resources::queries::read_data(
        &mut conn,
        id,
        query_id,
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

/// IPC serialization helper function
fn ipc_serialize(record_batches: Vec<RecordBatch>) -> anyhow::Result<Vec<u8>> {
    let mut buffer = Cursor::new(Vec::new());
    if !record_batches.is_empty() {
        let schema = record_batches[0].schema();
        let mut writer = StreamWriter::try_new(&mut buffer, &schema)?;
        for batch in record_batches {
            writer.write(&batch)?;
        }
        writer.finish()?;
    }
    Ok(buffer.into_inner())
}

/// DELETE /connections/{id}/queries/{query_id}
///
/// Delete a query execution.
async fn delete_query(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path((id, query_id)): Path<(Uuid, Uuid)>,
) -> ServerResult<()> {
    let user_session = context?.get_user_session()?;
    let mut conn = state.get_agentdb_connection().await?;

    let connection: models::Connection = catalog::get(&mut conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }

    resources::queries::delete(&mut conn, id, query_id).await?;
    Ok(())
}

/// GET /connections/{id}/queries/{query_id}
///
/// Load the query (only the query definition without the data).
async fn get_query(
    state: State<ServerState>,
    context: ServerResult<RequestContext>,
    Path((id, query_id)): Path<(Uuid, Uuid)>,
) -> ServerResult<Json<models::QueryExecution>> {
    let user_session = context?.get_user_session()?;
    let mut conn = state.get_agentdb_connection().await?;

    let connection: models::Connection = catalog::get(&mut conn, id).await?;
    if connection.owner_user_id != user_session.get_user_id() {
        return Err(err_forbidden!("You are not allowed to access this connection."));
    }

    match resources::queries::get(&mut conn, id, query_id).await? {
        Some(query) => Ok(Json(query)),
        None => Err(UserError::NotFound("Query not found".to_string()).into()),
    }
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new()
        .route("/connections/defaults", get(get_connection_defaults))
        .route("/connections/validate", post(validate_connection))
        .route("/connections/:id", get(get_connection))
        .route("/connections/:id", delete(delete_connection))
        .route("/connections/:id/datasources", get(list_datasources))
        .route("/connections/:id/history", get(list_history))
        .route("/connections/:id/queries/run", post(run_queries))
        .route("/connections/:id/queries/:query_id", get(get_query))
        .route("/connections/:id/queries/:query_id", delete(delete_query))
        .route("/connections/:id/queries/:query_id/data", get(get_query_data))
        .with_state(state)
}
