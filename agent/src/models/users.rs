use crate::json_enum;
use crate::models::user_settings::TableSettings;
use crate::models::variables::Variable;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

json_enum!(ColorScheme, Dark, Light, Auto);

#[derive(Serialize, Deserialize)]
#[serde(default)]
pub struct UserSettings {
    pub color_scheme: ColorScheme,
    pub telemetry: bool,
    pub show_recently_opened: bool,
    pub show_favorites: bool,
    pub show_file_extensions: bool,
    pub editor_settings: EditorSettings,
    pub table_settings: TableSettings,
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            color_scheme: ColorScheme::Auto,
            telemetry: true,
            show_recently_opened: true,
            show_favorites: true,
            show_file_extensions: true,
            editor_settings: EditorSettings::default(),
            table_settings: TableSettings::default(),
        }
    }
}

json_enum!(Minimap, Show, Hide, Auto);
json_enum!(RenderWhitespace, None, Boundary, Selection, All, Trailing);

#[derive(Serialize, Deserialize)]
pub struct EditorSettings {
    pub minimap: Minimap,
    pub render_whitespace: RenderWhitespace,
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self { minimap: Minimap::Hide, render_whitespace: RenderWhitespace::None }
    }
}

json_enum!(Density, Comfortable, Compact);
json_enum!(Dividers, None, Rows, Grid);

#[derive(Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub user_id: Uuid,
    pub settings: UserSettings,
    pub variables: Vec<Variable>,
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
