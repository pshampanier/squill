use crate::resources::users;
use crate::settings;
use anyhow::{Context, Result};
use squill_drivers::futures::Connection;
use squill_drivers::{register_drivers, sqlite, Factory};
use std::path::PathBuf;
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

/// Open a connection to the agent database.
pub async fn get_connection() -> Result<Connection> {
    Connection::open(&uri())
        .await
        .map_err(anyhow::Error::from)
        .context("Unable to open a connection to the agent database.")
}

/// Initialize the agent database.
///
/// This function will create the database if it does not exist and initialize it
pub async fn init() -> Result<()> {
    // Make sure that all database drivers are ready to be used.
    register_drivers();

    // If the database file does not exist, we need to create the database & initialize the database.
    let new_database = !file_path().exists();

    // Opening a connection to a non existing database will create it.
    let conn = get_connection().await?;
    if new_database {
        info!("Initializing the agent database.");
        // 1. Setup the schema.
        let statements = loose_sqlparser::parse(SETUP_SQL_SCRIPT);
        for statement in statements {
            conn.execute(statement.sql(), None).await?;
        }
        // 2. Add the default `local` user.
        users::create(&conn, users::local_username()).await?;
        info!("Agent database initialized: {}", file_path().display());
    }
    Ok(())
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
