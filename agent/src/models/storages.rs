/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;

/// The storage usage of a connection.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct ConnectionStorage {
    /// The unique identifier of the connection.
    pub connection_id: uuid::Uuid,

    /// The name of the connection.
    pub name: String,

    /// The used storage in bytes.
    pub used_bytes: u64,
}

/// The storage usage of a user.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct UserStorage {
    /// The storage usage of the connections owned by the user.
    pub connections: Vec<ConnectionStorage>,

    /// The unique identifier of the user.
    pub user_id: uuid::Uuid,

    /// The username of the user.
    pub username: String,
}
