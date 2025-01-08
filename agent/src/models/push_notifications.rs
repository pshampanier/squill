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

/// Convert PushMessageType to a `&str`.
impl AsRef<str> for PushMessageType {
    fn as_ref(&self) -> &str {
        match self {
            PushMessageType::Log => "log",
            PushMessageType::Query => "query",
        }
    }
}

/// Convert PushMessageType to a string.
impl std::fmt::Display for PushMessageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a PushMessageType.
impl TryFrom<&str> for PushMessageType {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "log" => Ok(PushMessageType::Log),
            "query" => Ok(PushMessageType::Query),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// The level of the message sent through a the Push Notification Channel.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LogLevel {
    Info,
    Warning,
    Error,
}

/// Convert LogLevel to a `&str`.
impl AsRef<str> for LogLevel {
    fn as_ref(&self) -> &str {
        match self {
            LogLevel::Info => "info",
            LogLevel::Warning => "warning",
            LogLevel::Error => "error",
        }
    }
}

/// Convert LogLevel to a string.
impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a LogLevel.
impl TryFrom<&str> for LogLevel {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "info" => Ok(LogLevel::Info),
            "warning" => Ok(LogLevel::Warning),
            "error" => Ok(LogLevel::Error),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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
