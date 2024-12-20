/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;
use std::collections::HashMap;

/// The mode of a connection.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionMode {
    /// The connection is a host-based connection.
    Host,

    /// The connection is a socket-based connection.
    Socket,

    /// The connection is a file-based connection.
    File,

    /// The connection is a connection string-based connection.
    ConnectionString,

    /// The connection is a URI-based connection.
    Uri,
}

/// Options for a connection.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionOption {
    /// Opens the connection in read-only mode. Write will be prohibited.
    ReadOnly,
}

/// The description of a datasource (database for SQL engines).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct Datasource {
    /// The description of the datasource (e.g. "My database").
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub description: String,

    /// A flag indicating if the datasource is hidden in the user interface.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub hidden: bool,

    /// The name of the datasource (e.g. "my_database").
    pub name: String,

    /// The size of the datasource in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_in_bytes: Option<i64>,
}

/// Description of a connection to a datasource.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct ConnectionInfo {
    /// The version of the server (e.g. "9.0.1").
    pub backend_version: String,

    /// The name of the current datasource (e.g. "my_database").
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub current_datasource: String,

    /// The description of the connection (e.g. "Server version: 9.0.1 MySQL Community Server - GPL").
    pub description: String,
}

/// Definition of a connection to datasources.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct Connection {
    /// The alias of the connection.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub alias: String,

    /// The connection string of the connection.if the connection mode is "connection_string".
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub connection_string: String,

    /// The list of datasources available for the connection.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub datasources: Vec<Datasource>,

    /// The name of the default datasource to use.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub default_datasource: String,

    /// The description of the connection.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub description: String,

    /// The name of the driver used to connect to the datasource.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub driver: String,

    /// The file of the connection.if the connection mode is "file".
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub file: String,

    /// The host of the connection.if the connection mode is "host".
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub host: String,

    /// The unique identifier of the connection.
    pub id: uuid::Uuid,

    pub mode: ConnectionMode,

    /// The name of the connection.
    pub name: String,

    /// Additional options of the connection.
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub options: HashMap<String, String>,

    /// The unique identifier of the user that owns the connection.
    pub owner_user_id: uuid::Uuid,

    /// The unique identifier of the parent resource in the catalog.
    pub parent_id: uuid::Uuid,

    /// The password for authentication.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub password: String,

    /// The port of the connection.if the connection mode is "host".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,

    /// Whether the password should be saved.
    pub save_password: bool,

    /// The socket of the connection.if the connection mode is "socket".
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub socket: String,

    /// The URI of the connection.if the connection mode is "uri".
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub uri: String,

    /// The username for authentication.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub username: String,
}
