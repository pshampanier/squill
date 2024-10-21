use crate::models::queries::{QueryExecution, QueryExecutionStatus};
use crate::utils::constants::USER_HISTORY_DIRNAME;
use crate::utils::parquet::RecordBatchReader;
use crate::{resources, settings};
use crate::{Result, UserError};
use arrow_array::RecordBatch;
use futures::StreamExt;
use squill_drivers::Row;
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
        r#"SELECT query_history_id, connection_id, revision, user_id, query, origin, created_at, executed_at, 
                         execution_time, affected_rows, status, error, with_result_set, storage_bytes
                   FROM query_history 
                  WHERE connection_id = ? AND query_history_id = ?"#,
        params!(connection_id, query_history_id),
        |row| map_query_row(&row).map_err(|e| e.into()),
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

pub async fn list_history<S: Into<String>>(
    conn: &Connection,
    connection_id: Uuid,
    user_id: Uuid,
    origin: S,
    _limit: usize,
) -> Result<Vec<QueryExecution>> {
    let origin: String = origin.into();
    let mut queries = Vec::new();
    let mut stmt = conn
        .prepare("SELECT * FROM query_history WHERE connection_id = ? AND origin = ? and user_id = ? ORDER BY created_at DESC")
        .await?;
    let mut rows = conn.query_rows(&mut stmt, params!(connection_id, origin, user_id)).await?;
    while let Some(next) = rows.next().await {
        match next {
            Ok(row) => queries.push(map_query_row(&row)?),
            Err(e) => return Err(e.into()),
        }
    }
    Ok(queries)
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
        let reader = RecordBatchReader::new(
            settings::get_user_dir(username).join(USER_HISTORY_DIRNAME),
            query_history_id.into(),
        );
        reader.read(offset, limit).await
    } else {
        Err(UserError::NotFound("Query not found".to_string()).into())
    }
}

#[inline]
fn map_query_row(row: &Row) -> Result<QueryExecution> {
    Ok(QueryExecution {
        id: row.try_get::<_, _>("query_history_id")?,
        revision: row.try_get::<_, i64>("revision")? as u32,
        connection_id: row.try_get::<_, _>("connection_id")?,
        user_id: row.try_get::<_, _>("user_id")?,
        query: row.try_get::<_, String>("query")?,
        origin: row.try_get::<_, String>("origin")?,
        created_at: row.try_get::<_, chrono::DateTime<chrono::Utc>>("created_at")?,
        executed_at: row.try_get_nullable::<_, chrono::DateTime<chrono::Utc>>("executed_at")?,
        execution_time: row.try_get_nullable::<_, f64>("execution_time")?.unwrap_or(0.0),
        affected_rows: row.try_get_nullable::<_, i64>("affected_rows")?.unwrap_or(0) as u64,
        status: QueryExecutionStatus::try_from(row.try_get::<_, String>("status")?.as_str())?,
        error: row.try_get_nullable::<_, _>("error")?,
        with_result_set: row.try_get::<_, _>("with_result_set")?,
        storage_bytes: row.try_get::<_, i64>("storage_bytes")? as u64,
    })
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

    #[tokio::test]
    async fn test_resources_queries_list_history() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let conn = conn_pool.get().await.unwrap();
        let connection_id_1 = uuid::Uuid::new_v4();
        let connection_id_2 = uuid::Uuid::new_v4();
        let user_id_1 = uuid::Uuid::new_v4();
        let user_id_2 = uuid::Uuid::new_v4();
        let origin_1 = "origin1";
        let origin_2 = "origin2";

        create(&conn, connection_id_1, origin_1, user_id_1, "SELECT 1", true).await.unwrap();
        create(&conn, connection_id_1, origin_1, user_id_1, "SELECT 2", true).await.unwrap();
        create(&conn, connection_id_1, origin_2, user_id_1, "SELECT 3", true).await.unwrap();
        create(&conn, connection_id_2, origin_1, user_id_1, "SELECT 4", true).await.unwrap();
        create(&conn, connection_id_1, origin_1, user_id_2, "SELECT 5", true).await.unwrap();

        let history = assert_ok!(list_history(&conn, connection_id_1, user_id_1, origin_1, 100).await);
        assert_eq!(history.len(), 2);
        assert!(matches!(history[0].query.as_str(), "SELECT 1" | "SELECT 2"));
        assert!(matches!(history[1].query.as_str(), "SELECT 1" | "SELECT 2"));
    }
}
