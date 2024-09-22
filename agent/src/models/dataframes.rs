/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};

/// The type of a dataset attribute.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DataframeAttributeType {
    None,
    Boolean,
    Int16,
    Int32,
    Int64,
    Float32,
    Float64,
    Text,
    Datetime,
    Date,
    Time,
    Bytes,
    Array,
    Object,
}

/// The display format of a dataframe attribute.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DataframeAttributeFormatName {
    /// Format the attribute as a boolean (true/false).
    Boolean,

    /// Format the attribute as a signed integer.
    Int,

    /// Format the attribute as a floating point number.
    Float,

    /// Format the attribute as a string.
    Text,

    /// Format the attribute as a date and time.
    Datetime,

    /// Format the attribute as a date.
    Date,

    /// Format the attribute as a time.
    Time,

    /// Format the attribute as a duration.
    Duration,

    /// Format the attribute as a byte array.
    Bytes,

    /// Format the attribute as currency amount.
    Money,

    /// Format the attribute as a percentage value.
    Hex,

    /// Format the attribute as a percentage.
    Percent,

    /// Format the attribute as a graph, the value to be formatted must be an array.
    Graph,

    /// Format the attribute as a measure, the type of the measure must be specified (e.g. digitalStorage, duration, etc.)
    Measure,

    /// Format the attribute as a color (the value must be either a hex code, color name, or RGB value).
    /// see: https://www.w3.org/TR/css-color-3/#svg-color
    Color,
}

/// The display format of a dataframe attribute.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataframeAttributeFormat {
    /// The name of the format.
    pub name: DataframeAttributeFormatName,
}

/// Represents an attribute from a dataframe.
///
/// Attributes are the columns/properties of a dataframe, they have a name, a type, and a format that defines how
/// the values should be displayed.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataframeAttribute {
    /// A list of attributes describing each value if the current attribute is an object.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub attributes: Vec<DataframeAttribute>,

    /// The display format of the attribute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<DataframeAttributeFormat>,

    /// An attribute describing the items if the current attribute is an array.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub items: Option<Box<DataframeAttribute>>,

    /// The name of the attribute.
    pub name: String,

    /// The data storage type of the attribute.
    #[serde(rename = "type")]
    pub data_type: DataframeAttributeType,
}

/// The schema of a dataframe.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataframeSchema {
    /// The attributes of the dataframe.
    pub attributes: Vec<DataframeAttribute>,

    /// The unique identifier of the dataframe schema.
    #[serde(default, skip_serializing_if = "uuid::Uuid::is_nil")]
    pub id: uuid::Uuid,

    /// The version of the dataframe schema.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<i32>,
}
