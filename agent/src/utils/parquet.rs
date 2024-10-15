use anyhow::Result;
use arrow_array::RecordBatch;
use parquet::{arrow::AsyncArrowWriter, file::properties::WriterProperties};
use std::{fs, path::PathBuf};
use tokio::fs::File;

pub struct RecordBatchWriter {
    props: WriterProperties,
    directory: PathBuf,
    file_prefix: String,
    current_file_num_rows: usize,
    max_rows_per_file: usize,
    current_file: Option<AsyncArrowWriter<File>>,
    file_part: usize,
}

/// A writer that writes record batches to parquet files.
///
/// Query history files are store in the directory **`app_dir/users/{username}/history`**.
//  When a user executes a query, the result is store in the history as one or many parquet files. The maximum size of a
// single parquet file is defined by the agent setting **`history_max_rows_per_file`** (default `1_000_000`). Once a
// parquet file reach this limit, a new one is created to store the next records. Files are always named by the `id` of
// the query with a suffix `.part-000x` and the file extension `.parquet`:
/// ```txt
/// 287d6a18-7092-4e3e-bb38-a54eaefc956a.part-0001.parquet
/// 287d6a18-7092-4e3e-bb38-a54eaefc956a.part-0002.parquet
/// 287d6a18-7092-4e3e-bb38-a54eaefc956a.part-0003.parquet
/// ```
/// If a query result contains more than one files, all the files are guaranteed to have the same number of records,
/// except the last one.
impl RecordBatchWriter {
    pub fn new(props: WriterProperties, directory: PathBuf, file_prefix: String, max_rows_per_file: usize) -> Self {
        Self {
            props,
            directory,
            file_prefix,
            current_file: None,
            max_rows_per_file,
            current_file_num_rows: 0,
            file_part: 1,
        }
    }

    pub async fn write_record_batch(&mut self, record_batch: &RecordBatch) -> Result<()> {
        let mut num_remaining_rows = record_batch.num_rows(); // The number of rows remaining to be written.
        let mut offset = 0; // The offset of the next first row to be written.
        while num_remaining_rows > 0 {
            // The next batch of rows to be written is a slice of the given batch because the given batch may be
            // larger than remaining rows allowed by the current file.
            let length = std::cmp::min(num_remaining_rows, self.max_rows_per_file);
            let next_record_batch = record_batch.slice(offset, length);
            if self.current_file.is_none() {
                let file = File::create(self.get_temp_file_name()).await?;
                self.current_file = Some(AsyncArrowWriter::try_new(
                    file,
                    next_record_batch.schema().clone(),
                    Some(self.props.clone()),
                )?);
            }
            let current_file = self.current_file.as_mut().unwrap();
            current_file.write(&next_record_batch).await?;
            self.current_file_num_rows += length;
            if self.current_file_num_rows >= self.max_rows_per_file {
                self.close_current_file().await?;
                self.current_file_num_rows = 0;
            }
            num_remaining_rows -= length;
            offset += length;
        }
        Ok(())
    }

    pub async fn close(&mut self) -> Result<()> {
        self.close_current_file().await
    }

    async fn close_current_file(&mut self) -> Result<()> {
        if let Some(current_file) = self.current_file.take() {
            let _file_metadata = current_file.close().await?;
            let temp_file_name = self.get_temp_file_name();
            let current_file_name =
                self.directory.join(format!("{}.part-{:#04}.parquet", self.file_prefix, self.file_part));
            tokio::fs::rename(&temp_file_name, &current_file_name).await?;
            self.file_part += 1;
        }
        Ok(())
    }

    fn get_temp_file_name(&self) -> PathBuf {
        self.directory.join("data.tmp")
    }
}

/// Cleanup the temporary files when the writer is dropped.
///
/// The cleanup only happens when the writer is dropped without being closed first.
/// TODO: This implementation only delete the temporary files when the writer is dropped. It should be improved to
///       delete all files created by the writer.
impl Drop for RecordBatchWriter {
    fn drop(&mut self) {
        if let Some(current_file) = self.current_file.take() {
            drop(current_file);
            let _ = fs::remove_file(self.get_temp_file_name());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use arrow_array::{Int32Array, RecordBatch};
    use arrow_schema::{DataType, Field, Schema};
    use std::sync::Arc;
    use tempfile::tempdir;
    use tokio_test::assert_ok;

    #[tokio::test]
    async fn test_record_batch_writer() {
        let dir = tempdir().unwrap();
        let mut writer =
            RecordBatchWriter::new(WriterProperties::builder().build(), dir.path().to_path_buf(), "query".into(), 5);
        let schema = Schema::new(vec![Field::new("a", DataType::Int32, false)]);
        let record_batch = RecordBatch::try_new(
            Arc::new(schema),
            vec![Arc::new(Int32Array::from(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))],
        )
        .unwrap();
        assert_ok!(writer.write_record_batch(&record_batch).await);
        assert_ok!(writer.close().await);
        assert!(dir.path().join("query.part-0001.parquet").exists());
        assert!(dir.path().join("query.part-0002.parquet").exists());
        assert!(dir.path().join("query.part-0003.parquet").exists());
    }
}
