use crate::settings;
use anyhow::{ Result, Context, anyhow };
use serde::{ Serialize, Deserialize };

use crate::json_enum;

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

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            color_scheme: ColorScheme::Auto,
            telemetry: true,
            show_recently_opened: false,
            show_favorites: true,
            show_file_extensions: false,
            editor_settings: EditorSettings {
                minimap: Minimap::Hide,
                render_white_space: RenderWhitespace::None,
            },
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EditorSettings {
    minimap: Minimap,
    render_white_space: RenderWhitespace,
}

json_enum!(Minimap, Show, Hide, Auto);
json_enum!(RenderWhitespace, None, Boundary, Selection, All, Trailing);

pub fn create_user(username: &str) -> Result<()> {
    let user_dir = settings::get_user_dir(username);
    if user_dir.exists() {
        return Err(anyhow!("The user already exists."));
    }

    std::fs
        ::create_dir(user_dir.as_path())
        .with_context(||
            format!("Unable to create the user directory: {}", user_dir.to_str().unwrap())
        )?;

    let settings_file = user_dir.join(".settings.json");
    let settings = UserSettings::default();
    let settings_json = serde_json::to_string_pretty(&settings).unwrap();
    std::fs
        ::write(settings_file.as_path(), settings_json)
        .with_context(||
            format!("Unable to create the settings file: {}", settings_file.to_str().unwrap())
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
        assert!(user_dir.join(".settings.json").exists());
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
