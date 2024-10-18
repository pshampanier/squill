use crate::models::queries::{QueryExecution, QueryExecutionStatus};
use crate::utils::parquet::RecordBatchReader;
use crate::{resources, settings};
use crate::{Result, UserError};
use arrow_array::RecordBatch;
use squill_drivers::{futures::Connection, params};
use uuid::Uuid;

/// Create a new query in the history.
pub async fn create<S: Into<String>>(
    conn: &Connection,
    connection_id: Uuid,
    origin: S,
    user_id: Uuid,
    statement: S,
    with_result_set: bool,
) -> Result<QueryExecution> {
    let origin: String = origin.into();
    let statement: String = statement.into();
    match conn
        .query_map_row(
            r#"INSERT INTO query_history(query_history_id, connection_id, user_id, origin, query, with_result_set)
                           VALUES(?, ?, ?, ?, ?, ?) RETURNING query_history_id, created_at"#,
            params!(Uuid::new_v4(), connection_id, user_id, &origin, &statement, with_result_set),
            |row| {
                Ok(QueryExecution {
                    id: row.try_get(0)?,
                    origin,
                    revision: 0,
                    connection_id,
                    user_id,
                    query: statement,
                    with_result_set,
                    status: QueryExecutionStatus::Pending,
                    error: None,
                    executed_at: None,
                    created_at: row.try_get(1)?,
                    affected_rows: 0,
                    execution_time: 0.0,
                    storage_bytes: 0,
                })
            },
        )
        .await?
    {
        Some(query) => Ok(query),
        None => Err(UserError::InternalError("Failed to insert a query in the history.".to_string()).into()),
    }
}

/// Load a query from the history.
pub async fn get(conn: &Connection, connection_id: Uuid, query_history_id: Uuid) -> Result<Option<QueryExecution>> {
    conn.query_map_row(
        r#"SELECT revision, user_id, query, origin, created_at, executed_at, execution_time, affected_rows, 
                         status, error, with_result_set, storage_bytes
                   FROM query_history 
                  WHERE connection_id = ? AND query_history_id = ?"#,
        params!(connection_id, query_history_id),
        |row| {
            Ok(QueryExecution {
                id: query_history_id,
                connection_id,
                revision: row.try_get::<_, i64>(0)? as u32,
                user_id: row.try_get::<_, _>(1)?,
                query: row.try_get::<_, String>(2)?,
                origin: row.try_get::<_, String>(3)?,
                created_at: row.try_get::<_, chrono::DateTime<chrono::Utc>>(4)?,
                executed_at: row.try_get_nullable::<_, chrono::DateTime<chrono::Utc>>(5)?,
                execution_time: row.try_get_nullable::<_, f64>(6)?.unwrap_or(0.0),
                affected_rows: row.try_get::<_, i64>(7)? as u64,
                status: QueryExecutionStatus::try_from(row.try_get::<_, String>(8)?.as_str())?,
                error: row.try_get_nullable::<_, _>(9)?,
                with_result_set: row.try_get::<_, _>(10)?,
                storage_bytes: row.try_get::<_, i64>(11)? as u64,
            })
        },
    )
    .await
    .map_err(|e| e.into())
}

/// Update the query in the history.
pub async fn update(conn: &Connection, query: QueryExecution) -> Result<Option<QueryExecution>> {
    // The `affected_rows` is stored in memory as a `u64` but in the database it is stored as a `i64` because of sqlite
    // limitations. It doesn't really matter since the number of affected rows should always be less than `i64::MAX`.
    let (execution_time, affected_rows, error) = match query.status {
        QueryExecutionStatus::Completed => (Some(query.execution_time), Some(query.affected_rows as i64), None),
        QueryExecutionStatus::Failed => (None, None, Some(serde_json::to_string(&query.error)?)),
        _ => (None, None, None),
    };
    conn.query_map_row(
        r#"UPDATE query_history 
                    SET executed_at = COALESCE(executed_at, CASE WHEN ? = 'running' THEN CURRENT_TIMESTAMP ELSE NULL END),
                        revision = revision + 1,
                        status = ?,
                        error = COALESCE(error, ?),
                        execution_time = COALESCE(execution_time, ?),
                        affected_rows = COALESCE(?, affected_rows),
                        storage_bytes = ?
                  WHERE query_history_id=? AND connection_id=? AND status <> ?
            RETURNING revision, executed_at"#,
        params!(
            query.status.as_str(),
            query.status.as_str(),
            error,
            execution_time,
            affected_rows,
            query.storage_bytes as i64,
            query.id,
            query.connection_id,
            QueryExecutionStatus::Cancelled.as_str()
        ),
        |row| {
            Ok(QueryExecution {
                revision: row.try_get::<_, i64>(0)? as u32,
                executed_at: row.try_get_nullable(1)?,
                ..query
            })
        },
    )
    .await
    .map_err(|e| e.into())
}

/// Read the history data from the query.
pub async fn read_history_data(
    conn: &Connection,
    connection_id: Uuid,
    query_history_id: Uuid,
    offset: usize,
    limit: usize,
) -> Result<Vec<RecordBatch>> {
    let query = get(conn, connection_id, query_history_id).await?;
    if let Some(query) = query {
        let username = resources::users::get_username(conn, query.user_id).await?;
        let reader = RecordBatchReader::new(settings::get_user_dir(username), query_history_id.into());
        reader.read(offset, limit).await
    } else {
        Err(UserError::NotFound("Query not found".to_string()).into())
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::models::queries::{QueryExecutionError, QueryExecutionStatus};
    use crate::utils::tests;
    use tokio_test::assert_ok;

    #[tokio::test]
    async fn test_resources_queries() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let connection_id = uuid::Uuid::new_v4();
        let user_id = uuid::Uuid::new_v4();
        let origin = "test";
        let statement = "SELECT 1";
        let conn = conn_pool.get().await.unwrap();

        // create
        let initial_query = create(&conn, connection_id, origin, user_id, statement, true).await.unwrap();
        assert_eq!(
            initial_query,
            QueryExecution {
                id: initial_query.id,
                connection_id,
                origin: origin.to_string(),
                revision: 0,
                user_id,
                query: statement.to_string(),
                with_result_set: true,
                status: QueryExecutionStatus::Pending,
                error: None,
                executed_at: None,
                created_at: initial_query.created_at,
                affected_rows: 0,
                execution_time: 0.0,
                storage_bytes: 0,
            }
        );

        // get
        let mut query = assert_ok!(get(&conn, connection_id, initial_query.id).await).unwrap();
        assert_eq!(query, initial_query);

        // update to running (should set executed_at)
        query =
            assert_ok!(update(&conn, QueryExecution { status: QueryExecutionStatus::Running, ..query }).await).unwrap();
        assert_eq!(query.revision, 1);
        assert!(query.executed_at.is_some());

        // update to failed
        assert_ok!(
            update(
                &conn,
                QueryExecution {
                    status: QueryExecutionStatus::Failed,
                    error: Some(QueryExecutionError { column: None, line: None, message: "Test error".to_string() }),
                    ..query
                }
            )
            .await
        );

        // get again (to check the update)
        query = assert_ok!(get(&conn, connection_id, query.id).await).unwrap();
        assert_eq!(query.revision, 2);
        assert_eq!(query.status, QueryExecutionStatus::Failed);
        assert_eq!(
            query.error,
            Some(QueryExecutionError { column: None, line: None, message: "Test error".to_string() })
        );
    }
}
