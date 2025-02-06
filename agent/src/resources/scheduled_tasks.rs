use crate::models::scheduled_tasks::{ScheduledTask, ScheduledTaskName, ScheduledTaskStatus};
use crate::{err_internal, Result};
use squill_drivers::async_conn::Connection;
use squill_drivers::{execute, params};
use tracing::error;
use uuid::Uuid;

impl std::fmt::Display for ScheduledTask {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.entity_id.is_nil() {
            true => write!(f, "{}", self.name),
            false => write!(f, "{}:{}", self.name, self.entity_id),
        }
    }
}

/// Create a new scheduled task in database.
///
/// Returns `Some(task)` if the task was created, `None` if the task already exists.
pub async fn create(
    conn: &mut Connection,
    name: ScheduledTaskName,
    entity_id: Uuid,
    scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<Option<ScheduledTask>> {
    // (1) The entity_id need to be bound as a String because the squill_driver is binding a UUID nil value to NULL and
    //     the table `scheduled_tasks` is explicitly expecting a nil UUID `00000000-0000-0000-0000-000000000000` if the
    //     tasks is not related to an entity.
    match conn
        .query_map_row(
            r#"
            INSERT INTO scheduled_tasks (name, entity_id, scheduled_for)
                VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                RETURNING scheduled_for
            "#,
            params!(name.as_ref(), entity_id.to_string() /* (1) */, scheduled_for),
            |row| {
                Ok(ScheduledTask {
                    name,
                    entity_id,
                    status: ScheduledTaskStatus::Pending,
                    scheduled_for: row.get("scheduled_for"),
                    executed_by_pid: 0,
                    retries: 0,
                })
            },
        )
        .await
    {
        Ok(Some(task)) => Ok(Some(task)),
        Ok(None) => Err(err_internal!("Failed to create a scheduled task.")), // This should never happen
        Err(err) => {
            match err {
                // A constraint violation error is raised when the task already exists.
                squill_drivers::Error::ConstraintViolation { error: _ } => Ok(None),
                _ => Err(err.into()),
            }
        }
    }
}

/// Delete a scheduled task from database.
///
/// A task can only be deleted if it not currently running or if run by the current process.
///
/// Returns `true` if the task was deleted, `false` if the task was not found.or could not be deleted.
pub async fn delete(conn: &mut Connection, task: &ScheduledTask) -> Result<bool> {
    let pid = std::process::id();
    match execute!(
        conn,
        r#"
            DELETE FROM scheduled_tasks 
             WHERE name=? AND entity_id=? AND executed_by_pid IN (0, ?)
        "#,
        task.name.as_ref(),
        task.entity_id.to_string(),
        pid
    )
    .await
    {
        Ok(1) => Ok(true),
        Ok(_) => Ok(false),
        Err(err) => Err(err.into()),
    }
}

/// Get the next task to be executed.
///
/// If the task is eligible to be executed, the task will be marked as `running` and the PID of the current process
/// will be stored in the `executed_by_pid` column, preventing anyone else from executing the task.
///
/// To make sure scheduled tasks cannot be executed by multiple processes/threads at the same time, this function
/// relies on the atomicity of the database operation making sure that only one process/thread can update the task to
/// make it its own.
///
/// Returns `Some(scheduled_task, expires_in_ms)` if a task is available, `None` if no task is available.
pub async fn acquire_next(conn: &mut Connection) -> Result<Option<(ScheduledTask, u64)>> {
    let pid = std::process::id();
    conn
        .query_map_row(
            r#"
            WITH scheduler AS (
                -- Returns 1 row with a column `is_running` that is set to true if the scheduler is already running.
                -- It will be used to make sure no scheduled_tasks record will be updated by this query if there is 
                -- another scheduler running.
                SELECT CASE WHEN COUNT(1) > 0 THEN 1 ELSE 0 END AS is_running
                FROM scheduled_tasks
                WHERE status = 'running'
            ), next_scheduled_task AS (
                -- Select the next task to be scheduled (whatever it's ready to be executed or scheduled in the future).
                SELECT name, entity_id FROM scheduled_tasks ORDER BY scheduled_for LIMIT 1
            )
            -- Returns the next scheduled_tasks record to be executed + when it's scheduled (expires_in_ms).
            -- If the execution is past due, the scheduled_tasks record status is updated to 'running' preventing any
            -- other scheduler running at the same time to do anything. 
            UPDATE scheduled_tasks
               SET status = CASE WHEN scheduled_for < CURRENT_TIMESTAMP THEN 'running' ELSE status END,
                   executed_by_pid = CASE WHEN scheduled_for < CURRENT_TIMESTAMP THEN ? ELSE executed_by_pid END,
                   retries = CASE WHEN scheduled_for < CURRENT_TIMESTAMP AND status='failed' THEN retries+1 ELSE retries END
             WHERE (name, entity_id) = (SELECT name, entity_id FROM next_scheduled_task)
               AND (SELECT is_running FROM scheduler) = 0
             RETURNING *, CAST((julianday(scheduled_for) - 2440587.5) * 86400 * 1000 AS INTEGER) - CAST((julianday('now') - 2440587.5) * 86400 * 1000 AS INTEGER) AS expires_in_ms            
            "#,
            params!(pid),
            |row| {
                Ok((ScheduledTask {
                    name: ScheduledTaskName::try_from(row.get::<_, String>("name").as_ref())?,
                    entity_id: row.get("entity_id"),
                    status: ScheduledTaskStatus::try_from(row.get::<_, String>("status").as_ref())?,
                    scheduled_for: row.get("scheduled_for"),
                    executed_by_pid: row.get::<_, i64>("executed_by_pid") as u32,
                    retries: row.get::<_, i64>("retries") as u16,
                }, row.get("expires_in_ms")))
            },
        )
        .await.map_err(|err| err.into())
}

/// Schedule a retry for a task.
///
/// This function will update the task to be scheduled for a future execution using an exponential backoff strategy.
pub async fn schedule_retry(conn: &mut Connection, task: &ScheduledTask) -> Result<()> {
    match execute!(
        conn,
        r#"
        UPDATE scheduled_tasks
           SET status='failed',
               executed_by_pid=0,
               retries=retries+1,
               scheduled_for=datetime(
                   CURRENT_TIMESTAMP, 
                   CASE retries 
                   WHEN 0 THEN '+1 seconds'
                   WHEN 1 THEN '+5 seconds'
                   WHEN 2 THEN '+10 seconds'
                   WHEN 3 THEN '+30 seconds'
                   WHEN 4 THEN '+1 minutes'
                   WHEN 5 THEN '+5 minutes'
                   WHEN 6 THEN '+10 minutes'
                   WHEN 7 THEN '+30 minutes'
                   WHEN 8 THEN '+1 hours'
                   WHEN 9 THEN '+6 hours'
                   WHEN 11 THEN '+12 hours'
                   ELSE '+1 days'
                   END
                )
         WHERE name=? AND entity_id=?
        "#,
        task.name.as_ref(),
        task.entity_id.to_string()
    )
    .await
    {
        Ok(_) => Ok(()),
        Err(err) => {
            error!("Failed to schedule a retry for the task {} (reason: {})", task, err.to_string());
            Err(err.into())
        }
    }
}

/// Schedule a retry for a task.
///
/// This function will update the task to be scheduled for a future execution using an exponential backoff strategy.
pub async fn schedule_next_execution(conn: &mut Connection, task: &ScheduledTask) -> Result<()> {
    match execute!(
        conn,
        r#"
        UPDATE scheduled_tasks
           SET status='pending',
               executed_by_pid=0,
               retries=0,
               scheduled_for=?
         WHERE name=? AND entity_id=?
        "#,
        task.scheduled_for,
        task.name.as_ref(),
        task.entity_id.to_string()
    )
    .await
    {
        Ok(_) => Ok(()),
        Err(err) => {
            error!("Failed to schedule the next execution for the task {} (reason: {})", task, err.to_string());
            Err(err.into())
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TESTS
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
#[cfg(test)]
mod tests {
    use tokio_test::assert_ok;

    use super::*;
    use crate::utils::tests;

    #[tokio::test]
    async fn test_scheduled_task() {
        // setup
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let mut conn = conn_pool.get().await.unwrap();

        // 1) Simple task

        // create()
        let task = assert_ok!(create(&mut conn, ScheduledTaskName::Vacuum, Uuid::nil(), None).await).unwrap();
        assert_eq!(task.name, ScheduledTaskName::Vacuum);
        assert_eq!(task.entity_id, Uuid::nil());
        assert_eq!(task.executed_by_pid, 0);
        assert!(assert_ok!(create(&mut conn, ScheduledTaskName::Vacuum, Uuid::nil(), None).await).is_none()); // Already exists

        // delete()
        assert!(assert_ok!(delete(&mut conn, &task).await));
        assert!(!assert_ok!(delete(&mut conn, &task).await)); // non existing task

        // 2) Task with entity_id

        // create()
        let entity_id = Uuid::new_v4();
        let task = assert_ok!(create(&mut conn, ScheduledTaskName::Vacuum, entity_id, None).await).unwrap();
        assert_eq!(task.name, ScheduledTaskName::Vacuum);
        assert_eq!(task.entity_id, entity_id);
        assert_eq!(task.executed_by_pid, 0);
        assert!(assert_ok!(create(&mut conn, ScheduledTaskName::Vacuum, entity_id, None).await).is_none());

        // delete()
        assert!(assert_ok!(delete(&mut conn, &task).await));
        assert!(!assert_ok!(delete(&mut conn, &task).await)); // non existing task
    }
}
