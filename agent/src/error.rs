use std::fmt;
use std::error::Error;

pub type Result<T> = std::result::Result<T, UserError>;

/**
 * An error that can be displayed to the user.
 *
 * The message is expected to be the original error message, while the context if available is a more user friendly
 * message.
 */
#[derive(Debug, Clone)]
pub struct UserError {
    pub message: String,
    pub context: String,
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for UserError {}

impl UserError {
    pub fn new(message: &str) -> Self {
        Self {
            message: message.to_string(),
            context: "".to_string(),
        }
    }
}

pub trait UserContext<T> {
    fn context(self, context: &str) -> Result<T>;
}

impl<T, E: std::error::Error> UserContext<T> for std::result::Result<T, E> where UserError: From<E> {
    fn context(self, context: &str) -> Result<T> {
        match self {
            Ok(_) => Ok(self.unwrap()),
            Err(err) => {
                let mut err = UserError::from(err);
                err.context = context.to_string();
                Err(err)
            }
        }
    }
}

/**
 * Implement the From trait to convert an some standard errors into a UserError.
 */
impl From<std::num::ParseIntError> for UserError {
    fn from(err: std::num::ParseIntError) -> UserError {
        UserError::new(&err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Clone)]
    struct TestError {
        message: String,
    }

    impl fmt::Display for TestError {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl Error for TestError {}

    impl From<TestError> for UserError {
        fn from(err: TestError) -> UserError {
            UserError::new(&err.to_string())
        }
    }

    /**
     * Implement the From trait to convert an Var::Error into a UserError to test the UserContext trait.
     */
    impl From<std::env::VarError> for UserError {
        fn from(err: std::env::VarError) -> UserError {
            UserError::new(&err.to_string())
        }
    }

    fn test_context_ok() -> Result<String> {
        std::env::set_var("error_test_context_ok", "test");
        std::env::var("error_test_context_ok").context("context")
    }

    fn test_context_error() -> Result<String> {
        std::env::var("error_test_context_error").context("context")
    }

    #[test]
    fn test_user_error() {
        let err = UserError::new("test");
        assert_eq!(err.message, "test");
        assert_eq!(err.context, "");
        assert_eq!(err.to_string(), "test");
    }

    #[test]
    fn test_user_context() {
        let err = TestError { message: "test".to_string() };
        let result: Result<()> = Err(err).context("context");
        assert_eq!(result.is_err(), true);
        let err = result.unwrap_err();
        assert_eq!(err.message, "test");
        assert_eq!(err.context, "context");
    }

    #[test]
    fn test_user_context_trait() {
        let res_ok = test_context_ok();
        assert_eq!(res_ok.is_ok(), true);

        let res_err = test_context_error();
        assert_eq!(res_err.is_ok(), false);
    }
}
