use crate::jinja::JinjaResult;
use tracing::{debug, info};

pub fn log(message: String, info: Option<bool>) -> JinjaResult<String> {
    match info {
        Some(true) => info!("{}", message),
        _ => debug!("{}", message),
    }
    Ok("".to_string())
}
