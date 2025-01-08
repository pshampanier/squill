use crate::api::error::{Error, ServerResult};
use crate::server::user_sessions::UserSession;
use crate::utils::validators::{sanitize_username, Username};
use crate::{resources, Result};
use axum::{async_trait, extract::FromRequestParts, http::request::Parts};
use std::sync::Arc;

#[derive(Clone)]
pub struct RequestContext {
    _request_id: String,
    user_session: Option<Arc<UserSession>>,
}

impl RequestContext {
    /// Create a new request context.
    pub fn new<S: Into<String>>(request_id: S) -> Self {
        Self { _request_id: request_id.into(), user_session: None }
    }

    pub fn add_user_session(&mut self, user_session: Arc<UserSession>) {
        self.user_session = Some(user_session);
    }

    /// Get the request id.
    pub fn _get_request_id(&self) -> &str {
        &self._request_id
    }

    /// Get the user session.
    pub fn get_username(&self) -> &Username {
        match self.user_session.as_ref() {
            Some(user_session) => user_session.get_username(),
            None => resources::users::anonymous_username(),
        }
    }

    /// Get the user session.
    pub fn get_user_session(&self) -> ServerResult<Arc<UserSession>> {
        match self.user_session.as_ref() {
            Some(user_session) => Ok(user_session.clone()),
            // FIXME: Err(err_forbidden!("You must be authenticated to access this resource."))
            None => Err(crate::api::error::Error::Forbidden),
        }
    }

    /// Get the user session only if matching the given username.
    ///
    /// This function ensure that the given username matches the current user session. This is usually used by the API
    /// to ensure that access to some resources are only allowed to the user that owns them.
    ///
    /// # Returns
    /// If the user session does not match the given username, return `UserError::Forbidden`.
    /// If username is a not a valid username, return [UserError::InvalidParameter].
    pub fn get_user_session_with_username(&self, username: &str) -> ServerResult<Arc<UserSession>> {
        sanitize_username(username)?;
        match self.user_session.as_ref() {
            Some(user_session) if user_session.get_username() == username => Ok(user_session.clone()),
            // FIXME: Err(err_forbidden!("You are not allowed to access this resource."))
            _ => Err(crate::api::error::Error::Forbidden),
        }
    }
}

/// The request context extractor.
///
/// # Returns
/// `Error::InternalServerError` if the request context is not present in the request.
#[async_trait]
impl<S> FromRequestParts<S> for RequestContext
where
    S: Send + Sync,
{
    type Rejection = Error;
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> ServerResult<Self> {
        let context = parts.extensions.get::<Result<RequestContext, Error>>();
        let Some(context) = context else {
            return Err(Error::InternalServerError);
        };
        return context.clone();
    }
}
