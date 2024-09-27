use crate::models::connections::{Connection, ConnectionMode};
use crate::models::ResourceType;
use crate::resources::Resource;
use anyhow::Result;
use std::collections::{BTreeMap, HashMap};
use uuid::Uuid;

impl Resource for Connection {
    fn id(&self) -> Uuid {
        self.id
    }
    fn name(&self) -> &str {
        &self.name
    }
    fn parent_id(&self) -> Uuid {
        self.parent_id
    }
    fn owner_user_id(&self) -> Uuid {
        self.owner_user_id
    }
    fn resource_type(&self) -> ResourceType {
        ResourceType::Connection
    }
    fn metadata(&self) -> Option<std::collections::HashMap<String, String>> {
        None
    }

    fn from_storage(parent_id: Uuid, name: String, resource: serde_json::Value) -> Result<Self>
    where
        Self: Sized,
    {
        let connection: Connection = serde_json::from_value(resource)?;
        if connection.parent_id == parent_id && connection.name == name {
            Ok(connection)
        } else {
            Ok(Connection { parent_id, name, ..connection })
        }
    }
}

impl Default for Connection {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            owner_user_id: uuid::Uuid::nil(),
            parent_id: uuid::Uuid::nil(),
            name: "conn".to_string(),
            mode: ConnectionMode::Host,
            save_password: false,
            port: None,
            host: String::new(),
            socket: String::new(),
            file: String::new(),
            connection_string: String::new(),
            username: String::new(),
            password: String::new(),
            alias: String::new(),
            description: String::new(),
            datasource: String::new(),
            driver: String::new(),
            uri: String::new(),
            options: HashMap::new(),
        }
    }
}

impl Connection {
    pub fn new(owner_user_id: Uuid, name: String) -> Connection {
        Connection {
            id: uuid::Uuid::new_v4(),
            owner_user_id,
            alias: "conn".to_string(),
            name,
            save_password: false,
            ..Default::default()
        }
    }

    /// Convert the connection to a PostgreSQL connection string
    fn to_postgres_uri(&self) -> Result<String> {
        // Escape a value for use in a PostgreSQL connection string.
        //
        // To write an empty value, or a value containing spaces, surround it with single quotes, for example 'a value'.
        // Single quotes and backslashes within a value must be escaped with a backslash, i.e., \' and \\.
        fn escape(value: &str) -> String {
            let mut ev = value.to_string();
            ev = ev.replace('\\', "\\\\");
            ev = ev.replace('\'', "\\'");
            if ev.is_empty() || ev.contains(' ') {
                format!("'{}'", ev)
            } else {
                ev
            }
        }

        // Collect key/values to be added to the connection string
        // The order of the key/values is not important but still we are using a BTreeMap to keep them sorted for easier
        // testing...
        let mut map: BTreeMap<String, String> = BTreeMap::new();

        if !self.username.is_empty() {
            map.insert("user".to_string(), self.username.clone());
        }

        if !self.password.is_empty() {
            map.insert("password".to_string(), self.password.clone());
        }

        match self.mode {
            ConnectionMode::Host => {
                map.insert("host".to_string(), self.host.clone());
                if let Some(port) = self.port {
                    map.insert("port".to_string(), port.to_string());
                }
            }
            ConnectionMode::Socket => {
                map.insert("host".to_string(), self.socket.clone());
            }
            ConnectionMode::File => {
                return Err(anyhow::anyhow!("File mode is not supported by PostgreSQL"));
            }
            ConnectionMode::ConnectionString => {
                if self.connection_string.starts_with("postgresql://")
                    || self.connection_string.starts_with("postgres://")
                {
                    // This is a connection URI, all key/values collected so far can be added as query parameters
                    // See: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING-URIS
                    let mut uri = self.connection_string.clone();
                    if !map.is_empty() {
                        if uri.contains('?') {
                            uri.push('&');
                        } else {
                            uri.push('?');
                        }
                        uri.push_str(
                            &map.into_iter()
                                .map(|(key, value)| format!("{}={}", key, urlencoding::encode(&value)))
                                .collect::<Vec<_>>()
                                .join("&"),
                        );
                    }
                    return Ok(uri);
                } else {
                    // Append additional key/values to the connection string
                    let mut connection_string = self.connection_string.clone();
                    if !map.is_empty() {
                        connection_string.push(' ');
                        connection_string.push_str(
                            &map.into_iter()
                                .map(|(key, value)| format!("{}={}", key, escape(&value)))
                                .collect::<Vec<_>>()
                                .join(" "),
                        );
                    }
                    return Ok(connection_string);
                }
            }
            ConnectionMode::Uri => {
                // TODO: Implement this method
                todo!()
            }
        }

        // Build the connection string
        let connection_string: String =
            map.into_iter().map(|(key, value)| format!("{}={}", key, escape(&value))).collect::<Vec<_>>().join(" ");

        Ok(connection_string)
    }
}
