use crate::models::QueryExecution;
use axum::extract::ws::{Message, WebSocket};
use futures::stream::SplitSink;
use futures::SinkExt;
use serde::{ser::SerializeStruct, Serialize, Serializer};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::error;

pub enum Notification {
    #[allow(dead_code)]
    Error(String),
    QueryExecution(QueryExecution),
}

impl From<QueryExecution> for Notification {
    fn from(query_execution: QueryExecution) -> Self {
        Notification::QueryExecution(query_execution)
    }
}

impl Serialize for Notification {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("Notification", 2)?;
        match self {
            Notification::Error(message) => {
                state.serialize_field("type", "error")?;
                state.serialize_field("error", message)?;
            }
            Notification::QueryExecution(query_execution) => {
                state.serialize_field("type", "query_execution")?;
                state.serialize_field("query_execution", query_execution)?;
            }
        }
        state.end()
    }
}

pub struct NotificationChannel {
    sender: Arc<Mutex<SplitSink<WebSocket, Message>>>,
}

impl NotificationChannel {
    pub fn new(sender: SplitSink<WebSocket, Message>) -> Self {
        Self { sender: Arc::new(Mutex::new(sender)) }
    }

    pub async fn push<N: Into<Notification>>(&self, notification: N) {
        let sender = Arc::clone(&self.sender);
        match serde_json::to_string(&notification.into()) {
            Ok(notification) => {
                let mut mutex_guard = sender.lock().await;
                if let Err(e) = mutex_guard.send(Message::Text(notification)).await {
                    error!("Failed to send notification: {}", e);
                }
            }
            Err(e) => {
                error!("Failed to serialize notification: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_notification_channel() {
        assert_eq!(
            serde_json::to_string(&Notification::from(QueryExecution {
                id: Uuid::parse_str("f5330ffa-1f3c-427b-82f4-0756a12fc064").unwrap(),
                query: "SHOW".to_string(),
                is_result_set_query: None,
                status: crate::models::QueryExecutionStatus::Completed,
                created_at: chrono::DateTime::parse_from_rfc3339("2024-09-14T15:16:23.630794Z").unwrap().to_utc(),
                affected_rows: 0,
                connection_id: Uuid::parse_str("bb7eab84-5d50-42bf-b133-6c73d2a728d2").unwrap(),
                error: None,
                executed_at: None,
                execution_time: 0.,
                user_id: Uuid::parse_str("86770c76-4029-4253-84e0-1fcc81e2e921").unwrap(),
            }))
            .unwrap(),
            r#"{
                "type": "query_execution",
                "query_execution": {
                    "affected_rows": 0,
                    "connection_id": "bb7eab84-5d50-42bf-b133-6c73d2a728d2",
                    "created_at": "2024-09-14T15:16:23.630794Z",
                    "execution_time": 0.0,
                    "id": "f5330ffa-1f3c-427b-82f4-0756a12fc064",
                    "query": "SHOW",
                    "status": "completed",
                    "user_id": "86770c76-4029-4253-84e0-1fcc81e2e921"
                }
            }"#
            .replace(['\n', ' '], "")
        );
    }
}
