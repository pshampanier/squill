use crate::Result;
use minijinja as jinja;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

const JINJA_FILE_EXTENSION: &str = "j2";

type JinjaResult<T> = std::result::Result<T, jinja::Error>;

pub struct JinjaEnvironment<'a> {
    inner: jinja::Environment<'a>,
}

impl JinjaEnvironment<'_> {
    pub fn new() -> Self {
        let mut env = jinja::Environment::new();
        env.add_function("log", fn_log);
        env.add_global("exceptions", jinja::Value::from_object(Exceptions));
        Self { inner: env }
    }

    pub fn set_template_directory(&mut self, directory: PathBuf) {
        self.inner.set_loader(move |name| {
            let mut path = directory.join(name);
            path.set_extension(JINJA_FILE_EXTENSION);
            debug!("Loading template: {:?}", path);
            if path.exists() {
                match std::fs::read_to_string(&path) {
                    Ok(content) => Ok(Some(content)),
                    Err(e) => {
                        error!("Cannot read template: {:?}. Error: {}", path, e);
                        Err(jinja::Error::from(jinja::ErrorKind::TemplateNotFound))
                    }
                }
            } else {
                error!("Template not found: {:?}", path);
                Err(jinja::Error::from(jinja::ErrorKind::TemplateNotFound))
            }
        });
    }
}

impl JinjaEnvironment<'_> {
    pub fn render_template<S: Serialize>(&self, name: &str, context: &S) -> Result<String> {
        let template = self.inner.get_template(name)?;
        Ok(template.render(context)?)
    }

    #[allow(dead_code)]
    pub fn render_str<S: Serialize>(&self, template: &str, context: &S) -> Result<String> {
        Ok(self.inner.render_str(template, context)?)
    }
}

fn fn_log(message: String, info: Option<bool>) -> JinjaResult<String> {
    match info {
        Some(true) => info!("{}", message),
        _ => debug!("{}", message),
    }
    Ok("".to_string())
}

#[derive(Debug)]
struct Exceptions;

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
