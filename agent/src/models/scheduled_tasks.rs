/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use crate::Result;
use futures::future::BoxFuture;
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;

/// A function that can execute a scheduled task.
///
/// # Parameters
/// - `scheduled_task`: The task to execute.
///
/// # Returns
/// A future that resolves to the updated task.
/// The returned task must have its status set to either:
/// - [ScheduledTaskStatus::Completed]: The task is completed successfully and should not be rescheduled.
/// - [ScheduledTaskStatus::Failed]: The task failed and should be retried according to the task's retry policy.
/// - [ScheduledTaskStatus::Pending]: The task is completed successfully and should be rescheduled according to [ScheduledTask::scheduled_for].
pub type ScheduledTaskExecutor =
    Box<dyn Fn(ScheduledTask) -> BoxFuture<'static, Result<ScheduledTask>> + Send + Sync>;

/// The name of a scheduled task.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduledTaskName {
    /// The task that cleans up all data locally stored by a connection history.
    CleanupConnectionHistory,

    /// The task that cleanup data no longer used.
    Vacuum,
}

/// Convert ScheduledTaskName to a `&str`.
impl AsRef<str> for ScheduledTaskName {
    fn as_ref(&self) -> &str {
        match self {
            ScheduledTaskName::CleanupConnectionHistory => "cleanup_connection_history",
            ScheduledTaskName::Vacuum => "vacuum",
        }
    }
}

/// Convert ScheduledTaskName to a string.
impl std::fmt::Display for ScheduledTaskName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a ScheduledTaskName.
impl TryFrom<&str> for ScheduledTaskName {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "cleanup_connection_history" => Ok(ScheduledTaskName::CleanupConnectionHistory),
            "vacuum" => Ok(ScheduledTaskName::Vacuum),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// The status of a scheduled task.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduledTaskStatus {
    /// The task is pending to be executed.
    Pending,

    /// The task is currently running.
    Running,

    /// The last execution of the task failed.
    Failed,

    /// The execution of the task completed successfully.
    /// While other states are stored in database, the `completed` state is not stored in database but used to
    /// communicate the completion of the task to the client. Once the task is completed, the task is removed from
    /// the list of scheduled tasks.
    Completed,
}

/// Convert ScheduledTaskStatus to a `&str`.
impl AsRef<str> for ScheduledTaskStatus {
    fn as_ref(&self) -> &str {
        match self {
            ScheduledTaskStatus::Pending => "pending",
            ScheduledTaskStatus::Running => "running",
            ScheduledTaskStatus::Failed => "failed",
            ScheduledTaskStatus::Completed => "completed",
        }
    }
}

/// Convert ScheduledTaskStatus to a string.
impl std::fmt::Display for ScheduledTaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a ScheduledTaskStatus.
impl TryFrom<&str> for ScheduledTaskStatus {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "pending" => Ok(ScheduledTaskStatus::Pending),
            "running" => Ok(ScheduledTaskStatus::Running),
            "failed" => Ok(ScheduledTaskStatus::Failed),
            "completed" => Ok(ScheduledTaskStatus::Completed),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// A scheduled task.
///
/// A task must be unique by its `name` and `entity_id`.
/// If a task is not related to a specific entity, the `entity_id` value stored in database will be `nil` UUID
/// (i.e., all bits set to zero: `00000000-0000-0000-0000-000000000000`).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct ScheduledTask {
    /// The unique identifier of the entity the task is related to (if any).
    #[serde(default, skip_serializing_if = "uuid::Uuid::is_nil")]
    pub entity_id: uuid::Uuid,

    /// The process identifier of the agent that executed the task.
    pub executed_by_pid: u32,

    /// The name of the scheduled task.
    pub name: ScheduledTaskName,

    /// The number of retries of the task.
    pub retries: u16,

    /// The date and time when the task is expected to run.
    pub scheduled_for: chrono::DateTime<chrono::Utc>,

    /// The status of the task.
    pub status: ScheduledTaskStatus,
}
