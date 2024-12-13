use crate::models::user_settings::UserSettings;
use crate::models::variables::Variable;
use serde::{Deserialize, Serialize};

use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub user_id: Uuid,
    pub settings: UserSettings,
    pub variables: Vec<Variable>,
}
