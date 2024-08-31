use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::datasources::Datasource;

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionMode {
    #[default]
    Host,
    Socket,
    File,
    ConnectionString,
}

#[derive(Serialize, Deserialize, Default)]
pub struct Connection {
    pub id: Uuid,

    pub parent_id: Uuid,

    pub owner_user_id: Uuid,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub driver: String,
    pub name: String,
    pub alias: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub description: String,

    pub mode: ConnectionMode,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub host: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub socket: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub file: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub connection_string: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub username: String,

    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub password: String,

    #[serde(default)]
    pub save_password: bool,

    /// The default datasource to use.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub datasource: String,

    /// Datasources available through this connection.
    #[serde(default)]
    pub datasources: Vec<Datasource>,
}
