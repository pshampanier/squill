use crate::models::storages::ConnectionStorage;
use crate::models::user_settings::{
    ColorScheme, HistorySettings, MonacoEditorCursorStyle, MonacoEditorMatchBrackets, MonacoEditorMinimap,
    MonacoEditorSettings, MonacoEditorWhitespace, NullValues, RegionalSettings, TableDensity, TableDividers,
    TableOverscan, TableSettings, TerminalSettings, UserSettings,
};
use crate::models::users::User;
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

impl Default for HistorySettings {
    fn default() -> Self {
        Self {
            max_age: 365,
            max_entries: 1_000,
            max_rows: 20,
            max_storage: 10_000,
            use_default_table_settings: false,
            table_settings: TableSettings {
                density: TableDensity::Compact,
                show_row_numbers: false,
                dividers: TableDividers::Rows,
                ..TableSettings::default()
            },
        }
    }
}

impl Default for TableSettings {
    fn default() -> Self {
        Self {
            show_row_numbers: true,
            density: TableDensity::Comfortable,
            dividers: TableDividers::Grid,
            null_values: NullValues::Dash,
            overscan: TableOverscan::Small,
            max_length: 100,
        }
    }
}

impl Default for MonacoEditorSettings {
    fn default() -> Self {
        Self {
            cursor_style: MonacoEditorCursorStyle::Underline,
            match_brackets: MonacoEditorMatchBrackets::Near,
            whitespace: MonacoEditorWhitespace::None,
            minimap: MonacoEditorMinimap::Hide,
            insert_spaces: true,
            tab_size: 2,
        }
    }
}

#[allow(clippy::derivable_impls)]
impl Default for TerminalSettings {
    fn default() -> Self {
        Self { editor_settings: MonacoEditorSettings::default() }
    }
}

impl Default for RegionalSettings {
    fn default() -> Self {
        Self { locale: "en-US".to_string(), use_system: true }
    }
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            color_scheme: ColorScheme::Auto,
            telemetry: true,
            show_favorites: true,
            null_values: NullValues::Dash,
            terminal_settings: TerminalSettings::default(),
            table_settings: TableSettings::default(),
            history_settings: HistorySettings::default(),
            editor_settings: MonacoEditorSettings::default(),
            regional_settings: RegionalSettings::default(),
        }
    }
}

impl Default for User {
    fn default() -> Self {
        Self {
            username: String::new(),
            user_id: Uuid::new_v4(),
            variables: Vec::new(),
            settings: UserSettings::default(),
        }
    }
}

impl User {
    /// Return the username after checking it pass the sanitization.
    pub fn safe_username(&self) -> Result<Username> {
        sanitize_username(self.username.as_str())
    }
}

/// The special username used for a user running the agent locally.
///
/// This user is automatically created when the agent is started for the first time and don't require authentication by
/// default.
pub fn local_username() -> &'static Username {
    lazy_static! {
        // We can safely unwrap here because the username is hardcoded and should always be valid.
        static ref LOCAL: Username = sanitize_username("local").unwrap();
    }
    &LOCAL
}

/// The special username used for unauthenticated access.
pub fn anonymous_username() -> &'static Username {
    lazy_static! {
        // We can safely unwrap here because the username is hardcoded and should always be valid.
        static ref ANONYMOUS: Username = sanitize_username("anonymous").unwrap();
    }
    &ANONYMOUS
}

/// Get the path to the history directory of a user.
///
/// ```text
/// users
/// └── :username
///     └── history
/// ```
pub fn history_dir(username: &Username) -> std::path::PathBuf {
    settings::get_user_dir(username).join(USER_HISTORY_DIRNAME)
}

/// Get the path to the history directory of a user's resource.
///
/// ```text
/// users
/// └── :username
///     └── history
///         └── :resource_id
/// ```
pub fn resource_history_dir(username: &Username, resource_id: Uuid) -> std::path::PathBuf {
    history_dir(username).join(resource_id.to_string())
}

/// Create a new user.
///
/// This function creates a new user in the agent database and user directory with the following structure:
/// ```text
/// users
/// └── :username
///     └── history
/// ```
///
/// ## Security
/// The username is sanitized to make sure it will not pose security threats such as directory traversal.
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
    std::fs::create_dir(history_dir(username))?;

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

pub async fn get_user_connections_storage(conn: &mut Connection, user_id: Uuid) -> Result<Vec<ConnectionStorage>> {
    conn.query_map_rows(
        r#"
            WITH usage AS (
                    SELECT connection_id, user_id, SUM(storage_bytes) AS used_bytes 
                      FROM query_history
                     WHERE user_id = ?
                     GROUP BY connection_id, user_id
                )
                SELECT C0.catalog_id AS connection_id, C0.name, U0.used_bytes
                  FROM catalog C0 
                  JOIN usage U0 ON (C0.catalog_id = U0.connection_id AND C0.owner_user_id = U0.user_id)"#,
        params!(user_id),
        |row| {
            Ok(ConnectionStorage {
                connection_id: row.try_get("connection_id")?,
                name: row.try_get("name")?,
                used_bytes: row.try_get::<_, i64>("used_bytes")? as u64,
            })
        },
    )
    .await
    .map_err(|e| e.into())
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
