use serde::{ Deserialize, Serialize };

use crate::models::environments::Environment;
use crate::models::variables::Variable;

#[derive(Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: String,
    pub environments: Vec<Environment>,
    pub variables: Vec<Variable>,
}

impl Default for Workspace {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            description: String::new(),
            environments: Vec::new(),
            variables: Vec::new(),
        }
    }
}
