/// HTTP Headers
///
/// IMPORTANT:
/// - When adding new headers, make sure to update `get_cors_layer()` in `agent/src/server/web.rs`.
/// - Headers MUST be in lowercase, otherwise HeaderName.from_static() will panic.
///
/// [HTTP Reference][https://docs.rs/http/1.1.0/http/header/struct.HeaderName.html#method.from_static]
pub const X_API_KEY_HEADER: &str = "x-api-key";
pub const X_REQUEST_ID_HEADER: &str = "x-request-id";
pub const X_RESOURCE_TYPE: &str = "x-resource-type";
pub const X_REQUEST_ORIGIN: &str = "x-origin";

// HTTP Query Parameters
pub const QUERY_PARAM_API_KEY: &str = "api_key";
pub const QUERY_PARAM_TOKEN: &str = "token";
pub const QUERY_PARAM_CLIENT_ID: &str = "client_id";
