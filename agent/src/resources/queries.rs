use crate::models::queries::{FieldStatistics, Query, QueryExecution, QueryExecutionError, QueryExecutionStatus};
use crate::resources;
use crate::utils::arrow_json::schema_to_json;
use crate::utils::constants::{
    QUERY_METADATA_FIELD_MAX_LENGTH, QUERY_METADATA_FIELD_MAX_VALUE, QUERY_METADATA_FIELD_MIN_VALUE,
    QUERY_METADATA_FIELD_MISSING_VALUES, QUERY_METADATA_FIELD_UNIQUE_VALUES, QUERY_METADATA_SCHEMA,
};
use crate::utils::parquet::RecordBatchReader;
use crate::utils::types::IsShuttingDownFn;
use crate::utils::validators::Username;
use crate::{Result, UserError};
use arrow_array::RecordBatch;
use arrow_schema::{Field, Schema};
use futures::StreamExt;
use squill_drivers::execute;
use squill_drivers::{async_conn::Connection, params, Row};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use super::users;

impl QueryExecution {
    /// Returns the current metadata of the query with the given schema
    ///
    /// This method is used to add the schema of the query to the metadata.
    /// The schema is stored using the key `schema` and the value is the JSON representation of the schema using
    /// [Apache Arrow JSON test data format](https://github.com/apache/arrow/blob/master/docs/source/format/Integration.rst#json-test-data-format).
    pub fn metadata_with_schema(&self, schema: &Schema) -> Result<HashMap<String, String>> {
        let value = schema_to_json(schema);
        let string = serde_json::to_string(&value)?;
        let mut metadata = self.metadata.clone();
        metadata.insert(QUERY_METADATA_SCHEMA.to_string(), string);
        Ok(metadata)
    }

    /// Returns the current metadata of the query with a schema including the given statistics
    pub fn metadata_with_stats(&self, schema: &Schema, stats: &[FieldStatistics]) -> Result<HashMap<String, String>> {
        if schema.fields().len() != stats.len() {
            return Err(UserError::InternalError("Schema fields and stats length mismatch".to_string()).into());
        }
        let fields: Vec<Arc<Field>> = schema
            .fields()
            .iter()
            .zip(stats.iter())
            .map(|(field, stat)| {
                let mut metadata = field.metadata().clone();
                if let Some(min_value) = stat.min {
                    metadata.insert(QUERY_METADATA_FIELD_MIN_VALUE.to_string(), min_value.to_string());
                }
                if let Some(max_value) = stat.max {
                    metadata.insert(QUERY_METADATA_FIELD_MAX_VALUE.to_string(), max_value.to_string());
                }
                if let Some(max_length) = stat.max_length {
                    metadata.insert(QUERY_METADATA_FIELD_MAX_LENGTH.to_string(), max_length.to_string());
                }
                if let Some(unique) = stat.unique {
                    metadata.insert(QUERY_METADATA_FIELD_UNIQUE_VALUES.to_string(), unique.to_string());
                }
                metadata.insert(QUERY_METADATA_FIELD_MISSING_VALUES.to_string(), stat.missing.to_string());
                return Arc::new(
                    Field::new(field.name(), field.data_type().clone(), field.is_nullable()).with_metadata(metadata),
                );
            })
            .collect::<Vec<_>>();
        self.metadata_with_schema(&Schema::new(fields).with_metadata(schema.metadata().clone()))
    }

    /// Read the data from the history.
    ///
    /// TODO: The username should be loaded in the `QueryExecution` struct.
    pub async fn read_data(&self, username: &Username, offset: usize, limit: usize) -> Result<Vec<RecordBatch>> {
        let directory = users::resource_history_dir(username, self.connection_id);
        let reader = RecordBatchReader::new(directory, self.id.into());
        reader.read(offset, limit).await
    }

    /// Delete the data from the history.
    pub fn delete_data(&self, username: &Username) -> Result<()> {
        let directory = users::resource_history_dir(username, self.connection_id);
        let reader = RecordBatchReader::new(directory, self.id.into());
        let files = reader.list()?;
        for file in files {
            std::fs::remove_file(file)?;
        }
        Ok(())
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

impl From<String> for QueryExecutionError {
    fn from(e: String) -> Self {
        QueryExecutionError { message: e, line: None, column: None }
    }
}

/// Create a new query in the history.
pub async fn create<S: Into<String>>(
    conn: &mut Connection,
    connection_id: Uuid,
    datasource: S,
    origin: S,
    user_id: Uuid,
    query: Query,
) -> Result<QueryExecution> {
    let origin: String = origin.into();
    let datasource: String = datasource.into();
    match conn
        .query_map_row(
            r#"INSERT INTO query_history(query_history_id, connection_id, datasource, user_id, origin, text, hash, with_result_set)
                           VALUES(?, ?, ?, ?, ?, ?, ?, ?) 
                           RETURNING query_history_id, created_at, (SELECT username FROM users WHERE user_id=?) AS username"#,
            params!(Uuid::new_v4(), connection_id, &datasource, user_id, &origin, &query.text, query.hash as i64, query.with_result_set, user_id),
            |row| {
                Ok(QueryExecution {
                    id: row.get("query_history_id"),
                    origin,
                    revision: 0,
                    connection_id,
                    datasource,
                    user_id,
                    username: row.get("username"),
                    text: query.text,
                    hash: query.hash,
                    with_result_set: query.with_result_set,
                    status: QueryExecutionStatus::Pending,
                    error: None,
                    executed_at: None,
                    created_at: row.get("created_at"),
                    affected_rows: 0,
                    execution_time: 0.0,
                    storage_bytes: 0,
                    storage_rows: 0,
                    metadata: HashMap::new(),
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
pub async fn get(conn: &mut Connection, connection_id: Uuid, query_id: Uuid) -> Result<Option<QueryExecution>> {
    conn.query_map_row(
        r#"
        SELECT QH.*, U.username 
            FROM query_history QH 
            JOIN users U ON (QH.user_id = U.user_id)
           WHERE QH.connection_id = ? AND QH.query_history_id = ?
        "#,
        params!(connection_id, query_id),
        |row| map_query_row(&row).map_err(|e| e.into()),
    )
    .await
    .map_err(|e| e.into())
}

/// Update a query that is currently running.
///
/// Each time the query is updated, the revision is incremented.
///
/// Not all transitions are allowed, the following transitions are allowed:
/// - `pending` -> `running`
/// - `running` -> `completed` | `failed`
/// - `cancel_requested` -> `cancelled`
/// - `delete_requested` -> `deleted`
///
/// Any other valid transition such as `running` -> `cancel_requested` will make this function return an error.
/// To enable any other transition, the status must be updated with the respective function such as [cancel] or [delete].
///
/// # Returns
/// If the query is updated, the new query is returned, otherwise `None` is returned.
/// The status of the query is updated to the new status when the transition is valid, otherwise the status in database
/// prevails and the [QueryExecution] returned has the same status as the one in the database, There is an exception for
/// [QueryExecutionStatus::CancelRequested] and [QueryExecutionStatus::DeleteRequested] which are never returned but
/// substituted by [QueryExecutionStatus::Cancelled] or [QueryExecutionStatus::Deleted] are returned.
pub async fn update_execution(conn: &mut Connection, query: QueryExecution) -> Result<Option<QueryExecution>> {
    // The `affected_rows` is stored in memory as a `u64` but in the database it is stored as a `i64` because of sqlite
    // limitations. It doesn't really matter since the number of affected rows should always be less than `i64::MAX`.
    let (execution_time, affected_rows, error) = match query.status {
        QueryExecutionStatus::Completed => (Some(query.execution_time), Some(query.affected_rows as i64), None),
        QueryExecutionStatus::Failed => (None, None, Some(serde_json::to_string(&query.error)?)),
        _ => (None, None, None),
    };
    conn.query_map_row(
        r#"        
        WITH vars AS (SELECT ? AS new_status)
        UPDATE query_history 
           SET executed_at = COALESCE(executed_at, CASE WHEN vars.new_status = 'running' THEN CURRENT_TIMESTAMP ELSE NULL END),
               revision = revision + 1,
               status = CASE status 
                            WHEN vars.new_status THEN status /* No change */
                            WHEN 'pending' THEN CASE WHEN vars.new_status = 'running' THEN vars.new_status ELSE 'invalid_status_transition' END
                            WHEN 'running' THEN CASE WHEN vars.new_status IN ('completed', 'failed') THEN vars.new_status ELSE 'invalid_status_transition' END
                            WHEN 'cancel_requested' THEN CASE WHEN vars.new_status = 'cancelled' THEN vars.new_status ELSE 'invalid_status_transition' END
                            WHEN 'delete_requested' THEN CASE WHEN vars.new_status = 'deleted' THEN vars.new_status ELSE 'invalid_status_transition' END
                            ELSE 'unexpected_status_update'
                        END,
               error = COALESCE(error, ?),
               execution_time = COALESCE(execution_time, ?),
               affected_rows = COALESCE(?, affected_rows),
               storage_bytes = ?,
               storage_rows = ?,
               metadata = ?
          FROM vars
         WHERE query_history_id=? AND connection_id=? AND status IN (?, ?)
         RETURNING revision,
                   executed_at,
                   CASE status 
                     WHEN 'cancel_requested' THEN 'cancelled' 
                     WHEN 'delete_requested' THEN 'deleted' 
                   ELSE status END AS status
        "#,
        params!(
            query.status.as_ref(),
            error,
            execution_time,
            affected_rows,
            query.storage_bytes as i64,
            query.storage_rows as i64,
            if query.metadata.is_empty() { None } else { Some(serde_json::to_string(&query.metadata)?) },
            query.id,
            query.connection_id,
            QueryExecutionStatus::Pending.as_ref(),
            QueryExecutionStatus::Running.as_ref()
        ),
        |row| {
            Ok(QueryExecution {
                revision: row.get::<_, i64>("revision") as u32,
                executed_at: row.get_nullable("executed_at"),
                status: QueryExecutionStatus::try_from(row.get::<_, String>("status").as_str())?,
                ..query
            })
        },
    )
    .await
    .map_err(|e| e.into())
}

/// Cancel the execution of a query.
pub async fn cancel(conn: &mut Connection, connection_id: Uuid, query_id: Uuid) -> Result<Option<QueryExecution>> {
    conn.query_map_row(
        r#"
        UPDATE query_history 
           SET revision = revision + 1,
               status = CASE status 
                           WHEN 'pending' THEN 'cancelled' 
                           WHEN 'running' THEN 'cancel_requested' 
                           ELSE status 
                         END
          FROM vars
         WHERE query_history_id=? AND connection_id=?
         RETURNING *, (SELECT username FROM users WHERE user_id=user_id) AS username
        "#,
        params!(query_id, connection_id),
        |row| map_query_row(&row).map_err(|e| e.into()),
    )
    .await
    .map_err(|e| e.into())
}

/// Remove a query from the history.
///
/// The query is not synchronously deleted from the database, nor the data removed but its status is updated to
/// `deleted` or ``
pub async fn delete(conn: &mut Connection, connection_id: Uuid, query_id: Uuid) -> Result<Option<QueryExecution>> {
    conn.query_map_row(
        r#"
        UPDATE query_history 
           SET revision = revision + 1,
               status = CASE status 
                           WHEN 'running' THEN 'delete_requested'
                           WHEN 'cancel_requested' THEN 'delete_requested'
                           WHEN 'delete_requested' THEN 'delete_requested'
                           ELSE 'deleted'
                         END
         WHERE connection_id=? AND query_history_id=?
         RETURNING *, (SELECT username FROM users WHERE user_id=user_id) AS username
        "#,
        params!(query_id, connection_id),
        |row| map_query_row(&row).map_err(|e| e.into()),
    )
    .await
    .map_err(|e| e.into())
}

pub async fn delete_all(conn: &mut Connection, connection_id: Uuid) -> Result<()> {
    execute!(
        conn,
        r#"
            UPDATE query_history
               SET status = CASE status WHEN 'running' THEN 'delete_requested' ELSE 'deleted' END
             WHERE connection_id = $1 AND status IN ('running', 'pending');
        "#,
        connection_id
    )
    .await?;
    Ok(())
}

/// List the history of queries.
///
/// TODO: The `offset` is `created_at:query_id` the first item in the next page.
///
/// # Returns
/// The list of queries and the offset to use to get the next page if there are more queries.
pub async fn list_history<S: Into<String>>(
    conn: &mut Connection,
    connection_id: Uuid,
    user_id: Uuid,
    origin: S,
    datasource: S,
    offset: Option<String>,
    limit: usize,
) -> Result<(Vec<QueryExecution>, Option<String>)> {
    let origin: String = origin.into();
    let datasource: String = datasource.into();
    let _offset = offset.unwrap_or_default();
    let mut queries = Vec::new();
    let mut stmt = conn
        .prepare(
            r#"
                SELECT QH.*, U.username 
                  FROM query_history QH 
                  JOIN users U ON (QH.user_id = U.user_id)
                 WHERE QH.connection_id = ? 
                   AND QH.origin = ?
                   AND QH.datasource = ?
                   AND QH.user_id = ?
                   AND QH.status NOT IN ('deleted', 'delete_requested')
                 ORDER BY QH.created_at DESC, QH.query_id LIMIT ?"#,
        )
        .await?;
    let mut rows = stmt.query_rows(params!(connection_id, origin, datasource, user_id, limit as i64,)).await?;
    while let Some(next) = rows.next().await {
        match next {
            Ok(row) => queries.push(map_query_row(&row)?),
            Err(e) => return Err(e.into()),
        }
    }
    Ok((queries, None))
}

/// Free the space taken by the deleted query results.
pub async fn vacuum(conn: &mut Connection, is_shutting_down: IsShuttingDownFn) -> Result<()> {
    while !is_shutting_down() {
        todo!();
    }
    Ok(())
}

/// Read the data of the query result stored locally.
pub async fn read_data(
    conn: &mut Connection,
    connection_id: Uuid,
    query_id: Uuid,
    offset: usize,
    limit: usize,
) -> Result<Vec<RecordBatch>> {
    let query = get(conn, connection_id, query_id).await?;
    if let Some(query) = query {
        let username = resources::users::get_username(conn, query.user_id).await?;
        query.read_data(&username, offset, limit).await
    } else {
        Err(UserError::NotFound("Query not found".to_string()).into())
    }
}

/// Delete the data of the query result stored locally.
pub async fn delete_data(conn: &mut Connection, connection_id: Uuid, query_id: Uuid) -> Result<()> {
    let query = get(conn, connection_id, query_id).await?;
    if let Some(query) = query {
        let username = resources::users::get_username(conn, query.user_id).await?;
        query.delete_data(&username)
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
        datasource: row.try_get::<_, _>("datasource")?,
        user_id: row.try_get::<_, _>("user_id")?,
        username: row.try_get::<_, _>("username")?,
        text: row.try_get::<_, String>("text")?,
        hash: row.try_get::<_, i64>("hash")? as u64,
        origin: row.try_get::<_, String>("origin")?,
        created_at: row.try_get::<_, chrono::DateTime<chrono::Utc>>("created_at")?,
        executed_at: row.try_get_nullable::<_, chrono::DateTime<chrono::Utc>>("executed_at")?,
        execution_time: row.try_get_nullable::<_, f64>("execution_time")?.unwrap_or(0.0),
        affected_rows: row.try_get_nullable::<_, i64>("affected_rows")?.unwrap_or(0) as u64,
        status: QueryExecutionStatus::try_from(row.try_get::<_, String>("status")?.as_str())?,
        error: row.try_get_nullable::<_, _>("error")?,
        with_result_set: row.try_get::<_, _>("with_result_set")?,
        storage_bytes: row.try_get::<_, i64>("storage_bytes")? as u64,
        storage_rows: row.try_get::<_, i64>("storage_rows")? as u64,
        metadata: match row.try_get_nullable::<_, String>("metadata") {
            Ok(Some(metadata)) => serde_json::from_str(metadata.as_str())?,
            _ => HashMap::new(),
        },
    })
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::models::queries::{QueryExecutionError, QueryExecutionStatus};
    use crate::utils::tests;
    use crate::utils::validators::sanitize_username;
    use tokio_test::assert_ok;

    fn new_query(text: &str) -> Query {
        Query { text: text.to_string(), with_result_set: true, hash: 42 }
    }

    #[tokio::test]
    async fn test_resources_queries() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let mut conn = assert_ok!(conn_pool.get().await);

        let connection_id = uuid::Uuid::new_v4();
        let user_id = tests::get_local_user_id(&mut conn).await;
        let origin = "test";
        let datasource = "db_test";
        let statement = "SELECT 1";

        // create
        let initial_query =
            assert_ok!(create(&mut conn, connection_id, datasource, origin, user_id, new_query(statement)).await);
        assert_eq!(
            initial_query,
            QueryExecution {
                id: initial_query.id,
                connection_id,
                origin: origin.to_string(),
                datasource: datasource.to_string(),
                revision: 0,
                user_id,
                username: resources::users::local_username().to_string(),
                text: statement.to_string(),
                hash: 42,
                with_result_set: true,
                status: QueryExecutionStatus::Pending,
                error: None,
                executed_at: None,
                created_at: initial_query.created_at,
                affected_rows: 0,
                execution_time: 0.0,
                storage_bytes: 0,
                storage_rows: 0,
                metadata: HashMap::new(),
            }
        );

        // get
        let mut query = assert_ok!(get(&mut conn, connection_id, initial_query.id).await).unwrap();
        assert_eq!(query, initial_query);

        // update to running (should set executed_at)
        query = assert_ok!(
            update_execution(&mut conn, QueryExecution { status: QueryExecutionStatus::Running, ..query }).await
        )
        .unwrap();
        assert_eq!(query.revision, 1);
        assert!(query.executed_at.is_some());

        // update to failed
        assert_ok!(
            update_execution(
                &mut conn,
                QueryExecution {
                    status: QueryExecutionStatus::Failed,
                    error: Some(QueryExecutionError { column: None, line: None, message: "Test error".to_string() }),
                    ..query
                }
            )
            .await
        );

        // get again (to check the update)
        query = assert_ok!(get(&mut conn, connection_id, query.id).await).unwrap();
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
        let mut conn = conn_pool.get().await.unwrap();
        let conn_id_1 = uuid::Uuid::new_v4();
        let conn_id_2 = uuid::Uuid::new_v4();
        let user_1 = assert_ok!(resources::users::create(&mut conn, &sanitize_username("user_1").unwrap()).await);
        let user_2 = assert_ok!(resources::users::create(&mut conn, &sanitize_username("user_2").unwrap()).await);
        let origin_1 = "origin1";
        let origin_2 = "origin2";
        let datasource: &str = "db_test";

        assert_ok!(create(&mut conn, conn_id_1, datasource, origin_1, user_1.user_id, new_query("SELECT 1")).await);
        assert_ok!(create(&mut conn, conn_id_1, datasource, origin_1, user_1.user_id, new_query("SELECT 2")).await);
        assert_ok!(create(&mut conn, conn_id_1, datasource, origin_2, user_1.user_id, new_query("SELECT 3")).await);
        assert_ok!(create(&mut conn, conn_id_2, datasource, origin_1, user_1.user_id, new_query("SELECT 4")).await);
        assert_ok!(create(&mut conn, conn_id_1, datasource, origin_1, user_2.user_id, new_query("SELECT 5")).await);

        let (history, _next_page) =
            assert_ok!(list_history(&mut conn, conn_id_1, user_1.user_id, origin_1, datasource, None, 100).await);
        assert_eq!(history.len(), 2);
        assert!(matches!(history[0].text.as_str(), "SELECT 1" | "SELECT 2"));
        assert!(matches!(history[1].text.as_str(), "SELECT 1" | "SELECT 2"));
    }
}
