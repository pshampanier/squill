use crate::models::queries::FieldStatistics;
use crate::models::QueryExecutionStatus;
use crate::server::notification_channels::PushNotificationService;
use crate::tasks::statistics::collect_record_batch_stats;
use crate::utils::constants::USER_HISTORY_DIRNAME;
use crate::utils::parquet::RecordBatchWriter;
use crate::{models::QueryExecution, server::state::ServerState};
use crate::{resources, settings, Result};
use anyhow::anyhow;
use arrow_array::RecordBatch;
use arrow_schema::SchemaRef;
use futures::future::BoxFuture;
use futures::StreamExt;
use parquet::basic::Compression;
use parquet::file::properties::WriterProperties;
use squill_drivers::async_conn::Connection;
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
//                                   (3) compute_statistics_task()      (4) write_query_result_set()
//

struct PipelinedRecordBatch {
    offset: usize,
    record_batch: RecordBatch,
    fields_stats: Vec<FieldStatistics>,
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
        let fields_stats = collect_record_batch_stats(&record_batch);
        tx.send(QueryPipelineMessage::RecordBatch(PipelinedRecordBatch { offset, record_batch, fields_stats })).await?;
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
        let mut conn = state.get_user_db_connection(query.connection_id).await?;
        let start_time = Instant::now(); // Record the start time of the query execution
        let query = match if query.with_result_set {
            //
            // The query is expected to return a result set
            //
            execute_query_with_result_set(state.clone(), session_id, &mut conn, query.clone()).await
        } else {
            //
            // The query is expected to return a number of affected rows
            //
            execute_query_without_result_set(&mut conn, query.clone()).await
        } {
            Ok(query) => {
                let execution_time = start_time.elapsed().as_secs_f64();
                QueryExecution { status: QueryExecutionStatus::Completed, execution_time, ..query }
            }
            Err(e) => QueryExecution { status: QueryExecutionStatus::Failed, error: Some(e.into()), ..query },
        };
        update_query_history(&state, session_id, query.clone()).await
    } else {
        Ok(None)
    }
}

/// Execute a query that is not expected to provide a result set.
///
/// This function returns the updated [QueryExecution].
async fn execute_query_without_result_set(conn: &mut Connection, query: QueryExecution) -> Result<QueryExecution> {
    let affected_rows = conn.execute(query.query.as_str(), None).await?;
    Ok(QueryExecution { status: QueryExecutionStatus::Completed, affected_rows, ..query })
}

/// Execute a query that is expected to provide a result set.
///
/// This function returns the updated [QueryExecution].
/// The result set is written to disk in parquet format.
async fn execute_query_with_result_set(
    state: ServerState,
    session_id: uuid::Uuid,
    conn: &mut Connection,
    query: QueryExecution,
) -> Result<QueryExecution> {
    let mut stmt = conn.prepare(query.query.as_str()).await?;
    let mut stream = stmt.query(None).await?;

    let mut next_batch = stream.next().await;
    if next_batch.is_none() {
        //
        // The query did not return any data, we are just going to collect the schema and return.
        //
        drop(stream);
        let schema = stmt.schema().await?;
        return Ok(QueryExecution { affected_rows: 0, metadata: query.metadata_with_schema(&schema)?, ..query });
    } else if let Some(Err(e)) = next_batch {
        //
        // The query execution failed
        //
        return Err(e.into());
    }

    //
    // The query returned some data
    //

    // We need to collect the schema from the first record batch in order to create the metadata of the query.
    // It's safe here to unwrap the option and the the result because we know that the stream is not empty.
    let schema = next_batch.as_ref().unwrap().as_ref().unwrap().schema().clone();
    let query = QueryExecution { metadata: query.metadata_with_schema(&schema)?, ..query };

    // A message channel used to send the RecordBatch with statistics of the query to the writer task.
    // The size of that queue must be at least as large as the maximum number of tasks that can be executed concurrently
    // by the agent because the agent general purpose task queue is used to execute the statistics collector task that
    // is feeding this channel and we don't want to block the agent task queue because this channel is full.
    let (tx, rx) = mpsc::channel::<QueryPipelineMessage>(settings::get_max_task_queue_size());

    // Spawn a task to write the result set into parquet files & send a notifications to the client
    let writer_task = tokio::task::spawn(write_query_result_set(state.clone(), session_id, rx, schema, query.clone()));

    // Read the record batches from the stream and send then to the stats collector task
    let res = {
        let mut affected_rows: u64 = 0;
        while let Some(record_batch) = next_batch {
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
            next_batch = stream.next().await;
        }
        // The query execution was successful, we need to communicate the number of affected rows to the writer task
        // in order to know when to stop writing the record batches to disk.
        tx.send(QueryPipelineMessage::AffectedRows(affected_rows as usize)).await?;
        Ok::<u64, anyhow::Error>(affected_rows)
    };
    match res {
        Ok(affected_rows) => {
            // Wait for the writer task to complete
            // We are ignoring the result of the writer task because we are only interested in the error if any.
            match writer_task.await? {
                Ok(Some(query)) => Ok(QueryExecution { affected_rows, ..query }),
                Ok(None) => Ok(query),
                Err(e) => Err(e),
            }
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
async fn write_query_result_set(
    state: ServerState,
    session_id: Uuid,
    mut rx: mpsc::Receiver<QueryPipelineMessage>,
    schema: SchemaRef,
    query: QueryExecution,
) -> Result<Option<QueryExecution>> {
    let mut query = query;

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
    let mut fields_stats: Option<Vec<FieldStatistics>> = None;

    // The status of the query should not be updated too frequently. We will update the status no more than once every
    // second.
    let refresh_interval = Duration::from_secs(1);
    let mut last_status_update = Instant::now();

    let history_dir = state
        .get_user_session(session_id)
        .ok_or_else(|| anyhow!("User session no longer available, operation aborted."))
        .map(|user_session| settings::get_user_dir(user_session.get_username()).join(USER_HISTORY_DIRNAME))?;

    let mut record_batch_writer = RecordBatchWriter::new(
        WriterProperties::builder().set_compression(Compression::SNAPPY).build(),
        history_dir,
        query.id.to_string(),
        settings::get_max_rows_per_history_file(),
    );

    while let Some(message) = rx.recv().await {
        match message {
            QueryPipelineMessage::RecordBatch(new_batch) => {
                //
                // New batch ready
                //

                // Merging the statistics of the new batch with the existing statistics
                if let Some(fields_stats) = &mut fields_stats {
                    for (existing_stat, new_stat) in fields_stats.iter_mut().zip(new_batch.fields_stats) {
                        existing_stat.merge(&new_stat);
                    }
                } else {
                    fields_stats = Some(new_batch.fields_stats);
                }

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
                    let metadata = fields_stats.as_ref().map_or_else(
                        || Ok(query.metadata.clone()),
                        |stats| query.metadata_with_stats(&schema, stats),
                    )?;
                    if let Some(updated_query) = update_query_history(
                        &state,
                        session_id,
                        QueryExecution {
                            affected_rows: processed_rows as u64,
                            storage_bytes: record_batch_writer.written_bytes as u64,
                            storage_rows: record_batch_writer.written_rows as u64,
                            metadata,
                            ..query
                        },
                    )
                    .await?
                    {
                        query = updated_query;
                        last_status_update = Instant::now();
                    } else {
                        // The query execution was cancelled by the user
                        return Ok(None);
                    }
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

    // Update the query with the final values
    let metadata = fields_stats
        .as_ref()
        .map_or_else(|| Ok(query.metadata.clone()), |stats| query.metadata_with_stats(&schema, stats))?;

    Ok(Some(QueryExecution {
        affected_rows: processed_rows as u64,
        storage_bytes: record_batch_writer.written_bytes as u64,
        storage_rows: record_batch_writer.written_rows as u64,
        metadata,
        ..query
    }))
}

/// Update the query history with given query.
///
/// A notification is sent to the client if the query was successfully updated.
///
/// # Returns
/// - `Ok(Some(QueryExecution))` if the query was updated successfully.
/// - `Ok(None)` if the query was not updated either because the user deleted, cancelled the query or cleared the history.
/// - `Err(e)` if an error occurred while updating the query.
async fn update_query_history(
    state: &ServerState,
    session_id: uuid::Uuid,
    query: QueryExecution,
) -> Result<Option<QueryExecution>> {
    let mut agentdb_conn = state.get_agentdb_connection().await?;
    match resources::queries::update(&mut agentdb_conn, query.clone()).await {
        Ok(Some(query)) => {
            // Send a notification to the client with a update of the query
            state.push_notification(session_id, query.clone()).await;
            Ok(Some(query))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::models;
    use crate::{server::state::ServerState, utils::tests};
    use arrow_array::{Int32Array, StringArray};
    use arrow_schema::{DataType, Field, Schema};
    use resources::catalog;
    use resources::queries;
    use resources::users;
    use std::sync::Arc;
    use tokio::sync::mpsc;
    use tokio_test::assert_ok;

    #[tokio::test]
    async fn test_write_query_result_set() {
        //
        // setup
        //
        let (_base_dir, conn_pool) = assert_ok!(tests::setup().await);
        let mut conn = assert_ok!(conn_pool.get().await);
        let state = ServerState::new(conn_pool);
        state.start().await;
        let username = users::local_username();
        let user = assert_ok!(users::get_by_username(&mut conn, username).await);
        let security_token = state.add_user_session(username, user.user_id);
        let (tx, rx) = mpsc::channel::<QueryPipelineMessage>(10);
        let session_id = security_token.session_id;
        let connection = models::Connection { owner_user_id: security_token.user_id, ..Default::default() };
        let connection_id = assert_ok!(catalog::add(&mut conn, &connection).await).id;
        let query = assert_ok!(
            queries::create(&mut conn, connection_id, "origin", security_token.user_id, "SELECT 1", true).await
        );

        let schema = Arc::new(Schema::new(vec![
            Field::new("a", DataType::Int32, false),
            Field::new("b", DataType::Utf8, false),
        ]));
        let record_batch = assert_ok!(RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(Int32Array::from(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10])),
                Arc::new(StringArray::from(vec!["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"])),
            ],
        ));
        let fields_stats = collect_record_batch_stats(&record_batch);

        //
        // Run the writer task
        //
        let writer_task = tokio::task::spawn(write_query_result_set(state.clone(), session_id, rx, schema, query));
        assert_ok!(
            tx.send(QueryPipelineMessage::RecordBatch(PipelinedRecordBatch { offset: 0, record_batch, fields_stats }))
                .await,
        );
        assert_ok!(tx.send(QueryPipelineMessage::AffectedRows(10)).await);

        //
        // Assert the result
        //
        let result = assert_ok!(assert_ok!(writer_task.await));
        assert!(result.is_some());
        let query = result.unwrap();
        assert_eq!(query.affected_rows, 10);
    }
}
