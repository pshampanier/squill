use anyhow::{anyhow, Result};
use arrow_array::{Array, ArrowPrimitiveType, PrimitiveArray, RecordBatch};
use arrow_array::{Float32Array, Float64Array};
use arrow_array::{Int16Array, Int32Array, Int64Array, Int8Array, UInt16Array, UInt32Array, UInt64Array, UInt8Array};
use arrow_schema::DataType;
use std::any::Any;

/// The statistics of a column.
#[derive(Debug, Clone, PartialEq)]
struct ColumnStatsValues<T> {
    min: T,
    max: T,
    count: u64,
}

/// The trait used to store column statistics regardless of the underlying type.
pub trait ColumnStats: Send + Sync {
    fn as_any(&self) -> &dyn Any;
    fn clone_box(&self) -> Box<dyn ColumnStats>;
    fn merge(&mut self, other: &dyn ColumnStats) -> Result<()>;
}

/// Merge the second set of column statistics into the first set.
pub fn merge_column_stats(
    stats: &mut Vec<Option<Box<dyn ColumnStats>>>,
    new_stats: &[Option<Box<dyn ColumnStats>>],
) -> Result<()> {
    if stats.is_empty() {
        for new_stats in new_stats {
            stats.push(new_stats.clone());
        }
    } else if stats.len() == new_stats.len() {
        for i in 0..stats.len() {
            if let (Some(col_stats), Some(new_col_stats)) = (stats[i].as_mut(), new_stats[i].as_ref()) {
                col_stats.merge(new_col_stats.as_ref())?;
            } else if stats[i].is_none() && new_stats[i].is_some() {
                stats[i] = new_stats[i].clone();
            }
        }
    } else {
        return Err(anyhow!(
            "Cannot merge column statistics: the number of columns are incompatible. (expected: {}, actual: {})",
            stats.len(),
            new_stats.len()
        ));
    }
    Ok(())
}

/// Get the statistics of a record batch.
///
/// The statistics are computed for each column of the record batch. If a column is not supported, the statistics for
/// that column will be `None`.
pub fn collect_record_batch_stats(record_batch: &RecordBatch) -> Vec<Option<Box<dyn ColumnStats>>> {
    let mut stats: Vec<Option<Box<dyn ColumnStats>>> = Vec::new();
    for column in record_batch.columns() {
        match column.data_type() {
            DataType::Int8 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<Int8Array>()));
            }
            DataType::Int16 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<Int16Array>()));
            }
            DataType::Int32 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<Int32Array>()));
            }
            DataType::Int64 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<Int64Array>()));
            }
            DataType::UInt8 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<UInt8Array>()));
            }
            DataType::UInt16 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<UInt16Array>()));
            }
            DataType::UInt32 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<UInt32Array>()));
            }
            DataType::UInt64 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<UInt64Array>()));
            }
            DataType::Float32 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<Float32Array>()));
            }
            DataType::Float64 => {
                stats.push(compute_column_stats(column.as_any().downcast_ref::<Float64Array>()));
            }
            _ => {
                // Other data types are not supported
                stats.push(None);
            }
        }
    }
    stats
}

/// Compute the column statistics for the given arrow array.
///
/// # Returns
/// - `Some(ColumnStats)` if the column statistics were computed successfully.
/// - `None` if the column statistics could not be computed, typically because the arrow array is empty or contains only
///   null values.
fn compute_column_stats<T>(arrow_array: Option<&PrimitiveArray<T>>) -> Option<Box<dyn ColumnStats>>
where
    T: ArrowPrimitiveType,
    T::Native: PartialOrd + Copy + 'static, // T::Native represents the underlying primitive type
{
    if let Some(arrow_array) = arrow_array {
        // Find the first valid value, it will be used as the initial min and max values.
        let mut start: usize = 0;
        while start < arrow_array.len() && !arrow_array.is_valid(start) {
            start += 1;
        }
        if start < arrow_array.len() {
            let mut min_value = arrow_array.value(start);
            let mut max_value = min_value;
            let mut count: u64 = 0;
            for i in 0..arrow_array.len() {
                if arrow_array.is_valid(i) {
                    let value = arrow_array.value(i);
                    if value < min_value {
                        min_value = value;
                    }
                    if value > max_value {
                        max_value = value;
                    }
                    count += 1;
                }
            }
            return Some(Box::new(ColumnStatsValues { min: min_value, max: max_value, count }) as Box<dyn ColumnStats>);
        }
    }
    None
}

impl<T: 'static + PartialOrd + Copy + Send + Sync + Clone> ColumnStats for ColumnStatsValues<T> {
    fn as_any(&self) -> &dyn Any {
        self
    }
    fn clone_box(&self) -> Box<dyn ColumnStats> {
        Box::new(self.clone())
    }
    fn merge(&mut self, other: &dyn ColumnStats) -> Result<()> {
        if let Some(other) = other.as_any().downcast_ref::<ColumnStatsValues<T>>() {
            if other.min < self.min {
                self.min = other.min;
            }
            if other.max > self.max {
                self.max = other.max;
            }
            self.count += other.count;
            Ok(())
        } else {
            Err(anyhow!("Cannot merge column statistics: the column statistics are incompatible."))
        }
    }
}

impl Clone for Box<dyn ColumnStats> {
    fn clone(&self) -> Box<dyn ColumnStats> {
        self.clone_box()
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use arrow_array::{ArrayRef, Float32Array, Float64Array, StringArray};
    use arrow_array::{Int16Array, Int32Array, Int64Array, Int8Array};
    use arrow_array::{UInt16Array, UInt32Array, UInt64Array, UInt8Array};
    use arrow_schema::{Field, Schema};
    use std::sync::Arc;
    use std::vec;
    use tokio_test::assert_ok;

    #[test]
    fn test_merge_column_stats() {
        // starts with empty stats
        let mut stats: Vec<Option<Box<dyn ColumnStats>>> = vec![];

        // merging some stats
        let some_stats: Vec<Option<Box<dyn ColumnStats>>> = vec![
            Some(Box::new(ColumnStatsValues::<i32> { min: 1, max: 7, count: 4 }) as Box<dyn ColumnStats>),
            Some(Box::new(ColumnStatsValues::<i8> { min: 2, max: 8, count: 8 }) as Box<dyn ColumnStats>),
            None,
        ];
        assert_ok!(merge_column_stats(&mut stats, &some_stats));
        assert_eq!(
            stats[0].as_ref().unwrap().as_any().downcast_ref::<ColumnStatsValues<i32>>(),
            Some(&ColumnStatsValues::<i32> { min: 1, max: 7, count: 4 })
        );
        assert_eq!(
            stats[1].as_ref().unwrap().as_any().downcast_ref::<ColumnStatsValues<i8>>(),
            Some(&ColumnStatsValues::<i8> { min: 2, max: 8, count: 8 })
        );
        assert!(stats[2].is_none());

        // merging more stats
        let more_starts: Vec<Option<Box<dyn ColumnStats>>> = vec![
            Some(Box::new(ColumnStatsValues::<i32> { min: 0, max: 9, count: 2 }) as Box<dyn ColumnStats>),
            Some(Box::new(ColumnStatsValues::<i8> { min: 3, max: 7, count: 3 }) as Box<dyn ColumnStats>),
            None,
        ];
        assert_ok!(merge_column_stats(&mut stats, &more_starts));
        assert_eq!(
            stats[0].as_ref().unwrap().as_any().downcast_ref::<ColumnStatsValues<i32>>(),
            Some(&ColumnStatsValues::<i32> { min: 0, max: 9, count: 6 })
        );
        assert_eq!(
            stats[1].as_ref().unwrap().as_any().downcast_ref::<ColumnStatsValues<i8>>(),
            Some(&ColumnStatsValues::<i8> { min: 2, max: 8, count: 11 })
        );
        assert!(stats[2].is_none());

        // merging empty stats (no change expected)
        assert_ok!(merge_column_stats(&mut stats, &[None, None, None]));
        assert_eq!(
            stats[0].as_ref().unwrap().as_any().downcast_ref::<ColumnStatsValues<i32>>(),
            Some(&ColumnStatsValues::<i32> { min: 0, max: 9, count: 6 })
        );
        assert_eq!(
            stats[1].as_ref().unwrap().as_any().downcast_ref::<ColumnStatsValues<i8>>(),
            Some(&ColumnStatsValues::<i8> { min: 2, max: 8, count: 11 })
        );
        assert!(stats[2].is_none());

        // merging with different number of columns
        assert!(merge_column_stats(&mut stats, &[None, None]).is_err());

        // merging with incompatible stats
        let incompatible_stats: Vec<Option<Box<dyn ColumnStats>>> = vec![
            Some(Box::new(ColumnStatsValues::<i32> { min: 0, max: 9, count: 6 }) as Box<dyn ColumnStats>),
            Some(Box::new(ColumnStatsValues::<i64> { min: 7, max: 12, count: 3 }) as Box<dyn ColumnStats>),
            None,
        ];
        assert!(merge_column_stats(&mut stats, &incompatible_stats).is_err());
    }

    #[test]
    fn test_compute_column_stats() {
        let arrow_array = Int32Array::from(vec![None, Some(1), None, Some(7), None]);
        let column_stats = compute_column_stats(Some(&arrow_array));
        assert!(column_stats.is_some());
        let column_stats = column_stats.unwrap();
        let column_stats = column_stats.as_any().downcast_ref::<ColumnStatsValues<i32>>().unwrap();
        assert_eq!(column_stats.min, 1);
        assert_eq!(column_stats.max, 7);
        assert_eq!(column_stats.count, 2);

        let empty_arrow_array = Int32Array::from(Vec::<i32>::new());
        let empty_column_stats = compute_column_stats(Some(&empty_arrow_array));
        assert!(empty_column_stats.is_none());

        let null_arrow_array = Int32Array::from(vec![None, None, None]);
        let null_column_stats = compute_column_stats(Some(&null_arrow_array));
        assert!(null_column_stats.is_none());
    }

    #[test]
    fn test_collect_record_batch_stats() {
        let int8_array = Arc::new(Int8Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let int16_array = Arc::new(Int16Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let int32_array = Arc::new(Int32Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let int64_array = Arc::new(Int64Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let uint8_array = Arc::new(UInt8Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let uint16_array = Arc::new(UInt16Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let uint32_array = Arc::new(UInt32Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let uint64_array = Arc::new(UInt64Array::from(vec![None, Some(1), None, Some(7), None])) as ArrayRef;
        let float32_array = Arc::new(Float32Array::from(vec![None, Some(1.0), None, Some(7.0), None])) as ArrayRef;
        let float64_array = Arc::new(Float64Array::from(vec![None, Some(1.0), None, Some(7.0), None])) as ArrayRef;
        let string_array =
            Arc::new(StringArray::from(vec![None, Some("hello"), None, Some("world"), None])) as ArrayRef;

        let schema = Arc::new(Schema::new(vec![
            Field::new("int8_array", DataType::Int8, true),
            Field::new("int16_array", DataType::Int16, true),
            Field::new("int32_array", DataType::Int32, true),
            Field::new("int64_array", DataType::Int64, true),
            Field::new("uint8_array", DataType::UInt8, true),
            Field::new("uint16_array", DataType::UInt16, true),
            Field::new("uint32_array", DataType::UInt32, true),
            Field::new("uint64_array", DataType::UInt64, true),
            Field::new("float32_array", DataType::Float32, true),
            Field::new("float64_array", DataType::Float64, true),
            Field::new("string_array", DataType::Utf8, true),
        ]));

        let record_batch = RecordBatch::try_new(
            schema,
            vec![
                int8_array,
                int16_array,
                int32_array,
                int64_array,
                uint8_array,
                uint16_array,
                uint32_array,
                uint64_array,
                float32_array,
                float64_array,
                string_array,
            ],
        )
        .unwrap();
        let stats = collect_record_batch_stats(&record_batch);
        assert_eq!(stats.len(), 11);
        assert!(stats[0].is_some());
        assert!(stats[10].is_none()); // string_array is not supported
    }
}
