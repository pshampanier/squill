/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use crate::models::ResourceType;
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;

/// A special collection in the catalog.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SpecialCollection {
    /// The collection of favorite resources in the catalog for a given user.
    Favorites,

    /// The trash collection of the catalog for a given user.
    Trash,
}

/// A collection resources stored in the catalog.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct Collection {
    /// The unique identifier of the collection.
    pub collection_id: uuid::Uuid,

    /// The name of the collection.
    pub name: String,

    /// The unique identifier of the user that owns the collection.
    pub owner_user_id: uuid::Uuid,

    /// The unique identifier of the parent resource in the catalog.
    #[serde(default, skip_serializing_if = "uuid::Uuid::is_nil")]
    pub parent_id: uuid::Uuid,

    /// The type of resources in the collection.
    /// If empty the collection can contain any type of resources.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resources_type: Option<ResourceType>,

    /// The special collection type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub special: Option<SpecialCollection>,
}
