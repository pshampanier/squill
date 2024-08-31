use std::collections::HashMap;

use crate::models::resources::ResourceRef;
use crate::models::ResourceType;
use crate::Result;
use serde::Serialize;
use serde_json::Value;
use uuid::Uuid;

pub mod catalog;
pub mod connections;
pub mod environments;
pub mod folders;
pub mod users;

/// The type of a resource.
impl ResourceType {
    pub fn as_str(&self) -> &str {
        match self {
            ResourceType::User => "user",
            ResourceType::Connection => "connection",
            ResourceType::Folder => "folder",
            ResourceType::Environment => "environment",
        }
    }

    pub fn from_str(s: &str) -> Result<ResourceType> {
        match s {
            "user" => Ok(ResourceType::User),
            "connection" => Ok(ResourceType::Connection),
            "folder" => Ok(ResourceType::Folder),
            "environment" => Ok(ResourceType::Environment),
            _ => Err(anyhow::anyhow!("Unknown resource type: {}", s)),
        }
    }
}

/// A trait to be implemented by resources.
///
/// This trait is used to provide a common interface for all resources.
pub trait Resource
where
    Self: Serialize,
{
    /// Unique identifier of the resource.
    fn id(&self) -> &Uuid;

    /// Unique identifier of the parent resource.
    fn parent_id(&self) -> Option<Uuid>;

    /// The user that owns the resource.
    fn owner_user_id(&self) -> &Uuid;

    /// Name of the resource.
    fn name(&self) -> &str;

    /// Type of the resource.
    fn resource_type(&self) -> ResourceType;

    /// A map of key-value pairs containing additional meta data.
    fn metadata(&self) -> Option<HashMap<String, String>>;

    /// Create a new instance of the resource from a persistent storage.
    ///
    /// The `resource` parameter is the raw JSON data loaded from the persistent storage.
    /// Because the `resource` parameter may not be 100% in sync with the actual resource, the `parent_id` and `name`
    /// parameters are provided to ensure that the resource is correctly deserialized. This may be necessary when the
    /// resource has been renamed or moved (in those cases, for performance reason, there is no guaranty that the
    /// `resource` parameter contains the latest values for those fields).
    fn from_storage(parent_id: Option<Uuid>, name: String, resource: Value) -> Result<Self>
    where
        Self: Sized;
}

impl<T> From<&T> for ResourceRef
where
    T: Resource,
{
    fn from(resource: &T) -> Self {
        ResourceRef {
            id: *resource.id(),
            parent_id: resource.parent_id(),
            owner_user_id: *resource.owner_user_id(),
            resource_type: resource.resource_type(),
            name: resource.name().to_string(),
            metadata: resource.metadata(),
        }
    }
}

impl ResourceRef {
    /// Get a metadata value by key.
    pub fn get_metadata(&self, key: &str) -> Option<&str> {
        self.metadata.as_ref().and_then(|metadata| metadata.get(key).map(|s| s.as_str()))
    }
}
