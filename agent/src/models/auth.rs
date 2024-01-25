use crate::json_enum;
use serde::{ Serialize, Deserialize };

json_enum!(AuthenticationMethod, UserPassword);
json_enum!(TokenType, Bearer);

/// Body of the POST /auth/logon endpoint.
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Authentication {
    /// The authentication method.
    /// As of now, only the UserPassword method is supported.
    #[allow(dead_code)]
    pub method: AuthenticationMethod,

    /// The credentials used to authenticate the user.
    pub credentials: Credentials,
}

/// Credentials used to authenticate a user.
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

/// Response of the POST /auth/logon endpoint.
#[derive(Serialize, Debug)]
pub struct SecurityToken {
    /// The security token is a 256-bit random number encoded in hexadecimal.
    pub token: String,

    /// The type of the token (always "Bearer" for now)
    pub token_type: TokenType,

    /// The refresh token is used to generate a new security token.
    pub refresh_token: String,

    /// The number of seconds after which the token will expire.
    pub expires: u32,

    /// The user id associated with the token.
    pub user_id: String,
}

/// The request body of the POST /auth/refresh-token endpoint.
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RefreshToken {
    pub refresh_token: String,
}
