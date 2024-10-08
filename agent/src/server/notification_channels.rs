use crate::models::QueryExecution;
use crate::models::{PushMessage, PushMessageType};
use axum::extract::ws::{Message, WebSocket};
use futures::future::BoxFuture;
use futures::stream::SplitSink;
use futures::SinkExt;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{debug, error};
use uuid::Uuid;

pub struct NotificationChannel {
    sender: Arc<Mutex<SplitSink<WebSocket, Message>>>,
}

/// A trait that can be implemented by the server state to push notifications to the client.
pub trait PushNotificationService {
    /// Push a notification to the client through the notification channel.
    fn push_notification(&self, user_session_id: Uuid, message: impl Into<PushMessage>) -> BoxFuture<'_, ()>;
}

impl From<QueryExecution> for PushMessage {
    fn from(query_execution: QueryExecution) -> Self {
        Self { log: None, query: Some(query_execution), silent: true, message_type: PushMessageType::Query }
    }
}

impl NotificationChannel {
    pub fn new(sender: SplitSink<WebSocket, Message>) -> Self {
        Self { sender: Arc::new(Mutex::new(sender)) }
    }

    pub async fn push<T: Into<PushMessage>>(&self, message: T) {
        let sender = Arc::clone(&self.sender);
        match serde_json::to_string(&message.into()) {
            Ok(json_message) => {
                debug!("Sending notification: {}", json_message);
                let mut mutex_guard = sender.lock().await;
                if let Err(e) = mutex_guard.send(Message::Text(json_message)).await {
                    error!("Failed to send notification: {}", e);
                }
            }
            Err(e) => {
                error!("Failed to serialize notification: {}", e);
            }
        }
    }
}
