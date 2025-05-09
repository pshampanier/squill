use anyhow::Result;
use deadpool::managed::{Manager, Metrics, Object, Pool, RecycleError, RecycleResult};
use squill_drivers::async_conn::Connection;
use tracing::error;

pub type ConnectionPool = Pool<ConnectionManager>;
pub type ConnectionGuard = Object<ConnectionManager>;

pub struct ConnectionManager {
    pub uri: String,
}

impl Manager for ConnectionManager {
    type Type = Connection;
    type Error = squill_drivers::Error;

    async fn create(&self) -> Result<Connection, Self::Error> {
        Connection::open(&self.uri).await
    }

    async fn recycle(&self, conn: &mut Connection, _: &Metrics) -> RecycleResult<Self::Error> {
        conn.ping().await.map_err(|e| {
            error!("Failed to recycle connection into the pool: {}", e);
            RecycleError::Backend(e)
        })
    }
}

/// Create a connection pool to the given Connection URI.
pub fn create<S: Into<String>>(uri: S) -> Result<ConnectionPool> {
    Ok(ConnectionPool::builder(ConnectionManager { uri: uri.into() }).build()?)
}
