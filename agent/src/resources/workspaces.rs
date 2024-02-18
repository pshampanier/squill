use std::path::PathBuf;
use anyhow::{ anyhow, Result };
use crate::models::workspaces::Workspace;
use crate::utils::validators::{ CatalogPath, Username };
use crate::utils::constants::WORKSPACE_SETTINGS_FILENAME;
use crate::resources::catalog::{ self };
use crate::resources::users::{ self };

/// Create a workspace for the user and save it.
///
/// Each workspace is stored in 3 locations:
/// - catalog: to list all the workspaces for the user.
/// - collections: to store the actual details of the workspace.
/// - data: to store the data collected for queries history and dashboards.
///
/// This function will create the workspace in the catalog and collections directories but will not create the data
/// directory.
///
/// ```text
/// users
/// └── :username
///     ├── catalog
///     │   └── workspaces
///     │       └── My Workspace.json                    <--- workspace entry in the catalog
///     ├── collections
///     │   └── 9ad991b6-efdd-4938-a435-49d268958176     <--- workspace directory in collections
///     |       ├── .workspace.json                      <--- workspace file in collections
///     |       ├── my file.sql                          <--- example of a file in the workspace
///     |       └── My Folder
///     |           └── ...
///     └── data
///         └── 9ad991b6-efdd-4938-a435-49d268958176     <--- workspace directory in data
///  ```
///
/// Example of a catalog entry for a workspace:
///
/// ```json
/// {
///     "id": "9ad991b6-efdd-4938-a435-49d268958176",
///     "name": "My Workspace",
///     "type": "workspace"
/// }
/// ```
pub fn create_workspace(username: &Username, path: &CatalogPath) -> Result<Workspace> {
    // Check if the path is already used in the catalog.
    if catalog::exists(username, path) {
        return Err(anyhow!("The path '{}' already exists.", path.as_str()));
    }

    // Create the entry in the catalog.
    let catalog_entry = catalog::create_file(username, path)?;

    // Save the workspace to the filesystem under collections/workspaces/:id.json
    let workspace = Workspace {
        id: catalog_entry.id.clone(),
        name: catalog_entry.name.clone(),
        ..Workspace::default()
    };

    // Create the workspace directory and save the workspace file.
    let workspace_dir = get_collections_workspace_dir(username, workspace.id.as_str());
    std::fs::create_dir(workspace_dir.as_path())?;

    // Save the workspace file
    let workspace_file = workspace_dir.join(WORKSPACE_SETTINGS_FILENAME);
    match std::fs::write(workspace_file.as_path(), serde_json::to_string_pretty(&workspace)?) {
        Ok(_) => Ok(workspace),
        Err(e) => {
            // If the write failed, we need to remove the workspace from the collections directory and the entry from
            // the catalog.
            std::fs::remove_dir_all(workspace_dir)?;
            catalog::delete(username, path)?;
            Err(e.into())
        }
    }
}

fn get_collections_workspace_dir(username: &Username, workspace_id: &str) -> PathBuf {
    users::get_collections_dir(username).join(workspace_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests::settings;
    use crate::resources::users::create_user;

    #[test]
    fn test_create_workspace() {
        // setup
        let username = Username::from("test");
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let _ = create_user(&username);

        /*
        // 1. create a workspace
        let workspace_path = CatalogPath::from("workspaces/path/to/My Workspace");
        let workspace = create_workspace(&username, &workspace_path).unwrap();

        let user_dir = settings::get_user_dir(username.as_str());
        let workspace_dir = get_collections_workspace_dir(&username, workspace.id.as_str());
        assert!(workspace_dir.exists());

        let catalog_file = user_dir.join(get_catalog_workspaces_file(&workspace_path));
        assert!(catalog_file.exists());

        // 2. create a workspace that already exists
        assert!(create_workspace(&username, &workspace_path).is_err());

        // 3. the creation of the workspace should fail if for any reason the catalog entry cannot be saved
        let catalog_root_dir = user_dir.join(USER_CATALOG_DIRNAME).join(USER_WORKSPACES_DIRNAME);
        let restore_permissions = set_readonly(catalog_root_dir.as_path());
        assert!(create_workspace(&username, &CatalogPath::from("Another Workspace")).is_err());
        assert!(create_workspace(&username, &CatalogPath::from("My Path/My Workspace")).is_err());
        std::fs::set_permissions(catalog_root_dir, restore_permissions).unwrap();

        // 4. the creation of the workspace should fail if for any reason the workspace file cannot be saved
        let collections_root_dir = user_dir.join(USER_COLLECTIONS_DIRNAME).join(USER_WORKSPACES_DIRNAME);
        let restore_permissions = set_readonly(collections_root_dir.as_path());
        assert!(create_workspace(&username, &CatalogPath::from("Another Workspace")).is_err());
        std::fs::set_permissions(collections_root_dir, restore_permissions).unwrap();

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
        */
    }
}
