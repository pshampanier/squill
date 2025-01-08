use crate::models::scheduled_tasks::{ScheduledTaskExecutor, ScheduledTaskName, ScheduledTaskStatus};
use crate::resources::{self, scheduled_tasks};
use crate::utils::types::IsShuttingDownFn;
use crate::Result;
use crate::{models::scheduled_tasks::ScheduledTask, server::state::ServerState};
use futures::future::BoxFuture;
use tokio::time::{sleep, Duration};
use tracing::error;
use tracing::trace;

fn create_executor(state: ServerState) -> ScheduledTaskExecutor {
    Box::new(move |scheduled_task: ScheduledTask| {
        let state = state.clone();
        Box::pin(async move { run_scheduled_task(scheduled_task, state).await })
    })
}

/// Execute the scheduled tasks.
///
/// This function will run until all scheduled tasks have been executed, including those that are scheduled to run in
/// the future, waiting for the next task to be executed if necessary.
pub fn run_tasks_scheduler(state: ServerState) -> BoxFuture<'static, Result<()>> {
    Box::pin(async move {
        trace!("Starting the tasks scheduler");
        let executor = create_executor(state.clone());
        while let Some(next_run_millis) = run_all_scheduled_tasks(state.clone(), &executor).await? {
            sleep(Duration::from_millis(next_run_millis)).await;
        }
        trace!("Tasks scheduler terminated.");
        Ok(())
    })
}

/// Run all scheduled tasks.
///
/// This function will run all scheduled tasks that are ready to run.
/// If a task fails to run the function will schedule a retry and continue with the next task.
///
/// # Returns
/// - If all tasks have been executed, the function will return `None`.
/// - If there are still tasks to run but they are not ready, the function will return the number of milliseconds until
///   the next task is scheduled to run.
/// - If the server is shutting down, the function will return `None`.
async fn run_all_scheduled_tasks(state: ServerState, executor: &ScheduledTaskExecutor) -> Result<Option<u64>> {
    loop {
        if state.is_shutting_down() {
            // The server is shutting down, stop the scheduler.
            return Ok(None);
        }
        let next_scheduled_task = {
            let mut conn = state.get_agentdb_connection().await?;
            scheduled_tasks::acquire_next(&mut conn).await?
        };
        match next_scheduled_task {
            Some((scheduled_task, expires_in_ms)) => {
                if scheduled_task.status == ScheduledTaskStatus::Running {
                    match executor(scheduled_task.clone()).await {
                        Ok(scheduled_task) => {
                            let mut conn = state.get_agentdb_connection().await?;
                            if scheduled_task.status == ScheduledTaskStatus::Pending {
                                // The task is scheduled to run again in the future, return the time until the next task is scheduled to run.
                                scheduled_tasks::schedule_next_execution(&mut conn, &scheduled_task).await?;
                            } else {
                                // The task is completed, continue with the next task.
                                // TODO: Notify the user that the task has been completed.
                                scheduled_tasks::delete(&mut conn, &scheduled_task).await?;
                            }
                        }
                        Err(e) => {
                            error!(
                                "Failed to run the scheduled task '{}' (reason: {})",
                                &scheduled_task,
                                e.to_string()
                            );
                            let mut conn = state.get_agentdb_connection().await?;
                            scheduled_tasks::schedule_retry(&mut conn, &scheduled_task).await?;
                        }
                    }
                } else {
                    // The next task is not yet eligible, return the time until the next task is scheduled to run.
                    return Ok(Some(expires_in_ms));
                }
            }
            None => {
                // No more tasks to run, return `None` to stop the scheduler.
                return Ok(None);
            }
        }
    }
}

/// Run a scheduled task.
///
/// This function will execute the scheduled task and return an updated version of the task.
/// If the task execution fails an error is returned, otherwise the updated task is returned with the status set to
/// `ScheduledTaskStatus::Completed` if no further execution is required or `ScheduledTaskStatus::Pending` along the
/// time of the next execution in `scheduled_for` if the task is scheduled to run again in the future.
async fn run_scheduled_task(scheduled_task: ScheduledTask, state: ServerState) -> Result<ScheduledTask> {
    match scheduled_task.name {
        ScheduledTaskName::CleanupConnectionHistory => {
            todo!()
        }
        ScheduledTaskName::Vacuum => vacuum(scheduled_task, state).await,
    }
}

async fn vacuum(scheduled_task: ScheduledTask, state: ServerState) -> Result<ScheduledTask> {
    let mut conn = state.get_agentdb_connection().await?;
    let is_shutting_down: IsShuttingDownFn = Box::new({
        let state = state.clone();
        move || state.is_shutting_down()
    });

    // Delete all data related to queries no longer used.
    resources::queries::vacuum(&mut conn, is_shutting_down).await?;

    Ok(ScheduledTask { status: ScheduledTaskStatus::Completed, ..scheduled_task })
}
