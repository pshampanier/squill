/// Name of the directory used to store the files for the users.
pub const USERS_DIRNAME: &str = "users";

/// Name of the file used to store the user information.
pub const USER_HISTORY_DIRNAME: &str = "history";

/// Username used for unauthenticated requests.
pub const USERNAME_ANONYMOUS: &str = "anonymous";

/// Name of the directory used to store the drivers in the assets directory.
pub const DRIVERS_DIRNAME: &str = "drivers";

//
// Environment variables
//

/// Name of the environment variable used to specify the log level for the different components.
pub const ENV_VAR_LOG: &str = "SQUILL_LOG";

/// Windows reserved names.
/// Source: <https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file>
pub const WINDOWS_RESERVED_NAMES: [&str; 26] = [
    "CON", "PRN", "AUX", "NUL", "COM0", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "COM",
    "LPT0", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", "LPT",
];
