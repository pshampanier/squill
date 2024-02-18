use crate::json_enum;
use crate::models::variables::Variable;
use serde::{ Serialize, Deserialize };
use uuid::Uuid;

json_enum!(ColorScheme, Dark, Light, Auto);

#[derive(Serialize, Deserialize)]
pub struct UserSettings {
    pub color_scheme: ColorScheme,
    pub telemetry: bool,
    pub show_recently_opened: bool,
    pub show_favorites: bool,
    pub show_file_extensions: bool,
    pub editor_settings: EditorSettings,
}

#[derive(Serialize, Deserialize)]
pub struct EditorSettings {
    pub minimap: Minimap,
    pub render_whitespace: RenderWhitespace,
}

json_enum!(Minimap, Show, Hide, Auto);
json_enum!(RenderWhitespace, None, Boundary, Selection, All, Trailing);

#[derive(Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub user_id: String,
    pub settings: UserSettings,
    pub variables: Vec<Variable>,
}

impl Default for User {
    fn default() -> Self {
        Self {
            username: String::new(),
            user_id: Uuid::new_v4().to_string(),
            variables: Vec::new(),
            settings: UserSettings {
                color_scheme: ColorScheme::Auto,
                telemetry: true,
                show_recently_opened: false,
                show_favorites: true,
                show_file_extensions: false,
                editor_settings: EditorSettings {
                    minimap: Minimap::Hide,
                    render_whitespace: RenderWhitespace::None,
                },
            },
        }
    }
}
