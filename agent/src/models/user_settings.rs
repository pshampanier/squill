/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;

/// The color scheme of the application.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ColorScheme {
    Light,
    Dark,
    Auto,
}

/// The density of a table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TableDensity {
    Compact,
    Comfortable,
}

/// The dividers between columns & rows in a table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TableDividers {
    /// No dividers between columns & rows.
    None,

    /// Dividers between rows only.
    Rows,

    /// Dividers between columns & rows.
    Grid,
}

/// The overscan of a table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TableOverscan {
    /// small - The overscan is 5 rows, 1 column.
    Small,

    /// medium - The overscan is 25 rows, 3 columns.
    Medium,

    /// large - The overscan is 125 rows, 9 columns.
    Large,
}

/// The visual representation of null values.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NullValues {
    NullLowercase,
    NullUppercase,
    Empty,
    Dash,
    NotAvailableLowercase,
    NotAvailableUppercase,
}

/// The minimap visibility of the Monaco Editor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonacoEditorMinimap {
    Show,
    Hide,
    Auto,
}

/// The whitespace rendering of the Monaco Editor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonacoEditorWhitespace {
    None,
    Boundary,
    Selection,
    All,
    Trailing,
}

/// The cursor style of the Monaco Editor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonacoEditorCursorStyle {
    Line,
    Block,
    Underline,
    LineThin,
    BlockOutline,
    UnderlineThin,
}

/// The match brackets setting of the Monaco Editor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonacoEditorMatchBrackets {
    Always,
    Never,
    Near,
}

/// The settings of the Monaco Editor used by the terminal, worksheet, etc.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct MonacoEditorSettings {
    /// The cursor style of the Monaco Editor.
    pub cursor_style: MonacoEditorCursorStyle,

    /// Insert spaces when pressing Tab.
    pub insert_spaces: bool,

    /// The match brackets setting of the Monaco Editor.
    pub match_brackets: MonacoEditorMatchBrackets,

    /// The minimap visibility of the Monaco Editor.
    pub minimap: MonacoEditorMinimap,

    /// Size of a tab in spaces.
    pub tab_size: i16,

    /// The whitespace rendering of the Monaco Editor.
    pub whitespace: MonacoEditorWhitespace,
}

/// The settings of a table displaying a dataframe.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct TableSettings {
    /// The density of the table.
    pub density: TableDensity,

    /// The dividers between columns & rows in the table.
    pub dividers: TableDividers,

    /// The maximum number of characters to display in a column.
    pub max_length: u16,

    /// The visual representation of null values.
    pub null_values: NullValues,

    /// The overscan of the table.
    pub overscan: TableOverscan,

    /// Show the row numbers in the table.
    pub show_row_numbers: bool,
}

/// The settings of a terminal.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct TerminalSettings {
    /// The settings of the Monaco Editor used by the history view.
    pub editor_settings: MonacoEditorSettings,
}

/// The settings of the history view.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct HistorySettings {
    /// The maximum age of the entries in the history (in days).
    pub max_age: u16,

    /// The maximum number of entries in the history.
    pub max_entries: u16,

    /// The maximum number of rows to display in the result set.
    pub max_rows: i16,

    /// The maximum storage of the history (in megabytes).
    pub max_storage: u64,

    /// The settings of the table displaying the result set preview.
    pub table_settings: TableSettings,

    /// Use the default settings of the table displaying the result set preview.
    pub use_default_table_settings: bool,
}

/// The regional settings of the application.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct RegionalSettings {
    /// The locale of the application.
    pub locale: String,

    /// Use the system settings for the regional settings.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub use_system: bool,
}

/// The settings of a user.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct UserSettings {
    /// The color scheme of the application.
    pub color_scheme: ColorScheme,

    /// The settings of the Monaco Editor used by worksheet and files.
    pub editor_settings: MonacoEditorSettings,

    /// The settings of the history view.
    pub history_settings: HistorySettings,

    /// The visual representation of null values.
    pub null_values: NullValues,

    /// The regional settings of the application.
    pub regional_settings: RegionalSettings,

    /// Show the favorites in the catalog.
    pub show_favorites: bool,

    /// The settings of a table displaying a result set.
    pub table_settings: TableSettings,

    /// Enable/Disable the telemetry.
    pub telemetry: bool,

    /// The settings of the terminal.
    pub terminal_settings: TerminalSettings,
}
