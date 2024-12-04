/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use anyhow::{anyhow, Error};
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;
use std::collections::HashMap;

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

impl QueryExecutionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            QueryExecutionStatus::Pending => "pending",
            QueryExecutionStatus::Running => "running",
            QueryExecutionStatus::Completed => "completed",
            QueryExecutionStatus::Failed => "failed",
            QueryExecutionStatus::Cancelled => "cancelled",
        }
    }
}

impl TryFrom<&str> for QueryExecutionStatus {
    type Error = Error;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "pending" => Ok(QueryExecutionStatus::Pending),
            "running" => Ok(QueryExecutionStatus::Running),
            "completed" => Ok(QueryExecutionStatus::Completed),
            "failed" => Ok(QueryExecutionStatus::Failed),
            "cancelled" => Ok(QueryExecutionStatus::Cancelled),
            _ => Err(anyhow!("Invalid query status: {}", value)),
        }
    }
}

/// An error message from a query execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct QueryExecutionError {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub column: Option<u32>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub message: String,
}

/// The execution of a query.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
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

    /// A collection of key-value pairs that provide additional information about the query execution.
    ///
    /// - `schema`:
    ///   The schema of the result set for queries with `with_result_set` set to `true`.
    ///   The schema is a JSON representation of an Arrow schema using
    ///   [Apache Arrow JSON test data format](https://github.com/apache/arrow/blob/master/docs/source/format/Integration.rst#json-test-data-format)
    ///   Having `with_result_set` set to `true` set to true doesn't guarantee that the schema will be present, the
    ///   schema is only present if the query execution was successful.
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,

    /// The origin of the query execution.
    ///
    /// The query can be originated from different origins like a terminal or a worksheet. In order to track the
    /// history of each of origin independently, the origin is stored in the query execution.
    ///
    /// Examples of origins are: `terminal`, `worksheet`, `e7ee76db-8758-4da4-bbce-242c8d1f3d63`, etc.
    pub origin: String,

    /// The query that was executed.
    pub query: String,

    /// The revision number of the query execution.
    ///
    /// The revision number is used to track the changes to the query execution. It is incremented each time the
    /// query execution is updated. Because the client receive updates of the query execution via different channels
    /// (HTTP and WebSocket) there is no guarantee that the last update received is the most recent. By using the
    /// revision number the client can avoid overwriting a more recent update with an older one.
    /// At creation the revision number is 0.
    pub revision: u32,

    /// The status of the query execution.
    pub status: QueryExecutionStatus,

    /// The size of the result set on disk in bytes.
    pub storage_bytes: u64,

    /// The number of rows stored on disk.
    pub storage_rows: u64,

    /// The unique identifier of the user that executed the query.
    pub user_id: uuid::Uuid,

    /// A flag indicating if the query is a result set returning query.
    ///
    /// This flag is used to determine if the query execution may return the result set or not.
    ///
    /// Examples of result set returning queries are:
    /// - `SELECT``: The primary statement that retrieves rows from one or more tables.
    /// - `SHOW``: A statement that shows information about databases, tables, or other objects.
    /// - `INSERT ... RETURNING`: In some databases (like PostgreSQL), `INSERT``, `UPDATE``, and `DELETE`` can
    ///    return rows when combined with the `RETURNING` clause.
    pub with_result_set: bool,
}

/// The response of the GET /connections/{id}/history/list endpoint.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct QueryHistoryPage {
    /// The pagination information for the next page.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub next_page: String,

    /// The list of queries in the history.
    pub queries: Vec<QueryExecution>,
}

/// The statistics about the data of a field across a result set.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct FieldStatistics {
    /// The maximum value of the attribute (see `min` for supported data types).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,

    /// The maximum length of the attribute for `text` attributes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_length: Option<u32>,

    /// The minimum value of the attribute.
    /// Only present if the attribute has a numeric representation (this include date, datetime).
    /// The following [DataType](https://arrow.apache.org/docs/format/Columnar.html#data-type) are currently
    /// supported:
    /// - Int
    /// - Floating Point
    /// - Decimal
    /// - Date: The number of days since the UNIX epoch.
    /// - Time: A number since midnight (precision depending on the time unit of the field).
    /// - Timestamp: The number since the UNIX epoch (precision depending on the time unit of the field, always UTC).
    /// - Duration: A number (precision depending on the time unit of the field)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,

    /// The number of missing values in the attribute.
    pub missing: u64,

    /// The number of unique values in the attribute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unique: Option<u64>,
}
