use crate::models::Collection;
use crate::models::ResourceType;
use crate::resources::Resource;
use std::collections::HashMap;
use uuid::Uuid;

pub const METADATA_RESOURCES_TYPE: &str = "resources_type";
pub const METADATA_SPECIAL: &str = "special";

impl Default for Collection {
    fn default() -> Self {
        Self {
            collection_id: Uuid::new_v4(),
            parent_id: Uuid::nil(),
            name: String::new(),
            owner_user_id: Uuid::nil(),
            resources_type: None,
            special: None,
        }
    }
}

/// Implement the `Resource` trait for [Collection].
impl Resource for Collection {
    fn id(&self) -> Uuid {
        self.collection_id
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
        ResourceType::Collection
    }

    fn metadata(&self) -> HashMap<String, String> {
        let mut metadata = std::collections::HashMap::<String, String>::new();
        if let Some(resources_type) = &self.resources_type {
            metadata.insert(METADATA_RESOURCES_TYPE.to_string(), resources_type.to_string());
        }
        if let Some(special) = &self.special {
            metadata.insert(METADATA_SPECIAL.to_string(), special.to_string());
        }
        metadata
    }

    /// Deserialize a collection from storage.
    ///
    /// The serialized `resource` can be outdated because renaming or moving an item in the catalog will not
    /// alter the serialized version of the item in the storage. This method is using the `parent_id` and
    /// `name` to make sure to return the right definition of the collection.
    fn from_storage(parent_id: Uuid, name: String, resource: serde_json::Value) -> anyhow::Result<Self>
    where
        Self: Sized,
    {
        let collection: Collection = serde_json::from_value(resource)?;
        if collection.parent_id == parent_id && collection.name == name {
            Ok(collection)
        } else {
            Ok(Collection { parent_id, name, ..collection })
        }
    }
}
