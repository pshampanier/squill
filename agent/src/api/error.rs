use axum::response::{ IntoResponse, Response };
use axum::http::StatusCode;

pub type ServerResult<T> = std::result::Result<T, Error>;

#[derive(Debug)]
pub enum Error {
    // NotFound,
    Forbidden,
    BadRequest,
    // InternalServerError,
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Error::Forbidden => (StatusCode::FORBIDDEN, "Forbidden").into_response(),
            Error::BadRequest => (StatusCode::BAD_REQUEST, "Bad Request").into_response(),
            /*            
            Error::NotFound => (StatusCode::NOT_FOUND, "Not Found").into_response(),
            Error::InternalServerError =>
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response(),
            */
        }
    }
}
