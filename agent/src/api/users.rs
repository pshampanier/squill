use crate::settings;
use crate::api::error::ServerResult;
use anyhow::{ Result, Context, anyhow };
use axum::{ extract::Path, Json, Router, routing::get };
use serde::{ Serialize, Deserialize };
use uuid::Uuid;
use crate::json_enum;

pub const USER_FILENAME: &str = ".user.json";

json_enum!(ColorScheme, Dark, Light, Auto);

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserSettings {
    color_scheme: ColorScheme,
    telemetry: bool,
    show_recently_opened: bool,
    show_favorites: bool,
    show_file_extensions: bool,
    editor_settings: EditorSettings,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EditorSettings {
    minimap: Minimap,
    render_white_space: RenderWhitespace,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct User {
    username: String,
    user_id: String,
    settings: Option<UserSettings>,
}

impl Default for User {
    fn default() -> Self {
        Self {
            username: String::new(),
            user_id: Uuid::new_v4().to_string(),
            settings: Some(UserSettings {
                color_scheme: ColorScheme::Auto,
                telemetry: true,
                show_recently_opened: false,
                show_favorites: true,
                show_file_extensions: false,
                editor_settings: EditorSettings {
                    minimap: Minimap::Hide,
                    render_white_space: RenderWhitespace::None,
                },
            }),
        }
    }
}

async fn get_user(Path(username): Path<String>) -> ServerResult<Json<User>> {
    let user_dir = settings::get_user_dir(username.as_str());
    let settings_file = user_dir.join(USER_FILENAME);
    let settings_json = std::fs
        ::read_to_string(settings_file.as_path())
        .with_context(|| {
            format!("Unable to read the settings file: {}", settings_file.to_str().unwrap())
        })?;
    let user: User = serde_json
        ::from_str(&settings_json)
        .with_context(|| {
            format!("Unable to parse the settings file: {}", settings_file.to_str().unwrap())
        })?;
    Ok(Json(user))
}

pub fn authenticated_routes() -> Router {
    Router::new().route("/users/:username/user", get(get_user))
}

json_enum!(Minimap, Show, Hide, Auto);
json_enum!(RenderWhitespace, None, Boundary, Selection, All, Trailing);

pub fn create_user(username: &str) -> Result<()> {
    // TODO: check if the username does not start with ..
    let user_dir = settings::get_user_dir(username);
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
        username: username.to_string(),
        ..User::default()
    };
    let user_json = serde_json::to_string_pretty(&user)?;
    std::fs
        ::write(user_file.as_path(), user_json)
        .with_context(||
            format!("Unable to create the settings file: {}", user_file.to_str().unwrap())
        )?;
    Ok(())
}

pub fn delete_user(username: &str) -> Result<()> {
    // TODO: check if the username does not start with ..
    let user_dir = settings::get_user_dir(username);
    if !user_dir.exists() {
        return Err(anyhow!("The user {} does not exist.", username));
    }
    std::fs
        ::remove_dir_all(user_dir.as_path())
        .with_context(||
            format!("Unable to delete the user directory: {}", user_dir.to_str().unwrap())
        )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_user() {
        let username = "test_user";
        let temp_dir = tempfile::tempdir().unwrap();
        settings::tests::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        create_user(username).unwrap();
        let user_dir = settings::get_user_dir(username);
        assert!(user_dir.exists());
        assert!(user_dir.is_dir());
        assert!(user_dir.join(USER_FILENAME).exists());
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
