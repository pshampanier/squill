use tokio_postgres::types::*;
use tokio_postgres::Row;
use crate::value::DriverValue;

pub fn get_value(row: &Row, type_: Type, idx: usize) -> DriverValue {
    match type_ {
        Type::BOOL => { DriverValue::Bool(row.get(idx)) }
        Type::INT2 => { DriverValue::Int16(row.get(idx)) }
        Type::INT4 => { DriverValue::Int32(row.get(idx)) }
        Type::INT8 => { DriverValue::Int64(row.get(idx)) }
        Type::TEXT => { DriverValue::Text(row.get(idx)) }
        Type::OID => { DriverValue::Int32(row.get(idx)) }
        Type::FLOAT4 => { DriverValue::Float32(row.get(idx)) }
        Type::FLOAT8 => { DriverValue::Float64(row.get(idx)) }
        _ => { DriverValue::UnsupportedType(type_.name().to_string()) }
    }
}
