use crate::json_enum;
use crate::models::drivers::Driver;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Agent {
    pub version: &'static str,
    pub drivers: Vec<Driver>,
}

json_enum!(LogLevel, Error, Warning, Info, Debug, Trace);

// #[derive(Serialize, Deserialize, PartialEq, Debug)]
#[derive(Serialize, Deserialize)]
#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct AgentSettings {
    /// The base directory used to store the files
    pub base_dir: String,

    /// Specifies the TCP/IP address on which the server is to listen for connections from client applications.
    /// The entry 0.0.0.0 allows listening for all IPv4 addresses.
    pub listen_address: String,

    /// The tcp/ip port to listen to
    pub port: u16,

    /// The API key used to authenticate the client applications.
    pub api_key: String,

    /// The maximum number of user sessions that can be active at a given point of time.
    pub max_user_sessions: usize,

    /// The maximum number of concurrent tasks that can be executed at a given point of time.
    ///
    /// #default: 0 (will be automatically set to the number of CPUs)
    pub max_concurrent_tasks: usize,

    /// The maximum number of tasks that can be queued at a given point of time.
    pub max_task_queue_size: usize,

    /// The number of seconds after which a security token will expire.
    /// This does not applies to the refresh token which only expires when it is evicted from the cache.
    pub token_expiration: std::time::Duration,

    /// Enable the logging collector to store the logs into log files.
    ///
    /// #default: false
    pub log_collector: bool,

    /// The location of the log file directory.
    pub log_dir: String,

    /// The log level to be used by the logging collector.
    /// Any log below this level will be ignored.
    ///
    /// #default: "Info"
    pub log_level: LogLevel,

    /// Set the value of the [Access-Control-Allow-Origin](https://mzl.la/3HIZBx5) header.
    ///
    /// The value of this header indicates what origin sites are allowed to access the resources of the server.
    /// #default: ["*"]
    pub cors_allowed_origins: Vec<String>,

    /// Set the value of the [Access-Control-Max-Age](https://mzl.la/4826hRC) header.
    ///
    /// #default: 86400
    pub cors_max_age: std::time::Duration,

    /// The maximum number of rows per file.
    ///
    /// The maximum number of rows that can be stored in a single parquet file.
    /// #default: 1_000_000
    pub max_rows_per_history_file: usize,

    /// The maximum number of connection pools that can be created for users.
    ///
    /// For every connection definition in the catalog, a connection pool is created when the connection definition is
    /// actually used to instantiate connections. This value is the maximum number of pool that can be created
    /// maintained at a given point of time by the agent. This value does not prevent the agent to create more pools
    /// when needed, it just make the agent drop the least recently used pool when the maximum number of pools is
    /// reached.
    ///
    /// #default: 100
    pub max_users_conn_pool_size: usize,

    /// The maximum number of queries that can be fetch from the query history.
    ///
    /// This value is used to limit the number of queries that can be fetched by the client from the query history to
    /// avoid fetching a huge amount of data.
    ///
    /// #default: 100
    pub max_query_history_fetch_size: usize,
}
