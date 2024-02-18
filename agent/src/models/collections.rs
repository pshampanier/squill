use serde::{ Deserialize, Serialize };
/*

pub type WorkspaceCollectionItem = CollectionItem<WorkspaceCollectionItemType>;

/// Types of items that can be owned by a workflow.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceCollectionItemType {
    File,
    Folder,
    Unknown,
}
*/

#[derive(Serialize, Deserialize)]
pub struct CollectionItem<T> {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub item_type: T,
}

/*
impl Default for CollectionItem<WorkspaceCollectionItemType> {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            item_type: WorkspaceCollectionItemType::Unknown,
        }
    }
}
*/
