/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;
use std::collections::HashMap;

/// The description of the capabilities of a driver.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DriverCapabilities {
    /// The driver is capable of executing SQL queries.
    Sql,

    /// The driver is capable of authenticating users using a username and password.
    AuthUserPassword,

    /// The driver is capable of authenticating users using a password only.
    AuthPassword,

    /// The driver is capable of connecting to a datasource using a connection string.
    ConnectString,

    /// The driver is capable of connecting host-based data source.
    ConnectHost,

    /// The driver is capable of connecting to a socket-based data source.
    ConnectSocket,

    /// The driver is capable of connecting to a file-based data source.
    ConnectFile,

    /// The driver is capable of connecting to a data source using a URI.
    ConnectUri,

    /// The driver is capable of opening a connection in read-only mode.
    ReadOnly,

    /// The driver is capable of connecting to a data source through SSL.
    ConnectSsl,

    /// The driver is limited to connect only one datasource through a given connection.
    SingleDatasource,
}

/// Convert DriverCapabilities to a `&str`.
impl AsRef<str> for DriverCapabilities {
    fn as_ref(&self) -> &str {
        match self {
            DriverCapabilities::Sql => "sql",
            DriverCapabilities::AuthUserPassword => "auth_user_password",
            DriverCapabilities::AuthPassword => "auth_password",
            DriverCapabilities::ConnectString => "connect_string",
            DriverCapabilities::ConnectHost => "connect_host",
            DriverCapabilities::ConnectSocket => "connect_socket",
            DriverCapabilities::ConnectFile => "connect_file",
            DriverCapabilities::ConnectUri => "connect_uri",
            DriverCapabilities::ReadOnly => "read_only",
            DriverCapabilities::ConnectSsl => "connect_ssl",
            DriverCapabilities::SingleDatasource => "single_datasource",
        }
    }
}

/// Convert DriverCapabilities to a string.
impl std::fmt::Display for DriverCapabilities {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a DriverCapabilities.
impl TryFrom<&str> for DriverCapabilities {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "sql" => Ok(DriverCapabilities::Sql),
            "auth_user_password" => Ok(DriverCapabilities::AuthUserPassword),
            "auth_password" => Ok(DriverCapabilities::AuthPassword),
            "connect_string" => Ok(DriverCapabilities::ConnectString),
            "connect_host" => Ok(DriverCapabilities::ConnectHost),
            "connect_socket" => Ok(DriverCapabilities::ConnectSocket),
            "connect_file" => Ok(DriverCapabilities::ConnectFile),
            "connect_uri" => Ok(DriverCapabilities::ConnectUri),
            "read_only" => Ok(DriverCapabilities::ReadOnly),
            "connect_ssl" => Ok(DriverCapabilities::ConnectSsl),
            "single_datasource" => Ok(DriverCapabilities::SingleDatasource),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// A driver that can be used to connect to a datasource.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct Driver {
    /// The capabilities of the driver.
    pub capabilities: Vec<DriverCapabilities>,

    /// The default connection settings of the driver.
    pub defaults: HashMap<String, String>,

    /// The description of the driver.
    pub description: String,

    /// The icon of the driver (should be a filename, e.g. "postgresql.svg").
    pub icon: String,

    /// The label of the driver (should be human-readable, e.g. "PostgreSQL").
    pub label: String,

    /// The name of the driver (should be an identifier, e.g. "postgresql").
    pub name: String,
}
