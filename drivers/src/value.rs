#[derive(Debug, Clone, PartialEq)]
pub enum DriverValue {
    Null,
    Bool(bool),
    Int16(i16),
    Int32(i32),
    Int64(i64),
    Float32(f32),
    Float64(f64),
    Text(String),
    ByteArray(Vec<u8>),
    Array(Vec<DriverValue>),
    UnsupportedType(String),
}

impl DriverValue {
    pub fn is_array(&self) -> bool {
        matches!(self, DriverValue::Array(_))
    }

    pub fn as_array(&self) -> &[DriverValue] {
        match self {
            DriverValue::Array(values) => values,
            _ => panic!("Expected an array"),
        }
    }
}
