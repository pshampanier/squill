/// Name of the directory used to store the files for the users.
pub const USERS_DIRNAME: &str = "users";

/// Name of the file used to store the user information.
pub const USER_FILENAME: &str = "user.json";
pub const USER_CATALOG_DIRNAME: &str = "catalog";
pub const USER_COLLECTIONS_DIRNAME: &str = "collections";
pub const USER_DATA_DIRNAME: &str = "data";

/// File extension of the catalog entries & workspaces.
pub const CATALOG_ENTRY_FILE_EXTENSION: &str = "json";

/// Username used for unauthenticated requests.
pub const USERNAME_ANONYMOUS: &str = "anonymous";

///
/// Workspaces
///

/// Name of the default workspace
pub const DEFAULT_WORKSPACE_NAME: &str = "My Workspace";

/// Name of the file used to store the workspace settings.
pub const WORKSPACE_SETTINGS_FILENAME: &str = ".workspace.json";

//
// Environment variables
//

/// Name of the environment variable used to specify the log level.
pub const ENV_VAR_LOG_LEVEL: &str = "SQUILL_LOG_LEVEL";

/// Windows reserved names.
/// Source: <https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file>
pub const WINDOWS_RESERVED_NAMES: [&str; 26] = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM0",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "COM",
    "LPT0",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
    "LPT",
];
