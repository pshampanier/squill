use crate::models::queries::FieldStatistics;
use arrow_array::{Array, GenericStringArray, LargeStringArray, RecordBatch, StringArray};
use arrow_array::{Float32Array, Float64Array};
use arrow_array::{Int16Array, Int32Array, Int64Array, Int8Array, UInt16Array, UInt32Array, UInt64Array, UInt8Array};
use arrow_schema::DataType;

impl FieldStatistics {
    /// Merge the second set of column statistics into the first set.
    pub fn merge(&mut self, other: &Self) {
        if let Some(other_min) = other.min {
            if let Some(min) = self.min {
                if other_min < min {
                    self.min = Some(other_min);
                }
            } else {
                self.min = Some(other_min);
            }
        }
        if let Some(other_max) = other.max {
            if let Some(max) = self.max {
                if other_max > max {
                    self.max = Some(other_max);
                }
            } else {
                self.max = Some(other_max);
            }
        }
        if let Some(other_max_length) = other.max_length {
            if let Some(max_length) = self.max_length {
                if other_max_length > max_length {
                    self.max_length = Some(other_max_length);
                }
            } else {
                self.max_length = Some(other_max_length);
            }
        }
        self.missing += other.missing;
    }
}

#[allow(clippy::derivable_impls)]
impl Default for FieldStatistics {
    fn default() -> Self {
        FieldStatistics { min: None, max: None, missing: 0, unique: None, max_length: None }
    }
}

// Using a macro here instead of generics because we need a trait that convert the primitive type to f64 and Into<64> is
// not implemented for all primitive types (i64 and u64 are not implemented).
macro_rules! impl_from_primitive_array {
    ($array_type:ty) => {
        impl From<&$array_type> for FieldStatistics {
            fn from(array: &$array_type) -> FieldStatistics {
                // Find the first valid value, it will be used as the initial min and max values.
                let mut start_index: usize = 0;
                while start_index < array.len() && !array.is_valid(start_index) {
                    start_index += 1;
                }
                if start_index == array.len() {
                    // The array is empty or contains only null values
                    FieldStatistics { missing: array.len() as u64, ..Default::default() }
                } else {
                    let mut missing = 0;
                    let mut min_value = array.value(start_index);
                    let mut max_value = min_value;
                    for i in 0..array.len() {
                        if array.is_valid(i) {
                            let value = array.value(i);
                            if value < min_value {
                                min_value = value;
                            }
                            if value > max_value {
                                max_value = value;
                            }
                        } else {
                            missing += 1;
                        }
                    }
                    FieldStatistics {
                        min: Some(min_value as f64),
                        max: Some(max_value as f64),
                        missing,
                        ..Default::default()
                    }
                }
            }
        }

        impl From<Option<&$array_type>> for FieldStatistics {
            #[inline]
            fn from(option: Option<&$array_type>) -> FieldStatistics {
                match option {
                    Some(array) => FieldStatistics::from(array),
                    None => FieldStatistics::default(),
                }
            }
        }
    };
}

impl_from_primitive_array!(Int8Array);
impl_from_primitive_array!(Int16Array);
impl_from_primitive_array!(Int32Array);
impl_from_primitive_array!(Int64Array);
impl_from_primitive_array!(UInt8Array);
impl_from_primitive_array!(UInt16Array);
impl_from_primitive_array!(UInt32Array);
impl_from_primitive_array!(UInt64Array);
impl_from_primitive_array!(Float32Array);
impl_from_primitive_array!(Float64Array);

impl<T> From<&GenericStringArray<T>> for FieldStatistics
where
    T: arrow_array::OffsetSizeTrait,
{
    fn from(array: &GenericStringArray<T>) -> FieldStatistics {
        let mut missing: usize = 0;
        let mut max_length = 0;
        for i in 0..array.len() {
            if array.is_valid(i) {
                let value = array.value(i);
                max_length = max_length.max(value.chars().count());
            } else {
                missing += 1;
            }
        }
        FieldStatistics {
            missing: missing as u64,
            max_length: if missing == array.len() { None } else { Some(max_length as u32) },
            ..Default::default()
        }
    }
}

impl<T> From<Option<&GenericStringArray<T>>> for FieldStatistics
where
    T: arrow_array::OffsetSizeTrait,
{
    #[inline]
    fn from(option: Option<&GenericStringArray<T>>) -> FieldStatistics {
        match option {
            Some(array) => FieldStatistics::from(array),
            None => FieldStatistics::default(),
        }
    }
}

/// Get the statistics of a record batch.
///
/// The statistics are computed for each column of the record batch. If a column is not supported, the statistics for
/// that column will be `None`.
pub fn collect_record_batch_stats(record_batch: &RecordBatch) -> Vec<FieldStatistics> {
    let mut stats: Vec<FieldStatistics> = Vec::new();
    for array in record_batch.columns() {
        match array.data_type() {
            // TODO: Add support for ArrowTemporalType and Decimal
            DataType::Int8 => {
                stats.push(array.as_any().downcast_ref::<Int8Array>().into());
            }
            DataType::Int16 => {
                stats.push(array.as_any().downcast_ref::<Int16Array>().into());
            }
            DataType::Int32 => {
                stats.push(array.as_any().downcast_ref::<Int32Array>().into());
            }
            DataType::Int64 => {
                stats.push(array.as_any().downcast_ref::<Int64Array>().into());
            }
            DataType::UInt8 => {
                stats.push(array.as_any().downcast_ref::<UInt8Array>().into());
            }
            DataType::UInt16 => {
                stats.push(array.as_any().downcast_ref::<UInt16Array>().into());
            }
            DataType::UInt32 => {
                stats.push(array.as_any().downcast_ref::<UInt32Array>().into());
            }
            DataType::UInt64 => {
                stats.push(array.as_any().downcast_ref::<UInt64Array>().into());
            }
            DataType::Float32 => {
                stats.push(array.as_any().downcast_ref::<Float32Array>().into());
            }
            DataType::Float64 => {
                stats.push(array.as_any().downcast_ref::<Float64Array>().into());
            }
            DataType::Utf8 => {
                stats.push(array.as_any().downcast_ref::<StringArray>().into());
            }
            DataType::LargeUtf8 => {
                stats.push(array.as_any().downcast_ref::<LargeStringArray>().into());
            }
            _ => {
                // Other data types, we are just getting the number of missing values
                stats.push(FieldStatistics { missing: array.null_count() as u64, ..Default::default() });
            }
        }
    }
    stats
}

#[cfg(test)]
mod tests {

    use super::*;
    use arrow_array::{ArrayRef, StringArray};
    use arrow_schema::{Field, Schema};
    use std::sync::Arc;
    use std::vec;
    use tokio_test::assert_ok;

    #[test]
    fn test_merge_field_stats() {
        let mut stats = FieldStatistics { min: None, max: None, ..Default::default() };
        stats.merge(&FieldStatistics { min: Some(1.), max: Some(42.), ..Default::default() });
        assert_eq!(stats.min, Some(1.));
        assert_eq!(stats.max, Some(42.));

        let mut stats = FieldStatistics { min: Some(2.), max: Some(42.), ..Default::default() };
        stats.merge(&FieldStatistics { min: Some(3.), ..Default::default() });
        assert_eq!(stats.min, Some(2.));
        assert_eq!(stats.max, Some(42.));

        let mut stats = FieldStatistics { min: Some(4.), max: Some(42.), ..Default::default() };
        stats.merge(&FieldStatistics { min: Some(3.), max: Some(52.), ..Default::default() });
        assert_eq!(stats.min, Some(3.));
        assert_eq!(stats.max, Some(52.));
    }

    #[test]
    fn test_compute_field_stats() {
        assert_eq!(
            FieldStatistics::from(&Int32Array::from(vec![None, None, None])),
            FieldStatistics { missing: 3, ..Default::default() }
        );
        assert_eq!(
            FieldStatistics::from(&Int32Array::from(vec![None, Some(1), None, Some(7), None])),
            FieldStatistics { min: Some(1.), max: Some(7.), missing: 3, ..Default::default() }
        );
    }

    #[test]

    fn test_collect_record_batch_stats() {
        let int8_array = Arc::new(Int8Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let int16_array = Arc::new(Int16Array::from(vec![None, None, None, None, None])) as ArrayRef;
        let uint64_array = Arc::new(UInt64Array::from(vec![None, Some(8), None, Some(342), None])) as ArrayRef;
        let float64_array = Arc::new(Float64Array::from(vec![None, Some(1.33), None, Some(7.42), None])) as ArrayRef;
        let string_array =
            Arc::new(StringArray::from(vec![None, Some("hello"), None, Some("world"), None])) as ArrayRef;

        let schema = Arc::new(Schema::new(vec![
            Field::new("int8_array", DataType::Int8, true),
            Field::new("int16_array", DataType::Int16, true),
            Field::new("uint64_array", DataType::UInt64, true),
            Field::new("float64_array", DataType::Float64, true),
            Field::new("string_array", DataType::Utf8, true),
        ]));

        let stats = collect_record_batch_stats(&assert_ok!(RecordBatch::try_new(
            schema,
            vec![int8_array, int16_array, uint64_array, float64_array, string_array]
        )));
        assert_eq!(stats.len(), 5);
        assert_eq!(stats[0], FieldStatistics { min: Some(1.), max: Some(7.), missing: 3, ..Default::default() });
        assert_eq!(stats[1], FieldStatistics { missing: 5, ..Default::default() });
        assert_eq!(stats[2], FieldStatistics { min: Some(8.), max: Some(342.), missing: 3, ..Default::default() });
        assert_eq!(stats[3], FieldStatistics { min: Some(1.33), max: Some(7.42), missing: 3, ..Default::default() });
        assert_eq!(stats[4], FieldStatistics { missing: 3, max_length: Some(5), ..Default::default() });
    }
}
