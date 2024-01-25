use axum::response::{ IntoResponse, Response };
use axum::http::StatusCode;
use anyhow::Error as AnyhowError;

pub type ServerResult<T> = std::result::Result<T, Error>;

#[derive(Debug)]
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

impl From<AnyhowError> for Error {
    fn from(error: AnyhowError) -> Self {
        Error::InternalServerError
    }
}
