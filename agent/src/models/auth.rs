/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 *********************************************************************/
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AuthenticationMethod {
    UserPassword,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TokenType {
    Bearer,
}

/// A username
pub type Username = String;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Authentication {
    pub credentials: Credentials,

    pub method: AuthenticationMethod,
}

/// The credentials used to authenticate a user.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Credentials {
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub password: String,

    pub username: Username,
}

/// A security token used for authentication.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SecurityToken {
    /// The number of seconds after which the token will expire.
    pub expires_in: u32,

    /// The refresh token is used to generate a new security token.
    pub refresh_token: String,

    /// The security token is a 256-bit random number encoded in hexadecimal.
    pub token: String,

    /// The type of the token (always "Bearer" for now)
    pub token_type: TokenType,

    /// The unique identifier of the user that the token belongs to.
    pub user_id: uuid::Uuid,
}

/// The request body of the POST /auth/refresh-token endpoint.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RefreshToken {
    pub refresh_token: String,
}
