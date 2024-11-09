/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};
use squill_drivers::serde::Decode;

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

/// The settings of a table displaying a dataframe.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Decode)]
pub struct TableSettings {
    /// The density of the table.
    pub density: TableDensity,

    /// The dividers between columns & rows in the table.
    pub dividers: TableDividers,

    /// The maximum length of a column in the table.
    pub max_length: u16,

    /// The visual representation of null values.
    pub null_values: NullValues,

    /// The overscan of the table.
    pub overscan: TableOverscan,

    /// Show the row numbers in the table.
    pub show_row_numbers: bool,
}
