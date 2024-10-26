use crate::pool::{ConnectionManager, ConnectionPool};
use crate::resources::users;
use crate::settings;
use anyhow::{Context, Result};
use squill_drivers::{register_drivers, sqlite, Factory};
use std::path::PathBuf;
use std::sync::Arc;
use tracing::info;

const AGENT_DB_NAME: &str = "agent.db";
const SETUP_SQL_SCRIPT: &str = include_str!("../assets/agent/setup.sql");

// The path of the agent database file.
fn file_path() -> PathBuf {
    let base_dir = PathBuf::from(&settings::get_base_dir());
    base_dir.join(AGENT_DB_NAME)
}

/// The URI of the agent database.
pub fn uri() -> String {
    format!("{}://{}", sqlite::DRIVER_NAME, Factory::to_uri_path(&file_path()))
}

/// Initialize the agent database.
///
/// This function will create the database if it does not exist and initialize it
///
/// # Returns
/// A connection pool to the agent database.
pub async fn init() -> Result<Arc<ConnectionPool>> {
    // Make sure that all database drivers are ready to be used.
    register_drivers();

    // If the database file does not exist, we need to create the database & initialize the database.
    if !file_path().exists() {
        info!("Initializing the agent database.");

        // 1) Create the database (by opening a connection in read+write+create mode).
        let uri = uri() + "?mode=rwc";
        let mut conn = squill_drivers::futures::Connection::open(&uri).await?;

        // 1. Setup the schema.
        let statements = loose_sqlparser::parse(SETUP_SQL_SCRIPT);
        for statement in statements {
            conn.execute(statement.sql(), None).await?;
        }
        // 2. Add the default `local` user.
        users::create(&mut conn, users::local_username()).await?;
        info!("Agent database initialized: {}", file_path().display());
    }

    match ConnectionPool::builder(ConnectionManager { uri: uri() }).build() {
        Ok(pool) => Ok(Arc::new(pool)),
        Err(e) => Err(anyhow::Error::from(e)).context("Unable to create the agent database connection pool."),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests::settings;

    #[tokio::test]
    async fn test_init_agent_database() {
        let base_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(base_dir.path().to_str().unwrap());
        assert!(init().await.is_ok());
        assert!(base_dir.into_path().join(AGENT_DB_NAME).exists());
    }
}
