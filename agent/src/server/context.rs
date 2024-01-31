use std::sync::Arc;

use axum::{ async_trait, extract::FromRequestParts, http::request::Parts };
use crate::{
    api::error::{ Error, ServerResult },
    server::state::UserSession,
    utils::constants::USERNAME_ANONYMOUS,
};

#[derive(Clone)]
pub struct RequestContext {
    _request_id: String,
    user_session: Option<Arc<UserSession>>,
}

impl RequestContext {
    /// Create a new request context.
    pub fn new(request_id: &str) -> Self {
        Self {
            _request_id: request_id.to_string(),
            user_session: None,
        }
    }

    pub fn add_user_session(&mut self, user_session: Arc<UserSession>) {
        self.user_session = Some(user_session);
    }

    /// Get the request id.
    pub fn _get_request_id(&self) -> &str {
        &self._request_id
    }

    /// Get the user session.
    pub fn get_username(&self) -> &str {
        match self.user_session.as_ref() {
            Some(user_session) => user_session.get_username(),
            None => USERNAME_ANONYMOUS,
        }
    }
}

/// The request context extractor.
///
/// # Returns
/// `Error::InternalServerError` if the request context is not present in the request.
#[async_trait]
impl<S> FromRequestParts<S> for RequestContext where S: Send + Sync {
    type Rejection = Error;
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> ServerResult<Self> {
        let context = parts.extensions.get::<Result<RequestContext, Error>>();
        let Some(context) = context else {
            return Err(Error::InternalServerError);
        };
        return context.clone();
    }
}
