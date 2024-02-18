use serde::{ Deserialize, Serialize };
use crate::models::connections::Connection;
use crate::models::variables::Variable;

#[derive(Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "ref")]
    pub reference: String,
    pub connections: Vec<Connection>,
    pub variables: Vec<Variable>,
}

impl Default for Environment {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            description: String::new(),
            reference: String::new(),
            connections: Vec::new(),
            variables: Vec::new(),
        }
    }
}
