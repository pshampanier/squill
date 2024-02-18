use std::fmt;

#[derive(Debug, Clone)]
pub enum UserError {
    NotFound(String),
    InvalidParameter(String),
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            UserError::NotFound(message) => write!(f, "Not Found: {}", message),
            UserError::InvalidParameter(message) => write!(f, "Invalid Parameter: {}", message),
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
