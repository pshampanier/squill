use crate::models::user_settings::{NullValues, TableDensity, TableDividers, TableOverscan, TableSettings};
use crate::models::users::{User, UserSettings};
use crate::models::{Collection, ResourceType, SpecialCollection};
use crate::resources::catalog;
use crate::utils::constants::USER_HISTORY_DIRNAME;
use crate::utils::validators::{sanitize_username, Username};
use crate::{err_not_found, settings};
use anyhow::{anyhow, Context, Result};
use lazy_static::lazy_static;
use squill_drivers::async_conn::Connection;
use squill_drivers::{execute, params};
use uuid::Uuid;

impl Default for TableSettings {
    fn default() -> Self {
        Self {
            show_row_numbers: true,
            density: TableDensity::Comfortable,
            dividers: TableDividers::Rows,
            null_values: NullValues::Dash,
            overscan: TableOverscan::Medium,
            max_length: 50,
        }
    }
}

/// The special username used for a user running the agent locally.
///
/// This user is automatically created when the agent is started for the first time and don't require authentication by
/// default.
///
/// Most function calls that require a username would expect a [Username] value which is a sanitized variant. You can
/// use [users::local_username] to get the sanitized variant of this username.
const USERNAME_LOCAL: &str = "local";

/// Get the username used for the 'local' user.
pub fn local_username() -> &'static Username {
    lazy_static! {
        // We can safely unwrap here because the username is hardcoded and should always be valid.
        static ref LOCAL: Username = sanitize_username(USERNAME_LOCAL).unwrap();
    }
    &LOCAL
}

/// Create a new user.
///
/// This function creates a new user in the agent database and user directory with the following structure:
/// ```text
/// users
/// └── :username
///     └── history
///
/// ## Security
/// The username is sanitized to make sure it will not pose security threats such as directory traversal.
/// ```
pub async fn create(conn: &mut Connection, username: &Username) -> Result<User> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let user_dir = settings::get_user_dir(username.as_str());
    if user_dir.exists() {
        return Err(anyhow!("The user already exists."));
    }

    if let Some(parent) = user_dir.parent() {
        if !parent.exists() {
            std::fs::create_dir(parent)
                .with_context(|| format!("Unable to create the user directory: {}", parent.to_str().unwrap()))?;
        }
    }

    std::fs::create_dir(user_dir.as_path())
        .with_context(|| format!("Unable to create the user directory: {}", user_dir.to_str().unwrap()))?;

    // 1. Create the `history` directory on the filesystem.
    //
    // users
    // └── :username
    //     └── history
    std::fs::create_dir(user_dir.join(USER_HISTORY_DIRNAME))?;

    // 2. Create the user in the agent database.
    let user = User { username: username.to_string(), ..User::default() };
    execute!(
        conn,
        "INSERT INTO users (user_id, username, settings) VALUES (?, ?, ?)",
        user.user_id,
        user.username.as_str(),
        serde_json::to_string(&user.settings)?
    )
    .await?;

    // 3. Create the default collections at the root for the `local` user's catalog.
    for collection in vec![
        Collection {
            name: "Connections".to_string(),
            owner_user_id: user.user_id,
            resources_type: Some(ResourceType::Connection),
            ..Default::default()
        },
        Collection {
            name: "Environments".to_string(),
            owner_user_id: user.user_id,
            resources_type: Some(ResourceType::Environment),
            ..Default::default()
        },
        Collection {
            name: "Favorites".to_string(),
            owner_user_id: user.user_id,
            special: Some(SpecialCollection::Favorites),
            ..Default::default()
        },
    ] {
        catalog::add(conn, &collection).await?;
    }

    Ok(user)
}

/// Delete a user.
///
/// ## Security
/// The username is sanitized to make sure it will not pose security threats such as directory traversal.
pub async fn delete(conn: &mut Connection, username: &Username) -> Result<()> {
    let user_dir = settings::get_user_dir(username);
    if !user_dir.exists() {
        return Err(err_not_found!("The user '{}' does not exist.", username));
    }

    execute!(conn, "DELETE FROM users WHERE username = ?", username.as_str()).await?;
    std::fs::remove_dir_all(user_dir.as_path())
        .with_context(|| format!("Unable to delete the user directory: {}", user_dir.to_str().unwrap()))?;
    Ok(())
}

/// Get the user profile.
pub async fn get_by_username(conn: &mut Connection, username: &Username) -> Result<User> {
    let username = username.as_str();
    match conn
        .query_map_row("SELECT user_id, settings FROM users WHERE username = ?", params!(username), |row| {
            Ok(User {
                user_id: row.try_get::<_, _>(0)?,
                username: username.to_string(),
                settings: serde_json::from_str(row.get::<_, String>(1).as_str())?,
                variables: Default::default(),
            })
        })
        .await?
    {
        Some(user) => Ok(user),
        None => Err(err_not_found!("The user '{}' does not exist.", username)),
    }
}

pub async fn get_by_user_id(conn: &mut Connection, user_id: Uuid) -> Result<User> {
    match conn
        .query_map_row("SELECT username, settings FROM users WHERE user_id = ?", params!(user_id), |row| {
            Ok(User {
                user_id,
                username: row.try_get("username")?,
                settings: serde_json::from_str(row.get::<_, String>("settings").as_str())?,
                variables: Default::default(),
            })
        })
        .await?
    {
        Some(user) => Ok(user),
        None => Err(err_not_found!("The user with id '{}' does not exist.", user_id)),
    }
}

/// Save the user settings.
///
/// This function will fail if the user does not exist.
pub async fn save_settings(conn: &mut Connection, username: &Username, user_settings: &UserSettings) -> Result<()> {
    let affected_rows = conn
        .execute(
            "UPDATE users SET settings = ? WHERE username = ?",
            params!(serde_json::to_string(user_settings)?, username.as_ref()),
        )
        .await?;
    if affected_rows == 0 {
        return Err(err_not_found!("The user '{}' does not exist.", username));
    }
    Ok(())
}

/// Get the username of a user by their id.
///
/// This function will return an error if the user with the given id does not exist.
pub async fn get_username(conn: &mut Connection, user_id: Uuid) -> Result<Username> {
    match conn
        .query_map_row("SELECT username FROM users WHERE user_id = ?", params!(user_id), |row| {
            Ok(row.try_get::<_, String>(0)?)
        })
        .await?
    {
        Some(username) => Ok(sanitize_username(&username)?),
        None => Err(err_not_found!("The user with id '{}' not found.", user_id)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests;

    #[tokio::test]
    async fn _test_delete_user() {
        // setup
        let non_existent_user: Username = "non_existent_user".into();
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let mut conn = conn_pool.get().await.unwrap();

        assert!(delete(&mut conn, local_username()).await.is_ok());
        assert!(delete(&mut conn, &non_existent_user).await.is_err());
    }

    #[tokio::test]
    async fn test_users_get_by_username() {
        let non_existent_user: Username = "non_existent_user".into();
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let mut conn = conn_pool.get().await.unwrap();

        assert!(get_by_username(&mut conn, local_username()).await.is_ok());
        assert!(get_by_username(&mut conn, &non_existent_user).await.is_err());
    }

    #[tokio::test]
    async fn test_users_save_settings() {
        let non_existent_user: Username = "non_existent_user".into();
        let user_settings = UserSettings::default();
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let mut conn = conn_pool.get().await.unwrap();

        assert!(save_settings(&mut conn, local_username(), &user_settings).await.is_ok());
        assert!(save_settings(&mut conn, &non_existent_user, &user_settings).await.is_err());
    }
}
