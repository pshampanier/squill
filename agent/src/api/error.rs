use axum::http::header::InvalidHeaderValue;
use axum::response::{ IntoResponse, Response };
use axum::http::StatusCode;
use anyhow::Error as AnyhowError;

pub type ServerResult<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone)]
pub enum Error {
    // NotFound,
    Forbidden,
    BadRequest(String),
    InternalServerError,
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Error::Forbidden => (StatusCode::FORBIDDEN, "Forbidden").into_response(),
            Error::BadRequest(reason) =>
                (StatusCode::BAD_REQUEST, format!("Bad Request: {}", reason)).into_response(),
            Error::InternalServerError =>
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response(),
            /*            
            Error::NotFound => (StatusCode::NOT_FOUND, "Not Found").into_response(),
            */
        }
    }
}

// TODO: log the original error
impl From<anyhow::Error> for Error {
    fn from(_: AnyhowError) -> Self {
        Error::InternalServerError
    }
}

/// Convert an `InvalidHeaderValue` into a `BadRequest` error.
///
/// This is used to convert the error returned by `HeaderValue::from_str` into a `InternalServerError` error.
/// I'm making the assumption that the only time this error occurs is when adding a header into the reponse, not when
/// parsing a header from the request because the last should trigger a `BadRequest` instead.
impl From<InvalidHeaderValue> for Error {
    fn from(_: InvalidHeaderValue) -> Self {
        Error::InternalServerError
    }
}
