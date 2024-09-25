use anyhow::Result;
use arrow_array::RecordBatch;
use parquet::{arrow::AsyncArrowWriter, file::properties::WriterProperties};
use std::{fs, path::PathBuf};
use tokio::fs::File;

pub struct RecordBatchWriter {
    props: WriterProperties,
    directory: PathBuf,
    max_rows_per_file: usize,
    max_rows_first_file: usize,
    current_file: Option<AsyncArrowWriter<File>>,
    current_file_offset: usize,
    current_file_num_rows: usize,
}

impl RecordBatchWriter {
    pub fn new(
        props: WriterProperties,
        directory: PathBuf,
        max_rows_first_file: usize,
        max_rows_per_file: usize,
    ) -> Self {
        Self {
            props,
            directory,
            current_file: None,
            max_rows_first_file,
            max_rows_per_file,
            current_file_offset: 0,
            current_file_num_rows: 0,
        }
    }

    pub async fn write_record_batch(&mut self, record_batch: &RecordBatch) -> Result<()> {
        let mut num_remaining_rows = record_batch.num_rows(); // The number of rows remaining to be written.
        let mut offset = 0; // The offset of the next first row to be written.
        while num_remaining_rows > 0 {
            // The next batch of rows to be written is a slice of the given batch because the given batch may be
            // larger than remaining rows allowed by the current file.
            let length = std::cmp::min(num_remaining_rows, self.get_max_row());
            let next_record_batch = record_batch.slice(offset, length);
            if self.current_file.is_none() {
                if self.current_file_offset == 0 && !self.directory.exists() {
                    // Before creating the first file, we need to check if the directory exists.
                    fs::create_dir_all(&self.directory)?;
                }
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
            if self.current_file_num_rows >= self.get_max_row() {
                self.close_current_file().await?;
            }
            num_remaining_rows -= length;
            offset += length;
        }
        Ok(())
    }

    pub async fn close(&mut self) -> Result<()> {
        self.close_current_file().await
    }

    fn get_max_row(&self) -> usize {
        if self.current_file_offset == 0 {
            self.max_rows_first_file
        } else {
            self.max_rows_per_file
        }
    }

    async fn close_current_file(&mut self) -> Result<()> {
        if let Some(current_file) = self.current_file.take() {
            let file_metadata = current_file.close().await?;
            let temp_file_name = self.get_temp_file_name();
            let current_file_name = self.directory.join(format!(
                "{}-{}.parquet",
                self.current_file_offset,
                self.current_file_offset + (file_metadata.num_rows - 1) as usize
            ));
            tokio::fs::rename(&temp_file_name, &current_file_name).await?;
            self.current_file_offset += file_metadata.num_rows as usize;
            self.current_file_num_rows = 0;
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
        let mut writer = RecordBatchWriter::new(WriterProperties::builder().build(), dir.path().to_path_buf(), 2, 5);
        let schema = Schema::new(vec![Field::new("a", DataType::Int32, false)]);
        let record_batch = RecordBatch::try_new(
            Arc::new(schema),
            vec![Arc::new(Int32Array::from(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))],
        )
        .unwrap();
        assert_ok!(writer.write_record_batch(&record_batch).await);
        assert_ok!(writer.close().await);
        assert!(dir.path().join("0-1.parquet").exists());
        assert!(dir.path().join("2-6.parquet").exists());
        assert!(dir.path().join("7-9.parquet").exists());
    }
}
