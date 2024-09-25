use crate::models::queries::QueryExecutionError;
use crate::models::QueryExecutionStatus;
use crate::server::notification_channels::PushNotificationService;
use crate::tasks::statistics::collect_record_batch_stats;
use crate::tasks::statistics::{merge_column_stats, ColumnStats};
use crate::utils::constants::USER_HISTORY_DIRNAME;
use crate::utils::parquet::RecordBatchWriter;
use crate::{models::QueryExecution, server::state::ServerState};
use crate::{settings, Result};
use anyhow::anyhow;
use arrow_array::RecordBatch;
use futures::future::BoxFuture;
use futures::StreamExt;
use parquet::basic::Compression;
use parquet::file::properties::WriterProperties;
use squill_drivers::futures::Connection;
use squill_drivers::params;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use tracing::{debug, error};
use uuid::Uuid;

// ┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
// │                                                CLIENT                                                │
// └─────┬──────────────────────────────────────────────────────────────────────────▲─────────────────────┘
//       │(1) POST /connections/:id/execute                                         │(5) Push Notification
//       │                                                                          │
//       │                                                                          │
//       │                                 ┌────────────────┐               ┌───────┴───────┐
//       │                   ┌─────────────▶ COMPUTE STATS  ├───────────────┼─▶███████████  │
//       │                   │             └────────────────┘        ┌──────┼─▶███████████  │
//       │                   │             ┌────────────────┐        ├──────┼─▶███████████  │
//       │                   ├─────────────▶ COMPUTE STATS  ├────────┼──────┼─▶███████████  │
//       │                   │             └────────────────┘        │      │               │
//       │                   │             ┌────────────────┐        │      │               │
// ┌─────▼─────┐             ├─────────────▶ COMPUTE STATS  │────────┤      │               │
// │   QUERY   ├─────────────┤             └───────┬────────┘        │      │               │
// └───────────┘             │                                       │      │    WRITER     │
// (2) execute_queries_task()│                     │                 │      └───────┬───────┘
//                           │                                       │              │
//                           │                     │                 │              │
//                           │             ┌────────────────┐        │      ┌───────▼───────┐
//                           └─────────────▶ COMPUTE STATS  │────────┘      │     DISK      │
//                                         └────────────────┘               └───────────────┘
//
//                                   (3) compute_statistics_task()       (4) write_query_result()
//

struct PipelinedRecordBatch {
    offset: usize,
    record_batch: RecordBatch,
    columns_stats: Vec<Option<Box<dyn ColumnStats>>>,
}

enum QueryPipelineMessage {
    RecordBatch(PipelinedRecordBatch),
    AffectedRows(usize),
}

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

fn compute_statistics_task(
    tx: mpsc::Sender<QueryPipelineMessage>,
    offset: usize,
    record_batch: RecordBatch,
) -> BoxFuture<'static, Result<()>> {
    Box::pin(async move {
        let columns_stats = collect_record_batch_stats(&record_batch);
        tx.send(QueryPipelineMessage::RecordBatch(PipelinedRecordBatch { offset, record_batch, columns_stats }))
            .await?;
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
        let query = match {
            if query.is_result_set_query.unwrap_or(false) {
                //
                // The query is expected to return a result set
                //
                execute_result_set_query(state.clone(), session_id, &conn, query.clone()).await
            } else {
                //
                // The query is expected to return a number of affected rows
                //
                execute_non_result_set_query(&conn, query.clone()).await
            }
        } {
            Ok(query) => {
                let execution_time = start_time.elapsed().as_secs_f64();
                QueryExecution { status: QueryExecutionStatus::Completed, execution_time, ..query }
            }
            Err(e) => QueryExecution { status: QueryExecutionStatus::Failed, error: Some(e.into()), ..query },
        };
        update_query_history(&state, session_id, query.clone()).await?;
        Ok(Some(query))
    } else {
        Ok(None)
    }
}

/// Execute a query that is not expected to provide a result set.
///
/// This function returns the updated [QueryExecution].
async fn execute_non_result_set_query(conn: &Connection, query: QueryExecution) -> Result<QueryExecution> {
    let affected_rows = conn.execute(query.query.as_str(), None).await?;
    Ok(QueryExecution { status: QueryExecutionStatus::Completed, affected_rows, ..query })
}

async fn execute_result_set_query(
    state: ServerState,
    session_id: uuid::Uuid,
    conn: &Connection,
    query: QueryExecution,
) -> Result<QueryExecution> {
    let mut stmt = conn.prepare(query.query.as_str()).await?;
    let mut stream = stmt.query().await?;

    // A message channel used to send the RecordBatch with statistics of the query to the writer task.
    // The size of that queue must be at least as large as the maximum number of tasks that can be executed concurrently
    // by the agent because the agent general purpose task queue is used to execute the statistics collector task that
    // is feeding this channel and we don't want to block the agent task queue because this channel is full.
    let (tx, rx) = mpsc::channel::<QueryPipelineMessage>(settings::get_max_task_queue_size());

    // Spawn a task to write the result set into parquet files & send a notifications to the client
    let writer_task = tokio::task::spawn(write_query_result(state.clone(), session_id, rx, query.id));

    // Read the record batches from the stream and send then to the stats collector task
    match {
        let mut affected_rows: u64 = 0;
        while let Some(record_batch) = stream.next().await {
            let record_batch = record_batch?;
            let num_rows = record_batch.num_rows();
            // send the record batch to to a stats collector task which once done will send the stats and the record batch
            // to the writer task
            state
                .push_task({
                    let tx = tx.clone();
                    let offset = affected_rows as usize;
                    Box::new(move || compute_statistics_task(tx, offset, record_batch))
                })
                .await?;
            affected_rows += num_rows as u64;
        }
        // The query execution was successful, we need to communicate the number of affected rows to the writer task
        // in order to know when to stop writing the record batches to disk.
        tx.send(QueryPipelineMessage::AffectedRows(affected_rows as usize)).await?;
        Ok::<u64, anyhow::Error>(affected_rows)
    } {
        Ok(affected_rows) => {
            // Wait for the writer task to complete
            // We are ignoring the result of the writer task because we are only interested in the error if any.
            let _ = writer_task.await?;
            Ok(QueryExecution { status: QueryExecutionStatus::Completed, affected_rows, ..query })
        }
        Err(e) => {
            // The query execution failed, we need to cancel the writer task
            writer_task.abort();
            Err(e)
        }
    }
}

/// Collect the batch records with their statistics and write them to disk.
///
/// Batch records are received from the `rx` channel and are written to disk after being reorder if necessary.
/// The format used to write the batch records is [parquet](https://parquet.apache.org/) and the number of files may
/// vary on the number of batches received. The first file is expected to contains the first rows of the query result.
/// Files are named `{query_id}.{file_index}.{first_row_num}_{last_row_num}.parquet`.
async fn write_query_result(
    state: ServerState,
    session_id: Uuid,
    mut rx: mpsc::Receiver<QueryPipelineMessage>,
    query_id: Uuid,
) -> Result<()> {
    // The number of rows that are expected to be processed.
    // This is used to detect when all the rows have been processed and will be known when the message variant
    // `AffectedRows` is received.
    let mut expected_rows: Option<usize> = None;

    // The number of rows that have been processed.
    // Does not include the rows that are still pending to be written to disk.
    let mut processed_rows: usize = 0;

    // The batches that are still pending to be written to disk.
    // The vector is kept sorted by the offset of the batch.
    struct PendingBatch {
        offset: usize,
        record_batch: RecordBatch,
    }
    let mut pending_batches: Vec<PendingBatch> = vec![];

    // The statistics of the columns of the record batches.
    // This is a merge of the statistics from all the record batches written to disk so far.
    let mut columns_stats: Vec<Option<Box<dyn ColumnStats>>> = vec![];

    // The status of the query should not be updated too frequently. We will update the status no more than once every
    // second.
    let refresh_interval = Duration::from_secs(1);
    let mut last_status_update = Instant::now();

    let history_dir = state
        .get_user_session(session_id)
        .ok_or_else(|| anyhow!("User session no longer available, operation aborted."))
        .map(|user_session| settings::get_app_dir().join(user_session.get_username()).join(USER_HISTORY_DIRNAME))?;

    let mut record_batch_writer = RecordBatchWriter::new(
        WriterProperties::builder().set_compression(Compression::SNAPPY).build(),
        history_dir.join(query_id.to_string()),
        settings::get_initial_query_fetch_size(),
        settings::get_max_rows_per_history_file(),
    );

    while let Some(message) = rx.recv().await {
        match message {
            QueryPipelineMessage::RecordBatch(new_batch) => {
                //
                // New batch ready
                //
                merge_column_stats(&mut columns_stats, &new_batch.columns_stats)?;

                // Batches are not guaranteed to be received in the correct order. We need to sort them before writing
                // them to disk.
                pending_batches.insert(
                    pending_batches.binary_search_by(|batch| batch.offset.cmp(&new_batch.offset)).unwrap_or_else(|i| i),
                    PendingBatch { offset: new_batch.offset, record_batch: new_batch.record_batch },
                );

                while !pending_batches.is_empty() && pending_batches[0].offset == processed_rows {
                    // The batch is ready to be written to disk
                    let record_batch = pending_batches.remove(0).record_batch;
                    record_batch_writer.write_record_batch(&record_batch).await?;
                    processed_rows += record_batch.num_rows();
                }

                if pending_batches.is_empty() && Some(processed_rows) == expected_rows {
                    // All the rows have been processed
                    break;
                }

                if last_status_update.elapsed() > refresh_interval {
                    // Update the status of the query execution
                    // update_query_history(&state, session_id, QueryExecution { status, ..query_id }).await?;
                    last_status_update = Instant::now();
                }
            }
            QueryPipelineMessage::AffectedRows(affected_rows) => {
                //
                // The query execution was successful and we now know the number of affected rows
                //
                if affected_rows == processed_rows {
                    // All the rows have been processed
                    break;
                }
                expected_rows = Some(affected_rows);
            }
        }
    }

    // Close the writer to make sure all the rows have been written to disk.
    record_batch_writer.close().await?;

    Ok(())
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
impl From<anyhow::Error> for QueryExecutionError {
    fn from(e: anyhow::Error) -> Self {
        QueryExecutionError { message: e.to_string(), line: None, column: None }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use crate::{server::state::ServerState, utils::tests};
    use arrow_array::{Int32Array, StringArray};
    use arrow_schema::{DataType, Field, Schema};
    use tokio::sync::mpsc;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_write_query_result() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let state = ServerState::new(conn_pool);
        let _ = state.start().await;
        let (tx, rx) = mpsc::channel::<QueryPipelineMessage>(10);
        let session_id = Uuid::nil();
        let query_id = Uuid::nil();
        let writer_task = tokio::task::spawn(write_query_result(state.clone(), session_id, rx, query_id));

        let schema = Arc::new(Schema::new(vec![
            Field::new("a", DataType::Int32, false),
            Field::new("b", DataType::Utf8, false),
        ]));

        tx.send(QueryPipelineMessage::RecordBatch(PipelinedRecordBatch {
            offset: 0,
            record_batch: RecordBatch::try_new(
                schema,
                vec![
                    Arc::new(Int32Array::from(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10])),
                    Arc::new(StringArray::from(vec!["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"])),
                ],
            )
            .unwrap(),
            columns_stats: vec![None, None],
        }))
        .await
        .unwrap();

        tx.send(QueryPipelineMessage::AffectedRows(10)).await.unwrap();

        let _ = writer_task.await.unwrap();
    }
}
