use anyhow::Result;
use arrow_array::RecordBatch;
use futures::StreamExt;
use parquet::arrow::{AsyncArrowWriter, ParquetRecordBatchStreamBuilder};
use parquet::file::properties::WriterProperties;
use std::{fs, path::PathBuf};
use tokio::fs::File;

/// A writer that writes record batches to parquet files.
///
/// Query history files are store in the directory **`app_dir/users/{username}/history`**.
/// When a user executes a query, the result is store in the history as one or many parquet files. The maximum size of a
/// single parquet file is defined by the agent setting **`history_max_rows_per_file`** (default `1_000_000`). Once a
/// parquet file reach this limit, a new one is created to store the next records. Files are always named by the `id` of
/// the query with a suffix `.part-000x` and the file extension `.parquet`:
/// ```txt
/// 287d6a18-7092-4e3e-bb38-a54eaefc956a.part-0001.parquet
/// 287d6a18-7092-4e3e-bb38-a54eaefc956a.part-0002.parquet
/// 287d6a18-7092-4e3e-bb38-a54eaefc956a.part-0003.parquet
/// ```
/// If a query result contains more than one files, all the files are guaranteed to have the same number of records,
/// except the last one.
pub struct RecordBatchWriter {
    props: WriterProperties,

    /// The directory where the parquet files are stored.
    directory: PathBuf,

    /// The prefix of the parquet files
    file_prefix: String,

    /// The number of rows written to the current file.
    current_file_num_rows: usize,

    /// The maximum number of rows allowed in a single parquet file.
    /// When the writer reaches this limit, a new file is created. All files are guaranteed to have the same number of
    /// rows, except the last one.
    max_rows_per_file: usize,

    /// The current file being written.
    current_file: Option<AsyncArrowWriter<File>>,

    /// The part number of the current file.
    file_part: usize,

    /// The number of bytes written to files.
    pub written_bytes: usize,

    /// The number of rows written to files.
    pub written_rows: usize,
}

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
            written_bytes: 0,
            written_rows: 0,
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
            let file_metadata = current_file.close().await?;
            let temp_file_name = self.get_temp_file_name();
            let current_file_name =
                self.directory.join(format!("{}.part-{:#04}.parquet", self.file_prefix, self.file_part));
            tokio::fs::rename(&temp_file_name, &current_file_name).await?;
            self.written_bytes += tokio::fs::metadata(&current_file_name).await?.len() as usize;
            self.written_rows += file_metadata.num_rows as usize;
            self.file_part += 1;
        }
        Ok(())
    }

    fn get_temp_file_name(&self) -> PathBuf {
        self.directory.join("data.tmp")
    }
}

/// A reader that reads record batches from parquet files created by the [RecordBatchWriter].
pub struct RecordBatchReader {
    directory: PathBuf,
    file_prefix: String,
}

impl RecordBatchReader {
    pub fn new(directory: PathBuf, file_prefix: String) -> Self {
        Self { directory, file_prefix }
    }

    pub async fn read(&self, offset: usize, limit: usize) -> Result<Vec<RecordBatch>> {
        // The list of record batches to be returned.
        let mut record_batches = Vec::new();

        // The current file part number.
        let mut file_part = 1;

        // The current file name (associated with the current file part number).
        let mut file_name: PathBuf;

        // The current file (associated with the current file part number & file_name).
        let mut file: File;

        // The number of remaining rows to be read.
        let mut remaining_rows = limit;

        let mut file_part_offset = offset;

        while remaining_rows > 0 {
            file_name = self.directory.join(format!("{}.part-{:#04}.parquet", self.file_prefix, file_part));
            if !file_name.exists() {
                break;
            }
            file = File::open(file_name).await?;
            let mut builder = ParquetRecordBatchStreamBuilder::new(file).await?;
            if offset > 0 && file_part == 1 {
                // We need to skip the first `offset` rows.
                // This might be just skipping rows from the first file or skipping rows from multiple files. Because
                // all files are guaranteed to have the same number of rows (except the last one), we can calculate the
                // file part number and the offset within the file where the `offset` row is located.
                let max_rows_per_part = builder.metadata().file_metadata().num_rows() as usize;
                if offset >= max_rows_per_part {
                    // If the offset is greater than the number of rows in the file, we need to skip some files.
                    file_part = offset / max_rows_per_part + 1;
                    file_part_offset = offset % max_rows_per_part;
                    continue;
                }
            }
            builder = builder.with_offset(file_part_offset).with_limit(remaining_rows);
            let mut reader = builder.build()?;
            while let Some(next_record_batch) = reader.next().await {
                let record_batch = next_record_batch?;
                record_batches.push(record_batch.clone());
                remaining_rows -= record_batch.num_rows();
            }
            // If we need to read more rows from the next part, it will always start from the first row.
            file_part += 1;
            file_part_offset = 0;
        }

        Ok(record_batches)
    }

    /// List all the parquet files created by the writer.
    pub fn list(&self) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        let mut file_name: PathBuf;
        let mut file_part = 1;
        loop {
            file_name = self.directory.join(format!("{}.part-{:#04}.parquet", self.file_prefix, file_part));
            if file_name.try_exists()? {
                files.push(file_name);
                file_part += 1;
            } else {
                break;
            }
        }
        Ok(files)
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
    async fn test_record_batch_reader() {
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

        let reader = RecordBatchReader::new(dir.path().to_path_buf(), "query".into());
        let record_batches = assert_ok!(reader.read(0, 3).await);
        assert_eq!(record_batches.len(), 1);
        assert_eq!(record_batches[0].num_rows(), 3);
        assert_eq!(record_batches[0].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(), &[1, 2, 3]);

        let record_batches = assert_ok!(reader.read(1, 6).await);
        assert_eq!(record_batches.len(), 2);
        assert_eq!(record_batches[0].num_rows(), 4);
        assert_eq!(record_batches[1].num_rows(), 2);
        assert_eq!(record_batches[0].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(), &[2, 3, 4, 5]);
        assert_eq!(record_batches[1].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(), &[6, 7]);

        let record_batches = assert_ok!(reader.read(1, 10).await);
        assert_eq!(record_batches.len(), 3);
        assert_eq!(record_batches[0].num_rows(), 4);
        assert_eq!(record_batches[1].num_rows(), 5);
        assert_eq!(record_batches[2].num_rows(), 1);
        assert_eq!(record_batches[0].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(), &[2, 3, 4, 5]);
        assert_eq!(
            record_batches[1].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(),
            &[6, 7, 8, 9, 10]
        );
        assert_eq!(record_batches[2].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(), &[11]);

        let record_batches = assert_ok!(reader.read(5, 6).await);
        assert_eq!(record_batches.len(), 2);
        assert_eq!(record_batches[0].num_rows(), 5);
        assert_eq!(record_batches[1].num_rows(), 1);
        assert_eq!(
            record_batches[0].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(),
            &[6, 7, 8, 9, 10]
        );
        assert_eq!(record_batches[1].column(0).as_any().downcast_ref::<Int32Array>().unwrap().values(), &[11]);
    }

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
