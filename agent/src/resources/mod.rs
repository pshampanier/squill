pub mod catalog;
pub mod connections;
pub mod users;
pub mod workspaces;

use crate::settings;
use crate::utils::constants::USER_COLLECTIONS_DIRNAME;
use crate::utils::validators::Username;
use anyhow::Result;
use serde::Serialize;

/// A trait to be implemented by resources that can be stored in the catalog.
pub trait Resource where Self: Serialize {
    /// Unique identifier of the resource.
    fn id(&self) -> &str;

    /// Name of the resource in the catalog.
    fn name(&self) -> &str;

    /// Save the resource to the filesystem.
    fn save(&self, username: &Username) -> Result<()> {
        // Save the resource to the filesystem.
        let resource_file = settings::get_user_dir(username.as_str()).join(USER_COLLECTIONS_DIRNAME).join(self.id());
        std::fs::write(resource_file.as_path(), serde_json::to_string_pretty(&self)?)?;
        Ok(())
    }
}
