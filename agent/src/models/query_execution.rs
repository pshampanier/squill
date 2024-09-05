use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct QueryExecutionError {
    pub message: String,
    pub line: u32,
    pub column: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct QueryExecution {
    /// The unique identifier of the query execution.
    pub id: Uuid,

    /// The unique identifier of the connection used to execute the query.
    pub connection_id: Uuid,

    /// The unique identifier of the user that has executed the query.
    pub user_id: Uuid,

    /// The SQL query to execute.
    pub query: String,

    /// The status of the query execution.
    pub status: QueryExecutionStatus,

    /// The error message if the query execution failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<QueryExecutionError>,

    /// The time the query execution has started.
    ///
    /// This is the time the query was submitted to the agent but the time when the query was submitted to the
    /// driver.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,

    /// The time the query execution was created.
    ///
    /// This is the time when the query was submitted to the agent.
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// The number of rows affected by the query execution.
    ///
    /// This is only available for queries that modify the data.
    pub affected_rows: i64,

    /// The execution time of the query in seconds.
    ///
    /// The time is captured in nanoseconds and converted to seconds using a 64-bit floating-point allowing for
    /// high precision on fast queries without loosing the ability to represent long running queries in seconds.
    /// This decision was made to keep that field usable in Javascript where the number type is a 64-bit floating-point
    /// but can only represent integers up to 2^53 - 1 which would be only 2.5 hours in nanoseconds before starting
    /// to loose precision. In addition seconds are more user friendly than nanoseconds.
    pub execution_time: f64,
}
