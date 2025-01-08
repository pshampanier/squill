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

/// Convert ColorScheme to a `&str`.
impl AsRef<str> for ColorScheme {
    fn as_ref(&self) -> &str {
        match self {
            ColorScheme::Light => "light",
            ColorScheme::Dark => "dark",
            ColorScheme::Auto => "auto",
        }
    }
}

/// Convert ColorScheme to a string.
impl std::fmt::Display for ColorScheme {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a ColorScheme.
impl TryFrom<&str> for ColorScheme {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "light" => Ok(ColorScheme::Light),
            "dark" => Ok(ColorScheme::Dark),
            "auto" => Ok(ColorScheme::Auto),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// The density of a table.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TableDensity {
    Compact,
    Comfortable,
}

/// Convert TableDensity to a `&str`.
impl AsRef<str> for TableDensity {
    fn as_ref(&self) -> &str {
        match self {
            TableDensity::Compact => "compact",
            TableDensity::Comfortable => "comfortable",
        }
    }
}

/// Convert TableDensity to a string.
impl std::fmt::Display for TableDensity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a TableDensity.
impl TryFrom<&str> for TableDensity {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "compact" => Ok(TableDensity::Compact),
            "comfortable" => Ok(TableDensity::Comfortable),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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

/// Convert TableDividers to a `&str`.
impl AsRef<str> for TableDividers {
    fn as_ref(&self) -> &str {
        match self {
            TableDividers::None => "none",
            TableDividers::Rows => "rows",
            TableDividers::Grid => "grid",
        }
    }
}

/// Convert TableDividers to a string.
impl std::fmt::Display for TableDividers {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a TableDividers.
impl TryFrom<&str> for TableDividers {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "none" => Ok(TableDividers::None),
            "rows" => Ok(TableDividers::Rows),
            "grid" => Ok(TableDividers::Grid),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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

/// Convert TableOverscan to a `&str`.
impl AsRef<str> for TableOverscan {
    fn as_ref(&self) -> &str {
        match self {
            TableOverscan::Small => "small",
            TableOverscan::Medium => "medium",
            TableOverscan::Large => "large",
        }
    }
}

/// Convert TableOverscan to a string.
impl std::fmt::Display for TableOverscan {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a TableOverscan.
impl TryFrom<&str> for TableOverscan {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "small" => Ok(TableOverscan::Small),
            "medium" => Ok(TableOverscan::Medium),
            "large" => Ok(TableOverscan::Large),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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

/// Convert NullValues to a `&str`.
impl AsRef<str> for NullValues {
    fn as_ref(&self) -> &str {
        match self {
            NullValues::NullLowercase => "null_lowercase",
            NullValues::NullUppercase => "null_uppercase",
            NullValues::Empty => "empty",
            NullValues::Dash => "dash",
            NullValues::NotAvailableLowercase => "not_available_lowercase",
            NullValues::NotAvailableUppercase => "not_available_uppercase",
        }
    }
}

/// Convert NullValues to a string.
impl std::fmt::Display for NullValues {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a NullValues.
impl TryFrom<&str> for NullValues {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "null_lowercase" => Ok(NullValues::NullLowercase),
            "null_uppercase" => Ok(NullValues::NullUppercase),
            "empty" => Ok(NullValues::Empty),
            "dash" => Ok(NullValues::Dash),
            "not_available_lowercase" => Ok(NullValues::NotAvailableLowercase),
            "not_available_uppercase" => Ok(NullValues::NotAvailableUppercase),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// The minimap visibility of the Monaco Editor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonacoEditorMinimap {
    Show,
    Hide,
    Auto,
}

/// Convert MonacoEditorMinimap to a `&str`.
impl AsRef<str> for MonacoEditorMinimap {
    fn as_ref(&self) -> &str {
        match self {
            MonacoEditorMinimap::Show => "show",
            MonacoEditorMinimap::Hide => "hide",
            MonacoEditorMinimap::Auto => "auto",
        }
    }
}

/// Convert MonacoEditorMinimap to a string.
impl std::fmt::Display for MonacoEditorMinimap {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a MonacoEditorMinimap.
impl TryFrom<&str> for MonacoEditorMinimap {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "show" => Ok(MonacoEditorMinimap::Show),
            "hide" => Ok(MonacoEditorMinimap::Hide),
            "auto" => Ok(MonacoEditorMinimap::Auto),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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

/// Convert MonacoEditorWhitespace to a `&str`.
impl AsRef<str> for MonacoEditorWhitespace {
    fn as_ref(&self) -> &str {
        match self {
            MonacoEditorWhitespace::None => "none",
            MonacoEditorWhitespace::Boundary => "boundary",
            MonacoEditorWhitespace::Selection => "selection",
            MonacoEditorWhitespace::All => "all",
            MonacoEditorWhitespace::Trailing => "trailing",
        }
    }
}

/// Convert MonacoEditorWhitespace to a string.
impl std::fmt::Display for MonacoEditorWhitespace {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a MonacoEditorWhitespace.
impl TryFrom<&str> for MonacoEditorWhitespace {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "none" => Ok(MonacoEditorWhitespace::None),
            "boundary" => Ok(MonacoEditorWhitespace::Boundary),
            "selection" => Ok(MonacoEditorWhitespace::Selection),
            "all" => Ok(MonacoEditorWhitespace::All),
            "trailing" => Ok(MonacoEditorWhitespace::Trailing),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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

/// Convert MonacoEditorCursorStyle to a `&str`.
impl AsRef<str> for MonacoEditorCursorStyle {
    fn as_ref(&self) -> &str {
        match self {
            MonacoEditorCursorStyle::Line => "line",
            MonacoEditorCursorStyle::Block => "block",
            MonacoEditorCursorStyle::Underline => "underline",
            MonacoEditorCursorStyle::LineThin => "line_thin",
            MonacoEditorCursorStyle::BlockOutline => "block_outline",
            MonacoEditorCursorStyle::UnderlineThin => "underline_thin",
        }
    }
}

/// Convert MonacoEditorCursorStyle to a string.
impl std::fmt::Display for MonacoEditorCursorStyle {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a MonacoEditorCursorStyle.
impl TryFrom<&str> for MonacoEditorCursorStyle {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "line" => Ok(MonacoEditorCursorStyle::Line),
            "block" => Ok(MonacoEditorCursorStyle::Block),
            "underline" => Ok(MonacoEditorCursorStyle::Underline),
            "line_thin" => Ok(MonacoEditorCursorStyle::LineThin),
            "block_outline" => Ok(MonacoEditorCursorStyle::BlockOutline),
            "underline_thin" => Ok(MonacoEditorCursorStyle::UnderlineThin),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
}

/// The match brackets setting of the Monaco Editor.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MonacoEditorMatchBrackets {
    Always,
    Never,
    Near,
}

/// Convert MonacoEditorMatchBrackets to a `&str`.
impl AsRef<str> for MonacoEditorMatchBrackets {
    fn as_ref(&self) -> &str {
        match self {
            MonacoEditorMatchBrackets::Always => "always",
            MonacoEditorMatchBrackets::Never => "never",
            MonacoEditorMatchBrackets::Near => "near",
        }
    }
}

/// Convert MonacoEditorMatchBrackets to a string.
impl std::fmt::Display for MonacoEditorMatchBrackets {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_ref())
    }
}

/// Convert a `&str` to a MonacoEditorMatchBrackets.
impl TryFrom<&str> for MonacoEditorMatchBrackets {
    type Error = anyhow::Error;

    fn try_from(s: &str) -> Result<Self, anyhow::Error> {
        match s {
            "always" => Ok(MonacoEditorMatchBrackets::Always),
            "never" => Ok(MonacoEditorMatchBrackets::Never),
            "near" => Ok(MonacoEditorMatchBrackets::Near),
            _ => Err(anyhow::anyhow!("Unexpected value: '{}'.", s)),
        }
    }
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
