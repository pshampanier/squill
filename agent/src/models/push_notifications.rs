/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use crate::models::QueryExecution;
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;

/// The type of a Push Notification.
///
/// The type of the notification is used to determine the structure of the notification object.
/// It could be either a message or a query execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PushMessageType {
    Log,
    Query,
}

/// The level of the message sent through a the Push Notification Channel.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LogLevel {
    Info,
    Warning,
    Error,
}

/// A log message sent by the agent to the client through the Push Notification Channel.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct Log {
    pub level: LogLevel,

    /// The log message.
    pub message: String,
}

/// A Push Notification sent by the agent to the client through the Notification Channel.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct PushMessage {
    /// A info/warning/error log message if the type is `log`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub log: Option<Log>,

    /// An updated query execution if the type is `query`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub query: Option<QueryExecution>,

    /// A flag indicating if the notification should be displayed to the user.
    pub silent: bool,

    #[serde(rename = "type")]
    pub message_type: PushMessageType,
}
