use serde::{ Deserialize, Serialize };

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
    pub id: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub driver: String,
    pub name: String,
    pub alias: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub description: String,

    pub mode: ConnectionMode,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub host: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub socket: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub file: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub connection_string: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub username: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub password: String,
    pub save_password: bool,

    pub datasources: Vec<Datasource>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection() {
        let connection: Connection = Connection {
            id: "postgresql".to_string(),
            driver: "postgresql".to_string(),
            name: "PostgreSQL".to_string(),
            alias: "conn".to_string(),
            description: "PostgreSQL is...".to_string(),

            mode: ConnectionMode::Host,
            host: "localhost".to_string(),
            port: Some(5432),
            socket: "".to_string(),
            file: "".to_string(),
            connection_string: "".to_string(),
            save_password: false,

            username: "postgres".to_string(),
            password: "password".to_string(),

            datasources: vec![Datasource {
                name: "template1".to_string(),
                alias: None,
            }],
        };
        println!("{}", serde_json::to_string_pretty(&connection).unwrap());
    }
}
