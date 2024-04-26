use bb8::ManageConnection;
use futures::TryStreamExt;
use futures::future::BoxFuture;
use crate::{ driver::Driver, factory::DriverFactory };
pub struct DriverPoolManager {
    driver: String,
    connection_string: String,
}

/// The implementation of the `bb8::ManageConnection` trait for the `DriverPoolManager`.
///
/// ```rust
/// #[tokio::main]
/// async fn main() {
///   use drivers::value::DriverValue;
///   use drivers::pool::DriverPoolManager;
///   use bb8::Pool;
///   use futures::TryStreamExt;
///
///   let manager = DriverPoolManager::new("sqlite".to_string(), "sqlite::memory:".to_string());
///   let pool = Pool::builder().max_size(2).build(manager).await.unwrap();
///
///   let mut conn = pool.get().await.unwrap();
///   let mut stream = conn.query("SELECT 'Hello World'").await.unwrap();
///   while let Some(row) = stream.try_next().await.unwrap() {
///       assert_eq!(row.as_array()[0], DriverValue::Text("Hello World".to_string()));
///   }
/// }
/// ```
impl DriverPoolManager {
    pub fn new(driver: String, connection_string: String) -> Self {
        Self { driver, connection_string }
    }
}

impl ManageConnection for DriverPoolManager {
    type Connection = Box<dyn Driver>;
    type Error = anyhow::Error;

    fn connect<'life0, 'async_trait>(&'life0 self) -> BoxFuture<'async_trait, Result<Self::Connection, Self::Error>>
        where Self: 'async_trait, 'life0: 'async_trait
    {
        Box::pin(async move {
            let mut driver = DriverFactory::create(&self.driver, self.connection_string.clone());
            driver.connect().await?;
            Ok(driver)
        })
    }

    fn is_valid<'life0, 'life1, 'async_trait>(
        &'life0 self,
        conn: &'life1 mut Self::Connection
    )
        -> BoxFuture<'async_trait, Result<(), Self::Error>>
        where Self: 'async_trait, 'life0: 'async_trait, 'life1: 'async_trait
    {
        Box::pin(async move {
            conn.query("SELECT 1").await?.try_next().await?;
            Ok(())
        })
    }

    fn has_broken(&self, _conn: &mut Self::Connection) -> bool {
        false
    }
}

#[cfg(test)]
mod tests {
    use crate::value::DriverValue;
    use super::*;
    use bb8::Pool;
    use futures::TryStreamExt;

    #[tokio::test]
    async fn test_pool() {
        let manager = DriverPoolManager::new("sqlite".to_string(), "sqlite::memory:".to_string());
        let pool = Pool::builder().max_size(2).build(manager).await.unwrap();

        let mut conn = pool.get().await.unwrap();
        let mut stream = conn.query("SELECT 'Hello World'").await.unwrap();
        while let Some(row) = stream.try_next().await.unwrap() {
            assert_eq!(row.as_array()[0], DriverValue::Text("Hello World".to_string()));
        }
    }
}
