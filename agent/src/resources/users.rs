use crate::models::users::{ User, UserSettings };
use crate::resources::workspaces::create_workspace;
use crate::settings;
use crate::utils::constants::{
    DEFAULT_WORKSPACE_NAME,
    USER_CATALOG_DIRNAME,
    USER_CATALOG_ENVIRONMENTS_DIRNAME,
    USER_CATALOG_WORKSPACES_DIRNAME,
    USER_CATALOG_FAVORITES_DIRNAME,
    USER_COLLECTIONS_DIRNAME,
    USER_DATA_DIRNAME,
    USER_FILENAME,
};
use crate::utils::validators::Username;
use anyhow::{ anyhow, Context, Result };
use std::path::PathBuf;
use crate::resources::catalog::{ self };

/// Create a new user.
///
/// This function creates a new user directory and a user file in the following structure:
/// ```text
/// users
/// └── :username
///     ├── user.json
///     ├── catalog
///     │   ├── workspaces
///     │   ├── favorites
///     │   └── environments
///     ├── collections
///     └── data
/// ```
pub fn create_user(username: &Username) -> Result<User> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let user_dir = settings::get_user_dir(username.as_str());
    if user_dir.exists() {
        return Err(anyhow!("The user already exists."));
    }

    if let Some(parent) = user_dir.parent() {
        if !parent.exists() {
            std::fs
                ::create_dir(parent)
                .with_context(|| { format!("Unable to create the user directory: {}", parent.to_str().unwrap()) })?;
        }
    }

    std::fs
        ::create_dir(user_dir.as_path())
        .with_context(|| { format!("Unable to create the user directory: {}", user_dir.to_str().unwrap()) })?;

    let user = User {
        username: username.to_string(),
        ..User::default()
    };

    // Save the user.json to the filesystem.
    let user_file = user_dir.join(USER_FILENAME);
    std::fs::write(user_file.as_path(), serde_json::to_string_pretty(&user)?)?;

    // Create all additional directories for the user.
    //
    // users
    // └── :username
    //     ├── catalog
    //     │   ├── environments
    //     │   ├── favorites
    //     │   └── workspaces
    //     ├── collections
    //     └── data
    //
    std::fs::create_dir(user_dir.join(USER_CATALOG_DIRNAME))?;
    std::fs::create_dir(user_dir.join(USER_CATALOG_DIRNAME).join(USER_CATALOG_ENVIRONMENTS_DIRNAME))?;
    std::fs::create_dir(user_dir.join(USER_CATALOG_DIRNAME).join(USER_CATALOG_FAVORITES_DIRNAME))?;
    std::fs::create_dir(user_dir.join(USER_CATALOG_DIRNAME).join(USER_CATALOG_WORKSPACES_DIRNAME))?;
    std::fs::create_dir(user_dir.join(USER_COLLECTIONS_DIRNAME))?;
    std::fs::create_dir(user_dir.join(USER_DATA_DIRNAME))?;

    // Create a default workspace for the user and save it to the filesystem.
    let workflow_catalog_path = catalog::get_workspace_catalog_path(DEFAULT_WORKSPACE_NAME)?;
    create_workspace(username, &workflow_catalog_path).with_context(|| {
        format!("Unable to create the default workspace for the user '{}'.", username.as_str())
    })?;

    Ok(user)
}

pub fn delete_user(username: &Username) -> Result<()> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let user_dir = settings::get_user_dir(username.as_str());
    if !user_dir.exists() {
        return Err(anyhow!("The user {} does not exist.", &username));
    }
    std::fs
        ::remove_dir_all(user_dir.as_path())
        .with_context(|| { format!("Unable to delete the user directory: {}", user_dir.to_str().unwrap()) })?;
    Ok(())
}

/// Load the user from the filesystem.
pub fn get_user(username: &Username) -> Result<User> {
    let user_dir = settings::get_user_dir(username.as_str());
    if !user_dir.exists() {
        return Err(anyhow!("The user {} does not exist.", &username));
    }
    let user_file = user_dir.join(USER_FILENAME);
    let user = std::fs::read_to_string(user_file.as_path())?;
    Ok(serde_json::from_str(user.as_str())?)
}

pub fn save_user_settings(username: &Username, user_settings: UserSettings) -> Result<UserSettings> {
    // Load the current user (which includes the settings).
    let Ok(mut user) = get_user(username) else {
        return Err(anyhow!("Cannot load settings for user {}.", &username));
    };

    // Replace the settings.
    user.settings = user_settings;

    // Save the user.json to the filesystem.
    let user_file = settings::get_user_dir(username.as_str()).join(USER_FILENAME);
    std::fs::write(user_file.as_path(), serde_json::to_string_pretty(&user)?)?;
    Ok(user.settings)
}

pub fn get_collections_dir(username: &Username) -> PathBuf {
    settings::get_user_dir(username.as_str()).join(USER_COLLECTIONS_DIRNAME)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::{ constants::USERS_DIRNAME, tests::set_readonly, tests::settings };

    #[test]
    fn test_create_user() {
        // setup
        let username: Username = "test_user".into();
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let user_dir = settings::get_user_dir(username.as_str());

        // 1. create a user (expect to succeed)
        assert!(create_user(&username).is_ok());
        assert!(user_dir.exists());
        assert!(user_dir.is_dir());
        assert!(user_dir.join(USER_FILENAME).exists());

        // 2. create the same user again (expect to fail)
        assert!(create_user(&username).is_err());

        // 3. set the base directory to a read-only directory (expect to fail)
        let users_dir = temp_dir.path().join(USERS_DIRNAME);
        let restore_permissions = set_readonly(&users_dir);
        assert!(create_user(&"marty.mcfly".into()).is_err());
        std::fs::set_permissions(&users_dir, restore_permissions).unwrap();

        // 5. set the base directory to a non-existent directory (expect to fail)
        settings::set_base_dir(temp_dir.path().join("non/existent/directory").as_path().to_str().unwrap().to_string());
        assert!(create_user(&"doc".into()).is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }

    #[test]
    fn test_delete_user() {
        // setup
        let username: Username = "test_user".into();
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let user_dir = settings::get_user_dir(username.as_str());
        let _ = create_user(&username);

        // 1. delete an existing user but for some reason the user directory or its content be deleted
        let restore_permissions = set_readonly(user_dir.as_path());
        assert!(delete_user(&username).is_err());
        std::fs::set_permissions(user_dir.as_path(), restore_permissions).unwrap();

        // 2. delete an existing user (expect to succeed)
        assert!(delete_user(&username).is_ok());
        assert!(!user_dir.exists());

        // 3. delete the same user again (expect to fail)
        assert!(delete_user(&username).is_err());

        // 4. delete a non-existent user (expect to fail)
        assert!(delete_user(&"non_existent_user".into()).is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }

    #[test]
    fn test_get_user() {
        // setup
        let username: Username = "test_user".into();
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let _ = create_user(&username);

        // 1. get an existing user (expect to succeed)
        assert!(get_user(&username).is_ok());

        // 2. get a non-existent user (expect to fail)
        assert!(get_user(&"non_existent_user".into()).is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
