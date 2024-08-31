use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContentType {
    Connections,
    Environments,
    Favorites,
}

impl AsRef<str> for ContentType {
    fn as_ref(&self) -> &str {
        match self {
            ContentType::Connections => "connections",
            ContentType::Environments => "environments",
            ContentType::Favorites => "favorites",
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Folder {
    /// The unique identifier of the folder.
    pub folder_id: Uuid,

    /// The unique identifier of the parent resource in the catalog.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<Uuid>,

    /// The unique identifier of the user that owns the folder.
    pub owner_user_id: Uuid,

    /// The name of the folder.
    pub name: String,

    /// The type of catalog items the folder accepts.
    pub content_type: ContentType,
}
