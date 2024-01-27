use crate::settings;
use crate::models::users::User;
use crate::utils::constants::USER_FILENAME;
use anyhow::{ anyhow, Result, Context };

pub fn create_user(username: &str) -> Result<User> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let username = crate::utils::validators::sanitize_username(username)?;
    let user_dir = settings::get_user_dir(&username);
    if user_dir.exists() {
        return Err(anyhow!("The user already exists."));
    }

    if let Some(parent) = user_dir.parent() {
        if !parent.exists() {
            std::fs
                ::create_dir(parent)
                .with_context(||
                    format!("Unable to create the user directory: {}", parent.to_str().unwrap())
                )?;
        }
    }

    std::fs
        ::create_dir(user_dir.as_path())
        .with_context(||
            format!("Unable to create the user directory: {}", user_dir.to_str().unwrap())
        )?;

    let user_file = user_dir.join(USER_FILENAME);
    let user = User {
        username: username,
        ..User::default()
    };
    std::fs::write(user_file.as_path(), serde_json::to_string_pretty(&user)?)?;
    Ok(user)
}

pub fn delete_user(username: &str) -> Result<()> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let username = crate::utils::validators::sanitize_username(username)?;
    let user_dir = settings::get_user_dir(&username);
    if !user_dir.exists() {
        return Err(anyhow!("The user {} does not exist.", &username));
    }
    std::fs
        ::remove_dir_all(user_dir.as_path())
        .with_context(||
            format!("Unable to delete the user directory: {}", user_dir.to_str().unwrap())
        )?;
    Ok(())
}

/// Load the user from the filesystem.
pub fn get_user(username: &str) -> Result<User> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let username = crate::utils::validators::sanitize_username(username)?;
    let user_dir = settings::get_user_dir(&username);
    if !user_dir.exists() {
        return Err(anyhow!("The user {} does not exist.", &username));
    }
    let user_file = user_dir.join(USER_FILENAME);
    let user = std::fs::read_to_string(user_file.as_path())?;
    Ok(serde_json::from_str(user.as_str())?)
}

#[cfg(test)]
mod tests {
    use crate::utils::{ constants::USERS_DIRNAME, tests::set_readonly, tests::settings };
    use super::*;

    #[test]
    fn test_create_user() {
        // setup
        let username = "test_user";
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let user_dir = settings::get_user_dir(username);

        // 1. create a user (expect to succeed)
        assert!(create_user(username).is_ok());
        assert!(user_dir.exists());
        assert!(user_dir.is_dir());
        assert!(user_dir.join(USER_FILENAME).exists());

        // 2. create the same user again (expect to fail)
        assert!(create_user(username).is_err());

        // 3. create a user with an invalid username (expect to fail)
        assert!(create_user("invalid/username").is_err());

        // 4. set the base directory to a read-only directory (expect to fail)
        let users_dir = temp_dir.path().join(USERS_DIRNAME);
        let restore_permissions = set_readonly(&users_dir);
        assert!(create_user("marty.mcfly").is_err());
        std::fs::set_permissions(&users_dir, restore_permissions).unwrap();

        // 5. set the base directory to a non-existent directory (expect to fail)
        settings::set_base_dir(
            temp_dir.path().join("non/existent/directory").as_path().to_str().unwrap().to_string()
        );
        assert!(create_user("doc").is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }

    #[test]
    fn test_delete_user() {
        // setup
        let username = "test_user";
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let user_dir = settings::get_user_dir(username);
        let _ = create_user(username);

        // 1. delete an existing user but for some reason the user directory or its content be deleted
        let restore_permissions = set_readonly(user_dir.as_path());
        assert!(delete_user(username).is_err());
        std::fs::set_permissions(user_dir.as_path(), restore_permissions).unwrap();

        // 2. delete an existing user (expect to succeed)
        assert!(delete_user(username).is_ok());
        assert!(!user_dir.exists());

        // 3. delete the same user again (expect to fail)
        assert!(delete_user(username).is_err());

        // 4. delete a non-existent user (expect to fail)
        assert!(delete_user("non_existent_user").is_err());

        // 5. delete a user with an invalid username (expect to fail)
        assert!(delete_user("invalid/username").is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }

    #[test]
    fn test_get_user() {
        // setup
        let username = "test_user";
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let _ = create_user(username);

        // 1. get an existing user (expect to succeed)
        assert!(get_user(username).is_ok());

        // 2. get a non-existent user (expect to fail)
        assert!(get_user("non_existent_user").is_err());

        // 3. get a user with an invalid username (expect to fail)
        assert!(get_user("invalid/username").is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
