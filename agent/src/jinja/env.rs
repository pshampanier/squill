use crate::jinja::exceptions::Exceptions;
use crate::jinja::functions;
use crate::jinja::JINJA_FILE_EXTENSION;
use crate::settings;
use crate::utils::constants::DRIVERS_DIRNAME;
use crate::Result;
use minijinja as jinja;
use serde::Serialize;
use std::path::PathBuf;
use tracing::{debug, error};

pub struct JinjaEnvironment<'a> {
    inner: jinja::Environment<'a>,
}

impl JinjaEnvironment<'_> {
    pub fn new() -> Self {
        let mut env = jinja::Environment::new();
        env.add_function("log", functions::log);
        env.add_global("exceptions", jinja::Value::from_object(Exceptions));
        Self { inner: env }
    }

    pub fn new_from_driver(driver: &str) -> Self {
        let mut jinja_env = Self::new();
        jinja_env.set_template_directory(settings::get_assets_dir().join(DRIVERS_DIRNAME).join(driver));
        jinja_env
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
