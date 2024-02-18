use serde::{ Deserialize, Serialize };

#[derive(Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub connection_string: String,
}

impl Default for Connection {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            description: String::new(),
            connection_string: String::new(),
        }
    }
}
