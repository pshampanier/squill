use std::fmt;

#[derive(Debug, Clone)]
pub enum UserError {
    /// The user provided a parameter that conflicts with the current state.
    Conflict(String),

    /// The user provided an invalid parameter.
    InvalidParameter(String),

    /// A error that is usually unexpected and not caused by the user.
    InternalError(String),

    /// The requested resource was not found.
    NotFound(String),

    /// The user does not have the required permissions to perform the operation.
    Forbidden(String),
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            UserError::NotFound(message) => write!(f, "Not Found: {}", message),
            UserError::InvalidParameter(message) => write!(f, "Invalid Parameter: {}", message),
            UserError::InternalError(message) => write!(f, "Internal Error: {}", message),
            UserError::Conflict(message) => write!(f, "Conflict: {}", message),
            UserError::Forbidden(message) => write!(f, "Forbidden: {}", message),
        }
    }
}

impl std::error::Error for UserError {}

#[macro_export]
macro_rules! err_not_found {
    ($($arg:tt)*) => (
        $crate::utils::user_error::UserError::NotFound(format!($($arg)*)).into()
    );
}

#[macro_export]
macro_rules! err_param {
    ($($arg:tt)*) => (
        $crate::utils::user_error::UserError::InvalidParameter(format!($($arg)*)).into()
    );
}

#[macro_export]
macro_rules! err_internal {
    ($($arg:tt)*) => (
        $crate::utils::user_error::UserError::InternalError(format!($($arg)*)).into()
    );
}

#[macro_export]
macro_rules! err_conflict {
    ($($arg:tt)*) => (
        $crate::utils::user_error::UserError::Conflict(format!($($arg)*)).into()
    );
}

#[macro_export]
macro_rules! err_forbidden {
    ($($arg:tt)*) => (
        $crate::utils::user_error::UserError::Forbidden(format!($($arg)*)).into()
    );
}
