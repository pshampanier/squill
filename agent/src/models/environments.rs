use crate::models::variables::Variable;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Environment {
    pub id: Uuid,

    pub parent_id: Uuid,

    pub owner_user_id: Uuid,

    pub name: String,

    #[serde(skip_serializing_if = "String::is_empty")]
    pub description: String,

    #[serde(rename = "ref")]
    pub connections: Vec<Uuid>,
    pub variables: Vec<Variable>,
}
