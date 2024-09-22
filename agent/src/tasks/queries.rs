use std::time::Instant;

use crate::models::queries::QueryExecutionError;
use crate::models::QueryExecutionStatus;
use crate::Result;
use crate::{models::QueryExecution, server::state::ServerState};
use futures::future::BoxFuture;
use squill_drivers::params;
use tracing::{debug, error};

/// This function is used to execute the queries in the background.
///
/// It will update the status of the query and send a notification to the client via the notification channel.
/// The query is also updated in the `query_history` table. It may happen that the user delete the query or clear the
/// history. If this happen, the query execution is suspended and the query is skipped.
pub fn execute_queries_task(
    state: ServerState,
    session_id: uuid::Uuid,
    queries: Vec<QueryExecution>,
) -> BoxFuture<'static, Result<()>> {
    Box::pin(async move {
        for query in queries {
            match execute_query(state.clone(), session_id, query.clone()).await {
                Ok(Some(query)) => {
                    debug!("The query execution with id {} was successful", query.id);
                }
                Ok(None) => {
                    debug!("The query execution with id {} cannot be completed. Skipping...", query.id);
                }
                Err(e) => {
                    error!("The query execution with id {} failed (reason: {})", query.id, e);
                }
            };
        }
        Ok(())
    })
}

/// Execute a query and return an updated version of the [QueryExecution].
///
/// In some cases the query execution may not be possible, in such cases the function will return `Ok(None)` meaning
/// that the query execution was not completed but at the user request. If the query execution was successful, the
/// function will return `Ok(Some(QueryExecution))` with the updated query. Otherwise, the function will return an error.
async fn execute_query(
    state: ServerState,
    session_id: uuid::Uuid,
    query: QueryExecution,
) -> Result<Option<QueryExecution>> {
    if let Some(query) =
        update_query_history(&state, session_id, QueryExecution { status: QueryExecutionStatus::Running, ..query })
            .await?
    {
        let conn = state.get_user_db_connection(query.connection_id).await?;
        let start_time = Instant::now(); // Record the start time of the query execution
        if query.is_result_set_query.unwrap_or(false) {
            //
            // The query is expected to return a result set
            //
            todo!("Implement the query execution for result set queries");
        } else {
            //
            // The query is expected to return a number of affected rows
            //
            match conn.execute(query.query.as_str(), None).await {
                Ok(affected_rows) => {
                    let execution_time = start_time.elapsed().as_secs_f64();
                    return update_query_history(
                        &state,
                        session_id,
                        QueryExecution {
                            status: QueryExecutionStatus::Completed,
                            affected_rows,
                            execution_time,
                            ..query
                        },
                    )
                    .await;
                }
                Err(e) => {
                    let query = QueryExecution { status: QueryExecutionStatus::Failed, error: Some(e.into()), ..query };
                    return update_query_history(&state, session_id, query).await;
                }
            }
        }
    }

    Ok(None)
}

/// Update the query history with given query.
///
/// A notification is sent to the client if the query was successfully updated.
///
/// # Returns
/// - `Ok(Some(QueryExecution))` if the query was updated successfully.
/// - `Ok(None)` if the query was not updated because the user deleted the query or cleared the history.
/// - `Err(e)` if an error occurred while updating the query.
async fn update_query_history(
    state: &ServerState,
    session_id: uuid::Uuid,
    query: QueryExecution,
) -> Result<Option<QueryExecution>> {
    // The `affected_rows` is stored in memory as a `u64` but in the database it is stored as a `i64` because of sqlite
    // limitations. It doesn't really matter since the number of affected rows should always be less than `i64::MAX`.
    let (execution_time, affected_rows, error) = match query.status {
        QueryExecutionStatus::Completed => (Some(query.execution_time), Some(query.affected_rows as i64), None),
        QueryExecutionStatus::Failed => (None, None, Some(serde_json::to_string(&query.error)?)),
        _ => (None, None, None),
    };
    let agentdb_conn = state.get_agentdb_connection().await?;
    match agentdb_conn
        .query_map_row(
            r#"UPDATE query_history 
                                SET executed_at = COALESCE(executed_at, CURRENT_TIMESTAMP),
                                    status = ?,
                                    error = COALESCE(error, ?),
                                    execution_time = COALESCE(execution_time, ?),
                                    affected_rows = COALESCE(?, affected_rows)
                              WHERE query_history_id=?
                          RETURNING executed_at"#,
            params!(query.status.as_str(), error, execution_time, affected_rows, query.id),
            |row| Ok(QueryExecution { revision: query.revision + 1, executed_at: Some(row.try_get(0)?), ..query }),
        )
        .await
    {
        Ok(Some(query)) => {
            // Send a notification to the client that the query is running
            state.push_notification(session_id, query.clone()).await;
            Ok(Some(query))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Convert a `squill_drivers::Error` into a `QueryExecutionError`.
///
/// FIXME: This function should be improved to provide more detailed information about the error.
/// FIXME: For example, the line and column where the error occurred.
///
/// - **Oracle**: `ERROR at line 1:\n ORA-00942: table or view does not exist`
/// - **PostgreSQL**: `LINE 1: SELECT 23 FROM XX;`
/// - **DuckDB**: `LINE 1: SELECT 23 FROM XX;`
/// - **MySQL**: `...the right syntax to use near 'SELECT 23 FROM XX' at line 1`
/// - **SQLite**: No line number in error message
/// - **SQL Server**: `Msg 208, Level 16, State 1, Line 1\nInvalid object name 'XX'.`
/// - **DB2**: `SQL0204N "XX" is an undefined name. SQLSTATE=42704 at line 1`
/// - **MariaDB**: `You have an error in your SQL syntax; ... 'SELECT 23 FROM XX' at line 1`
/// - **Informix**: `SQL -206: The specified table (XX) is not in the database.\nError occurs on line 1.`
/// - **Firebird**: `Dynamic SQL Error\nSQL error code = -204\nTable unknown\nXX\nAt line 1, column 15`
/// - **Sybase**: `SQL Anywhere Error -141: Invalid SQL syntax near 'SELECT 23 FROM XX' on line 1`
impl From<squill_drivers::Error> for QueryExecutionError {
    fn from(e: squill_drivers::Error) -> Self {
        QueryExecutionError { message: e.to_string(), line: None, column: None }
    }
}
