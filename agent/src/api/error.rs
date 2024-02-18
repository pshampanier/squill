use crate::models::errors::ResponseError;
use axum::http::header::InvalidHeaderValue;
use axum::response::{ IntoResponse, Response };
use axum::http::StatusCode;
use axum::body::Body;
use anyhow::Error as AnyhowError;
use tracing::error;

use crate::utils::user_error::UserError;

pub type ServerResult<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone)]
#[allow(clippy::enum_variant_names)]
pub enum Error {
    Forbidden,
    BadRequest(String),
    InternalServerError,
    UserError(UserError),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Error::Forbidden => (StatusCode::FORBIDDEN, "Forbidden").into_response(),
            Error::BadRequest(reason) => (StatusCode::BAD_REQUEST, format!("Bad Request: {}", reason)).into_response(),
            Error::InternalServerError => (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response(),
            Error::UserError(user_error) => user_error.into_response(),
        }
    }
}

/// Convert an `anyhow::Error` into a `Error`.
///
/// This is used to convert the error returned by `anyhow::Error` into an `Error` returned by REST endpoint.
/// The first `UserError` is extracted from the `anyhow::Error` chain of causes and returned as the `Error::UserError`
/// variant if present, otherwise the `Error::InternalServerError` is returned.
///
/// In the meantime, all the causes are logged using the `tracing` crate.
impl From<anyhow::Error> for Error {
    fn from(err: AnyhowError) -> Self {
        let mut user_error: Option<UserError> = None;
        for cause in err.chain() {
            if user_error.is_none() && cause.downcast_ref::<UserError>().is_some() {
                user_error = cause.downcast_ref::<UserError>().cloned();
            }
            error!("{}", cause);
        }
        match user_error {
            None => Error::InternalServerError,
            Some(error) => Error::UserError(error),
        }
    }
}

impl IntoResponse for UserError {
    fn into_response(self) -> Response<Body> {
        let (response_error, status) = match self {
            UserError::NotFound(message) =>
                (
                    ResponseError {
                        status: StatusCode::NOT_FOUND.as_u16(),
                        code: "not_found".to_string(),
                        message,
                    },
                    StatusCode::NOT_FOUND,
                ),
            UserError::InvalidParameter(message) =>
                (
                    ResponseError {
                        status: StatusCode::BAD_REQUEST.as_u16(),
                        code: "invalid_parameter".to_string(),
                        message,
                    },
                    StatusCode::BAD_REQUEST,
                ),
        };
        match serde_json::to_string(&response_error) {
            Ok(body) =>
                Response::builder()
                    .status(status)
                    .header("Content-Type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response(),
        }
    }
}

/// Convert an `InvalidHeaderValue` into a `BadRequest` error.
///
/// This is used to convert the error returned by `HeaderValue::from_str` into a `InternalServerError` error.
/// I'm making the assumption that the only time this error occurs is when adding a header into the response, not when
/// parsing a header from the request because the last should trigger a `BadRequest` instead.
impl From<InvalidHeaderValue> for Error {
    fn from(_: InvalidHeaderValue) -> Self {
        Error::InternalServerError
    }
}
