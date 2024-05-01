use std::collections::HashMap;

use axum::{ extract::Json, routing::get, Router };
use crate::models::agent::AgentSettings;
use crate::models::drivers::{
    Capability,
    Driver,
    DRIVER_CONNECTION_STRING,
    DRIVER_CONNECTION_MODE,
    DRIVER_HOST,
    DRIVER_PORT,
    DRIVER_SOCKET,
    DRIVER_USER,
};
use crate::{ api::error::ServerResult, models::agent::Agent };
use crate::server::state::ServerState;

/// GET /agent
///
/// This endpoint is mostly used to check if the agent is running. No authentication is required but the API key must be
/// passed in the X-API-Key header.
///
/// Returns the agent version.
async fn get_agent() -> ServerResult<Json<Agent>> {
    let response = Agent {
        version: env!("CARGO_PKG_VERSION"),
        drivers: vec![
            Driver {
                name: "sqlite".to_string(),
                label: "SQLite".to_string(),
                icon: "sqlite.svg".to_string(),
                description: "SQLite is a C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine.".to_string(),
                capabilities: vec![
                    Capability::Sql,
                    Capability::ConnectFile,
                    Capability::ConnectString,
                    Capability::ReadOnly
                ],
                defaults: HashMap::from([
                    (DRIVER_CONNECTION_MODE.to_string(), "file".to_string()),
                    (DRIVER_CONNECTION_STRING.to_string(), "memory://".to_string()),
                ]),
            },
            Driver {
                name: "postgresql".to_string(),
                label: "PostgreSQL".to_string(),
                icon: "postgresql.svg".to_string(),
                description: "PostgreSQL is a powerful, open source object-relational database system with over 30 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance.".to_string(),
                capabilities: vec![
                    Capability::Sql,
                    Capability::AuthUserPassword,
                    Capability::ConnectString,
                    Capability::ConnectHost,
                    Capability::ConnectSocket
                ],
                defaults: HashMap::from([
                    (DRIVER_CONNECTION_MODE.to_string(), "host".to_string()),
                    (DRIVER_HOST.to_string(), "localhost".to_string()),
                    (DRIVER_PORT.to_string(), "5432".to_string()),
                    (DRIVER_USER.to_string(), "postgres".to_string()),
                    (DRIVER_SOCKET.to_string(), "/var/run/postgres/.s.PGSQL.5432".to_string()),
                ]),
            },
            Driver {
                name: "mysql".to_string(),
                label: "MySQL".to_string(),
                icon: "mysql.svg".to_string(),
                description: "MySQL is an open-source relational database management system (RDBMS).".to_string(),
                capabilities: vec![
                    Capability::Sql,
                    Capability::AuthUserPassword,
                    Capability::ConnectString,
                    Capability::ConnectHost,
                    Capability::ConnectSocket
                ],
                defaults: HashMap::from([
                    (DRIVER_CONNECTION_MODE.to_string(), "host".to_string()),
                    (DRIVER_HOST.to_string(), "localhost".to_string()),
                    (DRIVER_PORT.to_string(), "3306".to_string()),
                    (DRIVER_USER.to_string(), "root".to_string()),
                ]),
            }
        ],
    };
    Ok(Json(response))
}

async fn get_agent_setting() -> ServerResult<Json<AgentSettings>> {
    // let response = settings::get_agent_settings();
    // Ok(Json(response))
    todo!()
}

pub fn routes(state: ServerState) -> Router {
    Router::new().route("/agent", get(get_agent)).with_state(state)
}

/// Create a router for the endpoints that requires authentication to be reached.
pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new().route("/agent/settings", get(get_agent_setting)).with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_agent() {
        let response = get_agent().await.unwrap();
        assert_eq!(response.0.version, env!("CARGO_PKG_VERSION"));
    }
}
