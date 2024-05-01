use std::collections::HashMap;
use serde::{ Deserialize, Serialize };

pub const DRIVER_PORT: &str = "PORT";
pub const DRIVER_USER: &str = "USER";
pub const DRIVER_HOST: &str = "HOST";
pub const DRIVER_SOCKET: &str = "SOCKET";
pub const DRIVER_CONNECTION_STRING: &str = "CONNECTION_STRING";
pub const DRIVER_CONNECT_MODE: &str = "CONNECTION_MODE";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    /// This capability indicates the data source is supporting SQL.
    Sql,

    /// This capability is used to connect to a database using a username and password.
    AuthUserPassword,

    /// This capability is used to connect to a data source using a password only.
    AuthPassword,

    /// This capability is used to connect to a data source using a connection string.
    ConnectString,

    /// This capability is used to connect to a host-based data source.
    ConnectHost,

    /// This capability is used to connect to a socket-based data source.
    ConnectSocket,

    /// This capability is used to connect to a file-based data source.
    ConnectFile,

    /// This capability states the data source support read-only mode.
    ReadOnly,

    /// This capability is used to connect to a data source using SSL.
    ConnectSsl,
}

#[derive(Serialize, Deserialize, Default)]
pub struct Driver {
    /// The name of the driver (should be an identifier, e.g. "postgresql")
    pub name: String,

    /// The label of the driver (should be human-readable, e.g. "PostgreSQL")
    pub label: String,

    /// The icon of the driver (should be a filename, e.g. "postgresql.svg")
    pub icon: String,

    /// The description of the driver
    pub description: String,

    /// The capabilities of the driver
    pub capabilities: Vec<Capability>,

    /// The default connection settings of the driver
    pub defaults: HashMap<String, String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_driver() {
        let driver: Driver = Driver {
            name: "postgresql".to_string(),
            label: "PostgreSQL".to_string(),
            icon: "postgresql.svg".to_string(),
            description: "PostgreSQL is...".to_string(),
            capabilities: vec![
                Capability::Sql,
                Capability::AuthUserPassword,
                Capability::ConnectString,
                Capability::ConnectHost,
                Capability::ConnectSocket
            ],
            defaults: HashMap::from([
                (DRIVER_PORT.to_string(), "5432".to_string()),
                (DRIVER_USER.to_string(), "postgres".to_string()),
            ]),
        };
        println!("{}", serde_json::to_string_pretty(&driver).unwrap());
    }
}
