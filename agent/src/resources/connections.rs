use std::collections::BTreeMap;
use anyhow::Result;
use crate::models::connections::{ Connection, ConnectionMode };
use crate::resources::Resource;

impl Resource for Connection {
    fn id(&self) -> &str {
        self.id.as_str()
    }

    fn name(&self) -> &str {
        self.name.as_str()
    }
}

impl Connection {
    pub fn new(name: String) -> Connection {
        Connection {
            id: uuid::Uuid::new_v4().to_string(),
            alias: "conn".to_string(),
            name,
            save_password: false,
            ..Default::default()
        }
    }

    pub fn to_connection_string(&self) -> Result<String> {
        match self.driver.as_str() {
            "postgresql" => self.to_postgres_connection_string(),
            "sqlite" => self.to_sqlite_connection_string(),
            _ => Err(anyhow::anyhow!("Unsupported driver: {}", self.driver)),
        }
    }

    /// Convert the connection to a PostgreSQL connection string
    fn to_postgres_connection_string(&self) -> Result<String> {
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
                map.insert("socket".to_string(), self.socket.clone());
            }
            ConnectionMode::File => {
                return Err(anyhow::anyhow!("File mode is not supported by PostgreSQL"));
            }
            ConnectionMode::ConnectionString => {
                if
                    self.connection_string.starts_with("postgresql://") ||
                    self.connection_string.starts_with("postgres://")
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
                            &map
                                .into_iter()
                                .map(|(key, value)| format!("{}={}", key, urlencoding::encode(&value)))
                                .collect::<Vec<_>>()
                                .join("&")
                        );
                    }
                    return Ok(uri);
                } else {
                    // Append additional key/values to the connection string
                    let mut connection_string = self.connection_string.clone();
                    if !map.is_empty() {
                        connection_string.push(' ');
                        connection_string.push_str(
                            &map
                                .into_iter()
                                .map(|(key, value)| format!("{}={}", key, escape(&value)))
                                .collect::<Vec<_>>()
                                .join(" ")
                        );
                    }
                    return Ok(connection_string);
                }
            }
        }

        // Build the connection string
        let connection_string: String = map
            .into_iter()
            .map(|(key, value)| format!("{}={}", key, escape(&value)))
            .collect::<Vec<_>>()
            .join(" ");

        Ok(connection_string)
    }

    // TODO: Implement this method
    fn to_sqlite_connection_string(&self) -> Result<String> {
        todo!("Implement Connection::to_sqlite_connection_string")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_postgres_connection_string() {
        // Host mode
        assert_eq!(
            (Connection {
                driver: "postgresql".to_string(),
                mode: ConnectionMode::Host,
                host: "localhost".to_string(),
                port: Some(5432),
                username: "postgres".to_string(),
                password: "pass".to_string(),
                ..Default::default()
            })
                .to_connection_string()
                .unwrap(),
            "host=localhost password=pass port=5432 user=postgres"
        );

        // Using an URI
        assert_eq!(
            (Connection {
                driver: "postgresql".to_string(),
                mode: ConnectionMode::ConnectionString,
                connection_string: "postgresql://localhost:5432".to_string(),
                username: "postgres".to_string(),
                password: "pass?".to_string(),
                ..Default::default()
            })
                .to_connection_string()
                .unwrap(),
            "postgresql://localhost:5432?password=pass%3F&user=postgres"
        );

        assert_eq!(
            (Connection {
                driver: "postgresql".to_string(),
                mode: ConnectionMode::ConnectionString,
                connection_string: "postgresql://localhost?sslmode=require".to_string(),
                username: "postgres".to_string(),
                ..Default::default()
            })
                .to_connection_string()
                .unwrap(),
            "postgresql://localhost?sslmode=require&user=postgres"
        );

        // Using a connection string
        assert_eq!(
            (Connection {
                driver: "postgresql".to_string(),
                mode: ConnectionMode::ConnectionString,
                connection_string: "host=localhost port=5432 dbname=db connect_timeout=10".to_string(),
                username: "postgres".to_string(),
                password: "pa'ss".to_string(),
                ..Default::default()
            })
                .to_connection_string()
                .unwrap(),
            "host=localhost port=5432 dbname=db connect_timeout=10 password=pa\\'ss user=postgres"
        );

        // Socket mode
        assert_eq!(
            (Connection {
                driver: "postgresql".to_string(),
                mode: ConnectionMode::Socket,
                socket: "/var/run/postgres/.s.PGSQL.5432".to_string(),
                ..Default::default()
            })
                .to_connection_string()
                .unwrap(),
            "socket=/var/run/postgres/.s.PGSQL.5432"
        );

        // File mode (not supported)
        assert!(
            (Connection {
                driver: "postgresql".to_string(),
                mode: ConnectionMode::File,
                file: "/tmp/file".to_string(),
                ..Default::default()
            })
                .to_connection_string()
                .is_err()
        );
    }
}
