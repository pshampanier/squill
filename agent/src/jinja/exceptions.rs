use crate::jinja::JinjaResult;
use minijinja as jinja;
use std::sync::Arc;
use tracing::{error, warn};

#[derive(Debug)]
pub struct Exceptions;

impl Exceptions {
    /// Raise a compiler error
    ///
    /// This function is used to raise a compiler error in the Jinja template.
    /// The error will be logged and the rendering will be stopped.
    fn raise_compiler_error(&self, message: String) -> JinjaResult<jinja::Value> {
        error!("{}", &message);
        Err(jinja::Error::new(jinja::ErrorKind::InvalidOperation, message))
    }

    /// Log a warning message
    fn warn(&self, message: String) -> JinjaResult<jinja::Value> {
        warn!("{}", &message);
        Ok(jinja::Value::from(None::<jinja::Value>))
    }
}

impl jinja::value::Object for Exceptions {
    fn call_method(
        self: &Arc<Self>,
        _state: &jinja::State,
        name: &str,
        args: &[jinja::Value],
    ) -> JinjaResult<jinja::Value> {
        if name == "raise_compiler_error" {
            let (message,): (String,) = jinja::value::from_args(args)?;
            self.raise_compiler_error(message)
        } else if name == "warn" {
            let (message,): (String,) = jinja::value::from_args(args)?;
            self.warn(message)
        } else {
            Err(jinja::Error::from(jinja::ErrorKind::UnknownFunction))
        }
    }
}
