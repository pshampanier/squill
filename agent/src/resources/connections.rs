use crate::models::connections::{Connection, ConnectionMode};
use crate::models::ResourceType;
use crate::resources::Resource;
use anyhow::Result;
use std::collections::HashMap;
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
    fn metadata(&self) -> HashMap<String, String> {
        HashMap::new()
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
}
