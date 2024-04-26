use std::pin::Pin;
use futures::future::BoxFuture;
use anyhow::Result;
use crate::{
    driver::{ Driver, DriverConnection, DriverExecutor, DriverStream },
    postgres::PostgresDriver,
    sqlite::SqliteDriver,
};

pub struct AnyDriver {
    driver: Box<dyn Driver>,
}

impl AnyDriver {
    pub fn new(driver: Box<dyn Driver>) -> Self {
        Self { driver }
    }
}

impl DriverConnection for AnyDriver {
    fn connect(&mut self) -> BoxFuture<'_, Result<()>> {
        self.driver.connect()
    }

    fn close(&mut self) -> BoxFuture<'_, Result<()>> {
        self.driver.close()
    }
}

impl DriverExecutor for AnyDriver {
    fn query<'e>(&'e mut self, _query: &'e str) -> BoxFuture<'e, Result<Pin<Box<dyn DriverStream + 'e>>>> {
        self.driver.query(_query)
    }
}

pub struct DriverFactory;

impl DriverFactory {
    pub fn create(driver: &str, connection_string: String) -> Box<dyn Driver> {
        match driver {
            "sqlite" => Box::new(SqliteDriver::new(connection_string)),
            "postgres" => Box::new(PostgresDriver::new(connection_string)),
            _ => panic!("Unsupported driver: {}", driver),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::value::DriverValue;
    use super::*;
    use futures::stream::TryStreamExt;

    #[tokio::test]
    async fn test_sqlite_factory() {
        let mut driver = AnyDriver::new(DriverFactory::create("sqlite", "sqlite::memory:".to_string()));
        assert!(driver.connect().await.is_ok());

        let mut stream = driver.query("SELECT 'Hello World'").await.unwrap();
        while let Some(row) = stream.try_next().await.unwrap() {
            assert_eq!(row.as_array()[0], DriverValue::Text("Hello World".to_string()));
        }

        drop(stream);
        assert!(driver.close().await.is_ok());
    }
}
