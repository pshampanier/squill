use std::fmt;

#[derive(Debug, Clone)]
pub enum UserError {
    Conflict(String),
    InvalidParameter(String),
    NotFound(String),
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            UserError::NotFound(message) => write!(f, "Not Found: {}", message),
            UserError::InvalidParameter(message) => write!(f, "Invalid Parameter: {}", message),
            UserError::Conflict(message) => write!(f, "Conflict: {}", message),
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
macro_rules! err_conflict {
    ($($arg:tt)*) => (
        $crate::utils::user_error::UserError::Conflict(format!($($arg)*)).into()
    );
}
