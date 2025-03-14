/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    /// A connection to a datasource.
    Connection,

    /// An environment that can be used to group connections.
    Environment,

    /// A collection of resources.
    Collection,

    /// A user.
    User,
}

/// Convert ResourceType to a `&str`.
impl AsRef<str> for ResourceType {
    fn as_ref(&self) -> &str {
        match self {
            ResourceType::Connection => "connection",
            ResourceType::Environment => "environment",
            ResourceType::Collection => "collection",
            ResourceType::User => "user",
        }
    }
}

/// Convert ResourceType to a string.
impl std::fmt::Display for ResourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a ResourceType.
impl TryFrom<&str> for ResourceType {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "connection" => Ok(ResourceType::Connection),
            "environment" => Ok(ResourceType::Environment),
            "collection" => Ok(ResourceType::Collection),
            "user" => Ok(ResourceType::User),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// A reference to a resource.
///
/// A resource reference is a lightweight object that contains the unique identifier of the resource, and some
/// additional properties of the resource that are useful to use the resource without having to load it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct ResourceRef {
    /// Unique identifier of the resource.
    pub id: uuid::Uuid,

    /// Additional metadata of the resource.
    ///
    /// Metadata are key-value pairs that provide additional information without having to load the resource itself.
    /// For example, the content type of a `collection`, or the driver of a `connection`.
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,

    /// Name of the resource.
    pub name: String,

    /// Unique identifier of the user who own the resource.
    #[serde(default, skip_serializing_if = "uuid::Uuid::is_nil")]
    pub owner_user_id: uuid::Uuid,

    /// Unique identifier of the parent resource.
    #[serde(default, skip_serializing_if = "uuid::Uuid::is_nil")]
    pub parent_id: uuid::Uuid,

    #[serde(rename = "type")]
    pub resource_type: ResourceType,
}
