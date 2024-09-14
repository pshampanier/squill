use crate::models::QueryExecution;
use axum::extract::ws::{Message, WebSocket};
use futures::stream::SplitSink;
use serde::Serialize;

#[derive(Serialize)]
pub enum Notification {
    Error(String),
    QueryExecution(QueryExecution),
}

pub struct NotificationChannel {
    sender: SplitSink<WebSocket, Message>,
}

impl NotificationChannel {
    pub fn new(sender: SplitSink<WebSocket, Message>) -> Self {
        Self { sender }
    }

    pub async fn push(&self, notification: Notification) {
        todo!();
    }
}
