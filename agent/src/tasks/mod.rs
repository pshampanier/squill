use crate::Result;
use futures::future::BoxFuture;
use tracing::error;

// Should be private...
pub mod queries;

pub use queries::execute_queries_task;

pub type TaskFn = Box<dyn FnOnce() -> BoxFuture<'static, Result<()>> + Send + Sync>;

/// A queue of tasks that can be executed concurrently.
pub struct TasksQueue {
    max_concurrency: usize,
    sender: flume::Sender<TaskFn>,
    receiver: flume::Receiver<TaskFn>,
}

impl TasksQueue {
    pub fn new(cap: usize, max_concurrency: usize) -> Self {
        let (sender, receiver) = flume::bounded(cap);
        Self { max_concurrency, sender, receiver }
    }

    /// Push a task into the queue.
    ///
    /// The task will be executed by one of the worker threads.
    /// The returned result indicates whether the task was successfully pushed into the queue. It does not indicate
    /// whether the task was successfully executed.
    pub async fn push(&self, task: TaskFn) -> Result<()> {
        self.sender.send_async(task).await?;
        Ok(())
    }

    /// Check if the queue is empty.
    #[cfg(test)]
    pub fn is_empty(&self) -> bool {
        self.receiver.is_empty()
    }

    /// Start the consumers.
    pub async fn start(&self) {
        for _ in 0..self.max_concurrency {
            let rx = self.receiver.clone();
            tokio::spawn(async move {
                while let Ok(task) = rx.recv_async().await {
                    task().await.unwrap_or_else(|e| {
                        error!("Task failed: {:?}", e);
                    });
                }
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Result;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };

    fn task(counter: Arc<AtomicUsize>) -> BoxFuture<'static, Result<()>> {
        Box::pin(async move {
            counter.fetch_add(1, Ordering::Relaxed);
            Ok(())
        })
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn test_tasks_queue() {
        let counter = Arc::new(AtomicUsize::new(0));
        let queue = TasksQueue::new(10, 2);
        queue.start().await;

        for _ in 0..100 {
            let counter = Arc::clone(&counter);
            queue.push(Box::new(move || Box::pin(task(counter)))).await.unwrap();
        }

        // Ensure the channel is empty
        while !queue.is_empty() {
            tokio::task::yield_now().await;
        }

        // Even if the queue is empty, the tasks may still be running... so we need to wait a bit (up to 1 second)
        tokio::task::yield_now().await;
        for _ in 0..10 {
            if counter.load(Ordering::Relaxed) == 100 {
                break;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
        assert_eq!(counter.load(Ordering::Relaxed), 100);
    }
}
