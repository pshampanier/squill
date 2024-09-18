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
    // 1) Update the query status to "running" and the start time of the execution
    let running_query = {
        let updated_status = QueryExecutionStatus::Running;
        let agentdb_conn = state.get_agentdb_connection().await?;
        match agentdb_conn
            .query_map_row(
                r#"UPDATE query_history 
                                SET executed_at = CURRENT_TIMESTAMP, status = ?
                              WHERE query_history_id=?
                          RETURNING executed_at"#,
                params!(updated_status.as_str(), query.id),
                |row| {
                    Ok(QueryExecution {
                        revision: query.revision + 1,
                        executed_at: Some(row.try_get(0)?),
                        status: updated_status,
                        ..query
                    })
                },
            )
            .await
        {
            Ok(Some(query)) => query,
            Ok(None) => return Ok(None),
            Err(e) => return Err(e.into()),
        }
    };
    // 2) Send a notification to the client that the query is running
    state.push_notification(session_id, running_query.clone()).await;

    /*
    // 3) Execute the query
    if running_query.is_result_set_query.unwrap_or(false) {
        //
        // The query is expected to return a result set
        //
        todo!("Implement the query execution for result set queries");
    } else {
        //
        // The query is expected to return a number of affected rows
        //
        todo!("Implement the query execution for non-result set queries");
    }
    */

    Ok(Some(running_query))
}
