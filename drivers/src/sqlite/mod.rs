use std::pin::Pin;
use futures::future::BoxFuture;
use anyhow::Result;
use futures::stream::BoxStream;
use futures::Stream;
use sqlx::sqlite::{ SqliteConnection, SqliteQueryResult, SqliteRow };
use sqlx::{ Connection, Row };
use sqlx::Either;
use crate::value::DriverValue;
use crate::driver::{ Driver, DriverConnection, DriverExecutor, DriverStream };
mod value;

pub struct SqliteDriver {
    connection_string: String,
    conn: Option<SqliteConnection>,
}

impl SqliteDriver {
    pub fn new(connection_string: String) -> Self {
        Self { connection_string, conn: None }
    }
}

impl DriverConnection for SqliteDriver {
    fn connect(&mut self) -> BoxFuture<'_, Result<()>> {
        Box::pin(async move {
            let conn = SqliteConnection::connect(&self.connection_string).await?;
            self.conn = Some(conn);
            Ok(())
        })
    }

    fn close(&mut self) -> BoxFuture<'_, Result<()>> {
        Box::pin(async move {
            if let Some(conn) = self.conn.take() {
                conn.close().await?;
            }
            Ok(())
        })
    }
}

struct SqliteDriverStream<'e> {
    affected_rows: Option<u64>,
    stream: BoxStream<'e, Result<Either<SqliteQueryResult, SqliteRow>, sqlx::Error>>,
}

impl<'e> Stream for SqliteDriverStream<'e> {
    type Item = Result<DriverValue>;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>
    ) -> std::task::Poll<Option<Self::Item>> {
        match futures::Stream::poll_next(std::pin::Pin::new(&mut self.stream), cx) {
            std::task::Poll::Ready(Some(Ok(Either::Left(query_result)))) => {
                self.affected_rows = Some(query_result.rows_affected());
                std::task::Poll::Ready(None)
            }
            std::task::Poll::Ready(Some(Ok(Either::Right(row)))) => {
                let mut values: Vec<DriverValue> = vec![];
                for idx in 0..row.len() {
                    let driver_value = value::get_value(&row, idx);
                    values.push(driver_value);
                }
                std::task::Poll::Ready(Some(Ok(DriverValue::Array(values))))
            }
            std::task::Poll::Ready(Some(Err(e))) => std::task::Poll::Ready(Some(Err(e.into()))),
            std::task::Poll::Ready(None) => std::task::Poll::Ready(None),
            std::task::Poll::Pending => std::task::Poll::Pending,
        }
    }
}

impl DriverStream for SqliteDriverStream<'_> {
    fn affected_rows(&self) -> Option<u64> {
        self.affected_rows
    }
}

impl DriverExecutor for SqliteDriver {
    fn query<'e>(&'e mut self, query: &'e str) -> BoxFuture<'e, Result<Pin<Box<dyn DriverStream + 'e>>>> {
        Box::pin(async move {
            let conn = self.conn.as_mut().ok_or_else(|| anyhow::anyhow!("Not connected"))?;
            let sqlite_stream = sqlx::raw_sql(query).fetch_many(conn);
            let driver_stream = Box::pin(SqliteDriverStream {
                affected_rows: None,
                stream: sqlite_stream,
            });
            Ok(driver_stream as Pin<Box<dyn DriverStream>>)
        })
    }
}

impl Driver for SqliteDriver {}

#[cfg(test)]
mod tests {
    use futures::TryStreamExt;
    use super::*;

    #[tokio::test]
    async fn test_sqlite_connection() {
        // valid in-memory database
        let mut driver = SqliteDriver::new("sqlite::memory:".to_string());
        assert!(driver.connect().await.is_ok());
        assert!(driver.close().await.is_ok());

        // invalid database
        driver = SqliteDriver::new("sqlite:./invalid-db".to_string());
        assert!(driver.connect().await.is_err());
    }

    #[tokio::test]
    async fn test_sqlite_query() {
        let mut driver = SqliteDriver::new("sqlite::memory:".to_string());
        assert!(driver.connect().await.is_ok());

        let mut stream = driver.query("SELECT 'Hello World', 1, 1.2, NULL, x'001122'").await.unwrap();

        let result = stream.try_next().await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().is_some());
        let row = result.unwrap().unwrap();
        assert!(row.is_array() && row.as_array().len() == 5);
        assert!(stream.affected_rows().is_none());
        let result = stream.try_next().await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().is_none());
        assert_eq!(stream.affected_rows(), Some(0));

        drop(stream);

        assert!(driver.close().await.is_ok());
    }

    #[tokio::test]
    async fn test_sqlite_query_error() {
        let mut driver = SqliteDriver::new("sqlite::memory:".to_string());
        assert!(driver.connect().await.is_ok());

        let result = driver.query("SELECT * FROM invalid_table").await;
        assert!(result.is_ok());
        let mut stream = result.unwrap();
        let result = stream.try_next().await;
        assert!(result.is_err());
        drop(stream);
        assert!(driver.close().await.is_ok());
    }
}
