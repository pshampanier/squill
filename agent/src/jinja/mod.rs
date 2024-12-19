use minijinja as jinja;

pub mod env;
pub(crate) mod exceptions;
pub(crate) mod functions;

pub use env::JinjaEnvironment;

/// The default file extension for Jinja templates
const JINJA_FILE_EXTENSION: &str = "j2";

/// A result type for Jinja operations
type JinjaResult<T> = std::result::Result<T, jinja::Error>;

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use tokio_test::{assert_err, assert_ok};

    #[derive(Serialize)]
    pub struct EmptyContext {}

    #[test]
    fn test_jinja_log() {
        let jinja_env = JinjaEnvironment::new();
        assert_ok!(jinja_env.render_str("{{ log('hello' ~ 'world', true) }}", &EmptyContext {}));
        assert_ok!(jinja_env.render_str("{{ log('hello world') }}", &EmptyContext {}));
    }

    #[test]
    fn test_jinja_exceptions() {
        let jinja_env = JinjaEnvironment::new();
        let error = jinja_env.render_str("{{ exceptions.raise_compiler_error('this is an error') }}", &EmptyContext {});
        assert!(error.is_err() && error.unwrap_err().to_string().contains("this is an error"));
        assert_ok!(jinja_env.render_str("{{ exceptions.warn('this is a warning') }}", &EmptyContext {}));
        assert_err!(jinja_env.render_str("{{ exceptions.unknown_method() }}", &EmptyContext {}));
    }
}
