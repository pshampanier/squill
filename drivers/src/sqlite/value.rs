use sqlx::sqlite::SqliteRow;
use sqlx::{ Row, ValueRef, Value, TypeInfo };

use crate::value::DriverValue;

/// Decode a value from a row.
///
/// See https://www.sqlite.org/datatype3.html
pub fn get_value(row: &SqliteRow, idx: usize) -> DriverValue {
    let value = row.try_get_raw(idx).unwrap().to_owned();
    let type_info = value.type_info();
    match type_info.name() {
        "NULL" => DriverValue::Null,
        "INTEGER" => DriverValue::Int64(value.decode()),
        "REAL" => DriverValue::Float64(value.decode()),
        "TEXT" => DriverValue::Text(value.decode()),
        "NUMERIC" => DriverValue::Int64(value.decode()),
        "BLOB" => DriverValue::ByteArray(value.decode()),
        unsupported => DriverValue::UnsupportedType(unsupported.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use crate::driver::{ get_query, DriverConnection };
    use crate::value::DriverValue;
    use crate::sqlite::SqliteDriver;

    #[tokio::test]
    async fn test_sqlite_types() {
        let mut driver = SqliteDriver::new("sqlite::memory:".to_string());
        assert!(driver.connect().await.is_ok());

        assert_eq!(get_query(&mut driver, "SELECT 1").await.unwrap().unwrap().as_array()[0], DriverValue::Int64(1));
        assert_eq!(get_query(&mut driver, "SELECT NULL").await.unwrap().unwrap().as_array()[0], DriverValue::Null);
        assert_eq!(
            get_query(&mut driver, "SELECT 1.2").await.unwrap().unwrap().as_array()[0],
            DriverValue::Float64(1.2)
        );
        assert_eq!(
            get_query(&mut driver, "SELECT 'text'").await.unwrap().unwrap().as_array()[0],
            DriverValue::Text("text".to_string())
        );
        assert_eq!(
            get_query(&mut driver, "SELECT x'001122'").await.unwrap().unwrap().as_array()[0],
            DriverValue::ByteArray(vec![0x00, 0x11, 0x22])
        );

        // other types that mapping to a storage type
        assert_eq!(get_query(&mut driver, "SELECT true").await.unwrap().unwrap().as_array()[0], DriverValue::Int64(1));
        assert_eq!(
            get_query(&mut driver, "SELECT Date('2024-04-25')").await.unwrap().unwrap().as_array()[0],
            DriverValue::Text("2024-04-25".to_string())
        );
        assert_eq!(
            get_query(&mut driver, "SELECT DateTime('2024-04-25 01:02:03')").await.unwrap().unwrap().as_array()[0],
            DriverValue::Text("2024-04-25 01:02:03".to_string())
        );
    }
}
