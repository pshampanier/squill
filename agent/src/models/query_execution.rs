/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};

/// The status of a query execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QueryExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// An error message from a query execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueryExecutionError {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub column: Option<u32>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub message: String,
}

/// The execution of a query.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueryExecution {
    /// The number of rows affected by the query.
    pub affected_rows: u64,

    /// The unique identifier of the connection used to execute the query.
    pub connection_id: uuid::Uuid,

    /// The date and time when the query execution was created.
    ///
    /// This is the time when the query was submitted to the agent.
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// The error message if the query execution failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<QueryExecutionError>,

    /// The date and time when the query was executed.
    ///
    /// This is the time the query was submitted to the agent but the time when the query was submitted to the
    /// driver
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,

    /// The time it took to execute the query in seconds.
    ///
    /// The time is captured in nanoseconds and converted to seconds using a 64-bit floating-point allowing for
    /// high precision on fast queries without loosing the ability to represent long running queries in seconds.
    /// This decision was made to keep that field usable in Javascript where the number type is a 64-bit
    /// floating-point but can only represent integers up to 2^53 - 1 which would be only 2.5 hours in nanoseconds
    /// before starting to loose precision. In addition seconds are more user friendly than nanoseconds.
    pub execution_time: f64,

    /// The unique identifier of the query execution.
    pub id: uuid::Uuid,

    /// The query that was executed.
    pub query: String,

    /// The status of the query execution.
    pub status: QueryExecutionStatus,

    /// The unique identifier of the user that executed the query.
    pub user_id: uuid::Uuid,
}
