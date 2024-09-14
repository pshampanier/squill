use crate::Result;
use futures::future::BoxFuture;
use tracing::error;

pub mod queries;

pub trait Task {
    fn execute(&self) -> BoxFuture<'_, Result<()>>;
}

/// A queue of tasks that can be executed concurrently.
pub struct TasksQueue {
    max_concurrency: usize,
    sender: flume::Sender<Box<dyn Task + Send + Sync>>,
    receiver: flume::Receiver<Box<dyn Task + Send + Sync>>,
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
    pub async fn push(&self, task: Box<dyn Task + Send + Sync>) -> Result<()> {
        self.sender.send_async(task).await?;
        Ok(())
    }

    /// Check if the queue is empty.
    pub fn is_empty(&self) -> bool {
        self.receiver.is_empty()
    }

    /// Start the consumers.
    pub async fn start(&self) {
        for _ in 0..self.max_concurrency {
            let rx = self.receiver.clone();
            tokio::spawn(async move {
                while let Ok(task) = rx.recv_async().await {
                    task.execute().await.unwrap_or_else(|e| {
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
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn test_tasks_queue() {
        struct TestTask {
            counter: Arc<AtomicUsize>,
        }

        impl Task for TestTask {
            fn execute(&self) -> BoxFuture<'_, Result<()>> {
                Box::pin(async move {
                    self.counter.fetch_add(1, Ordering::Relaxed);
                    Ok(())
                })
            }
        }

        let counter = Arc::new(AtomicUsize::new(0));
        let mut queue = TasksQueue::new(10, 2);
        queue.start().await;

        for _ in 0..100 {
            queue.push(Box::new(TestTask { counter: counter.clone() })).await.unwrap();
        }

        // Ensure the channel is empty
        while !queue.is_empty() {
            tokio::task::yield_now().await;
        }

        assert_eq!(counter.load(Ordering::Relaxed), 100);
    }
}
