use crate::models::folders::ContentType;
use crate::models::resources::ResourceType;
use crate::models::Folder;
use crate::resources::Resource;
use uuid::Uuid;

/// The name of the field that stores the content type of a folder.
pub const METADATA_CONTENT_TYPE: &str = "content_type";

impl Folder {
    pub fn new<T: Into<String>>(parent_id: Uuid, name: T, owner_user_id: Uuid, content_type: ContentType) -> Self {
        Self { folder_id: Uuid::new_v4(), parent_id, name: name.into(), owner_user_id, content_type }
    }
}

/// Implement the `Resource` trait for `Folder`.
impl Resource for Folder {
    fn id(&self) -> Uuid {
        self.folder_id
    }

    fn parent_id(&self) -> Uuid {
        self.parent_id
    }

    fn name(&self) -> &str {
        self.name.as_str()
    }

    fn owner_user_id(&self) -> Uuid {
        self.owner_user_id
    }

    fn resource_type(&self) -> ResourceType {
        ResourceType::Folder
    }

    fn metadata(&self) -> Option<std::collections::HashMap<String, String>> {
        let mut metadata = std::collections::HashMap::new();
        metadata.insert(METADATA_CONTENT_TYPE.to_string(), self.content_type.as_ref().to_string());
        Some(metadata)
    }

    fn from_storage(parent_id: Uuid, name: String, resource: serde_json::Value) -> anyhow::Result<Self>
    where
        Self: Sized,
    {
        let folder: Folder = serde_json::from_value(resource)?;
        if folder.parent_id == parent_id && folder.name == name {
            Ok(folder)
        } else {
            Ok(Folder { parent_id, name, ..folder })
        }
    }
}
