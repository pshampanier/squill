use axum::{ async_trait, extract::FromRequestParts, http::request::Parts };
use crate::{ api::error::{ Error, ServerResult }, server::state::UserSession };

#[derive(Clone)]
pub struct RequestContext {
    _request_id: String,
    username: String,
    user_id: String,
}

impl RequestContext {
    /// Create a new request context.
    pub fn new(request_id: &str) -> Self {
        Self {
            _request_id: request_id.to_string(),
            username: String::new(),
            user_id: String::new(),
        }
    }

    pub fn add_user_session(&mut self, user_session: &UserSession) {
        self.user_id = user_session.get_user_id().to_string();
    }

    /// Get the request id.
    pub fn _get_request_id(&self) -> &str {
        &self._request_id
    }

    /// Get the user session.
    pub fn get_username(&self) -> &str {
        &self.username
    }

    #[allow(dead_code)]
    pub fn get_user_id(&self) -> &str {
        self.user_id.as_str()
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
