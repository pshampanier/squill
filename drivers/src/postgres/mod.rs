use std::{ borrow::BorrowMut, pin::Pin };
use futures::{ future::BoxFuture, Stream };
use anyhow::Result;
use openssl::ssl::{ SslConnector, SslMethod };
use postgres_openssl::MakeTlsConnector;
use crate::{
    driver::{ Driver, DriverConnection, DriverExecutor, DriverStream },
    postgres::value::get_value,
    value::DriverValue,
};

mod value;

pub struct PostgresDriver {
    connection_string: String,
    client: Option<tokio_postgres::Client>,
}

impl PostgresDriver {
    pub fn new(connection_string: String) -> Self {
        PostgresDriver {
            connection_string,
            client: None,
        }
    }
}

impl DriverConnection for PostgresDriver {
    fn connect(&mut self) -> BoxFuture<'_, Result<()>> {
        Box::pin(async move {
            let builder = SslConnector::builder(SslMethod::tls())?;
            let connector = MakeTlsConnector::new(builder.build());
            let (client, connection) = tokio_postgres::connect(&self.connection_string, connector).await?;
            tokio::spawn(connection);
            self.client = Some(client);
            Ok(())
        })
    }

    fn close(&mut self) -> BoxFuture<'_, Result<()>> {
        Box::pin(async move {
            self.client = None;
            Ok(())
        })
    }
}

struct PostgresDriverStream<'e> {
    pg_row_stream: Pin<Box<tokio_postgres::RowStream>>,
    _marker: std::marker::PhantomData<&'e ()>,
}

impl<'e> Stream for PostgresDriverStream<'e> {
    type Item = Result<DriverValue>;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>
    ) -> std::task::Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let stream = this.pg_row_stream.borrow_mut();
        futures::pin_mut!(stream);
        match stream.poll_next(cx) {
            std::task::Poll::Ready(Some(Ok(row))) => {
                let mut values: Vec<DriverValue> = vec![];
                for (idx, column) in row.columns().iter().enumerate() {
                    let value = get_value(&row, column.type_().clone(), idx);
                    values.push(value);
                }
                std::task::Poll::Ready(Some(Ok(DriverValue::Array(values))))
            }
            std::task::Poll::Ready(Some(Err(e))) => { std::task::Poll::Ready(Some(Err(e.into()))) }
            std::task::Poll::Ready(None) => { std::task::Poll::Ready(None) }
            std::task::Poll::Pending => { std::task::Poll::Pending }
        }
    }
}

impl DriverStream for PostgresDriverStream<'_> {
    fn affected_rows(&self) -> Option<u64> {
        self.pg_row_stream.rows_affected()
    }
}

impl DriverExecutor for PostgresDriver {
    fn query<'e>(&'e mut self, query: &'e str) -> BoxFuture<'e, Result<Pin<Box<dyn DriverStream + 'e>>>> {
        Box::pin(async move {
            let client = self.client.as_ref().ok_or_else(|| anyhow::anyhow!("Not connected"))?;
            let stream = Box::pin(
                client.query_raw(query, vec![] as Vec<&(dyn tokio_postgres::types::ToSql + std::marker::Sync)>).await?
            );
            let driver_stream = PostgresDriverStream {
                pg_row_stream: stream,
                _marker: std::marker::PhantomData,
            };
            Ok(Box::pin(driver_stream) as Pin<Box<dyn DriverStream>>)
        })
    }
}

impl Driver for PostgresDriver {}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::stream::TryStreamExt;

    // The environment variable CI_POSTGRES_CONNECTION_STRING must be set to run the tests.
    // It can be either a connection string or a connection URI.
    // See https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING.
    const ENV_CI_POSTGRES_CONNECTION_STRING: &str = "CI_POSTGRES_CONNECTION_STRING";

    macro_rules! create_postgres_driver {
        () => {
            PostgresDriver::new(
                std::env
                    ::var(ENV_CI_POSTGRES_CONNECTION_STRING)
                    .unwrap_or_else(|_|
                        panic!("The environment variable {} is not set.", ENV_CI_POSTGRES_CONNECTION_STRING)
                    )
            )
        };
    }

    #[tokio::test]
    async fn test_postgres_connect() {
        let mut driver = create_postgres_driver!();
        assert!(driver.connect().await.is_ok());
        assert!(driver.close().await.is_ok());
    }

    #[tokio::test]
    async fn test_postgres_query() {
        let mut driver = create_postgres_driver!();
        assert!(driver.connect().await.is_ok());
        let mut stream = driver.query("SELECT generate_series(1, 2) as id").await.unwrap();

        // testing the first row
        let result = stream.try_next().await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().is_some());
        let row = result.unwrap().unwrap();
        assert!(row.is_array() && row.as_array().len() == 1);
        assert_eq!(row.as_array()[0], DriverValue::Int32(1));
        assert!(stream.affected_rows().is_none());

        // testing the second row
        let result = stream.try_next().await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().is_some());
        let row = result.unwrap().unwrap();
        assert!(row.is_array() && row.as_array().len() == 1);
        assert_eq!(row.as_array()[0], DriverValue::Int32(2));
        assert!(stream.affected_rows().is_none());

        // testing the end of the stream
        let result = stream.try_next().await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().is_none());
        assert!(stream.affected_rows().is_some());
        let result = stream.try_next().await;
        assert!(result.is_err());

        drop(stream);
        assert!(driver.close().await.is_ok());
    }
}
