/// Name of the directory used to store the files for the users.
pub const USERS_DIRNAME: &str = "users";

/// Name of the file used to store the user information.
pub const USER_HISTORY_DIRNAME: &str = "history";

/// Name of the directory used to store the drivers in the assets directory.
pub const DRIVERS_DIRNAME: &str = "drivers";

//
// Environment variables
//

/// Name of the environment variable used to specify the log level for the different components.
pub const ENV_VAR_LOG: &str = "SQUILL_LOG";

///
/// Query Metadata
///

/// The key used to store the schema of the result set for queries with `with_result_set` set to `true`.
pub const QUERY_METADATA_SCHEMA: &str = "schema";
pub const QUERY_METADATA_FIELD_MIN_VALUE: &str = "min_value";
pub const QUERY_METADATA_FIELD_MAX_VALUE: &str = "max_value";
pub const QUERY_METADATA_FIELD_MAX_LENGTH: &str = "max_length";
pub const QUERY_METADATA_FIELD_MISSING_VALUES: &str = "missing_values";
pub const QUERY_METADATA_FIELD_UNIQUE_VALUES: &str = "unique_values";

/// When calculating the statistics for a column, we will only consider the first `STATISTICS_MAX_CHAR_LENGTH`
/// characters for text columns. This is to avoid performance issues when calculating the statistics for large
/// text columns.
pub const STATISTICS_MAX_CHAR_LENGTH: usize = 1000;

/// Windows reserved names.
/// Source: <https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file>
pub const WINDOWS_RESERVED_NAMES: [&str; 26] = [
    "CON", "PRN", "AUX", "NUL", "COM0", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "COM",
    "LPT0", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", "LPT",
];
