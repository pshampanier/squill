use crate::err_internal;
use crate::jinja::JinjaEnvironment;
use crate::models::connections::{Connection, ConnectionInfo, ConnectionMode, Datasource};
use crate::models::ResourceType;
use crate::resources::Resource;
use anyhow::Result;
use futures::StreamExt;
use squill_drivers::async_conn::RowStream;
use std::collections::HashMap;
use uuid::Uuid;

const METADATA_DRIVER: &str = "driver";

/// Jinja template to get information about the connection/server.
///
/// Returns a statement which once executed returns a single row with the following columns:
///  - version: The version of the server (major.minor).
///  - description: The description of the server (ex: PostgreSQL 16.2 (Debian 16.2-1.pgdg120+2) on x86_64...).
///  - current_datasource: The name of the current database.
const JINJA_TEMPLATE_GET_CONNECTION_INFO: &str = r#"
{%- import 'macros.j2' as macros -%}
{{ macros.get_connection_info() }}
"#;

/// Jinja template to get the list of databases available on the server.
///
/// Returns a statement which once executed returns a a row for each database with the following columns:
///  - name: The name of the database.
///  - description: The description of the database.
///  - size_in_bytes: The size of the database in bytes.
const JINJA_TEMPLATE_LIST_DATASOURCES: &str = r#"
{%- import 'macros.j2' as macros -%}
{{ macros.list_datasources() }}
"#;

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
    fn metadata(&self) -> HashMap<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert(METADATA_DRIVER.to_string(), self.driver.clone());
        metadata
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
            default_datasource: String::new(),
            datasources: Vec::new(),
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

    /// Get information about the connection from the database itself.
    pub async fn get_info(
        &self,
        db_conn: &mut squill_drivers::async_conn::Connection,
        jinja_env: &JinjaEnvironment<'_>,
    ) -> Result<ConnectionInfo> {
        // First get the information about the connection
        let sql = jinja_env.render_str(JINJA_TEMPLATE_GET_CONNECTION_INFO, &self)?;
        db_conn
            .query_map_row(sql, None, |row| {
                let version: String = row.try_get("version")?;
                let description: String = row.try_get_nullable("description")?.unwrap_or(String::new());
                let current_datasource: String = row.try_get_nullable("current_datasource")?.unwrap_or(String::new());
                Ok(ConnectionInfo { backend_version: version, current_datasource, description })
            })
            .await?
            .ok_or(err_internal!("Failed to get connection info"))
    }

    /// Get the list of databases available on the server.
    pub async fn list_datasources(
        &self,
        db_conn: &mut squill_drivers::async_conn::Connection,
        jinja_env: &JinjaEnvironment<'_>,
    ) -> Result<Vec<Datasource>> {
        let sql = jinja_env.render_str(JINJA_TEMPLATE_LIST_DATASOURCES, &self)?;
        let mut datasources = Vec::<Datasource>::new();
        let mut stmt = db_conn.prepare(sql).await?;
        let mut rows: RowStream = stmt.query(None).await?.into();
        while let Some(row) = rows.next().await {
            let row = row?;
            let datasource_info = Datasource {
                name: row.try_get("name")?,
                description: row.try_get_nullable("description")?.unwrap_or(String::new()),
                size_in_bytes: row.try_get_nullable("size_in_bytes")?,
                hidden: false,
            };
            datasources.push(datasource_info);
        }
        Ok(datasources)
    }
}

#[cfg(test)]
mod tests {
    use crate::{jinja::JinjaEnvironment, models::Connection, utils::tests};
    use tokio_test::assert_ok;

    #[tokio::test]
    async fn test_get_info() {
        let (_base_dir, _conn_pool) = assert_ok!(tests::setup().await);
        let conn_def: Connection = Connection {
            driver: squill_drivers::sqlite::DRIVER_NAME.to_string(),
            uri: squill_drivers::sqlite::IN_MEMORY_URI.to_string(),
            ..Connection::default()
        };

        let mut conn = assert_ok!(squill_drivers::async_conn::Connection::open(&conn_def.uri).await);
        let jinja_env = JinjaEnvironment::new_from_driver(&conn_def.driver);
        let conn_info = assert_ok!(conn_def.get_info(&mut conn, &jinja_env).await);
        assert!(conn_info.backend_version.starts_with("3."));
        assert_eq!(conn_info.current_datasource, "main");
    }

    #[tokio::test]
    async fn test_list_datasources() {
        let (_base_dir, _conn_pool) = assert_ok!(tests::setup().await);
        let conn_def: Connection = Connection {
            driver: squill_drivers::sqlite::DRIVER_NAME.to_string(),
            uri: squill_drivers::sqlite::IN_MEMORY_URI.to_string(),
            ..Connection::default()
        };

        let mut conn = assert_ok!(squill_drivers::async_conn::Connection::open(&conn_def.uri).await);
        let jinja_env = JinjaEnvironment::new_from_driver(&conn_def.driver);
        let datasources = assert_ok!(conn_def.list_datasources(&mut conn, &jinja_env).await);
        assert_eq!(datasources.len(), 1);
    }
}
