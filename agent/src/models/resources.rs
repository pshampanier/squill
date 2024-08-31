use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    Connection,
    Environment,
    Folder,
    User,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResourceRef {
    /// Unique identifier of the resource.
    pub id: Uuid,

    /// Unique identifier of the parent resource.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<Uuid>,

    /// The user that owns the resource.
    pub owner_user_id: Uuid,

    /// Type of the resource.
    #[serde(rename = "type")]
    pub resource_type: ResourceType,

    /// Name of the resource.
    pub name: String,

    /// Additional meta data.
    ///
    /// Metadata are key-value pairs that provide additional information without having to load the resource itself.
    /// For example, the content type of a folder, or the driver of a connection.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}
