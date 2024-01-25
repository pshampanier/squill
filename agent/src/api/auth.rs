use axum::{ Router, routing::post };
use lazy_static::lazy_static;
use axum::extract::Json;
use rand::Rng;
use regex::Regex;
use hex;
use crate::{ api::error::ServerResult, api::users::USER_FILENAME, settings };
use crate::models::auth::{ TokenType, Authentication, SecurityToken, RefreshToken };

use super::error::Error;

const USERNAME_LOCAL: &str = "local";
const DEFAULT_TOKEN_EXPIRATION: u32 = 3600;

lazy_static! {
    // A regular expression used to check the validity of a username.

    // - The username must be at least 3 characters long.
    // - The username must only contain lowercase letters, numbers, dashes, underscores and dots.
    // - The username must start with a letter or a number.
    static ref RE_USERNAME: Regex = Regex::new(r"^[a-z0-9][a-z0-9\-_]{2,}$").unwrap();
}

/// POST /auth/logon
///
/// This endpoint is used to authenticate a user and to generate a security token.
/// As for now it only supports the local user and the password must be empty.
async fn logon(auth: Json<Authentication>) -> ServerResult<Json<SecurityToken>> {
    // Usernames are case insensitive. We are using the lowercase version, especially whenever we need to access the
    // filesystem.
    let username = auth.credentials.username.to_lowercase();

    // The username must be a valid username and the user must exists.
    if
        !RE_USERNAME.is_match(&username) ||
        !username.eq(USERNAME_LOCAL) ||
        !settings::get_user_dir(&username).join(USER_FILENAME).exists()
    {
        return Err(Error::Forbidden);
    }

    if !auth.credentials.password.is_empty() {
        // As of now, we only support the local user and the password must be empty.
        return Err(Error::BadRequest("Password must be empty".to_string()));
    }

    let response = SecurityToken {
        token: generate_token(),
        token_type: TokenType::Bearer,
        refresh_token: generate_token(),
        expires: DEFAULT_TOKEN_EXPIRATION,
        user_id: "todo".to_string(), // TODO: Get the user id from the context.
    };

    Ok(Json(response))
}

/// TODO: TO BE IMPLEMENTED
/// POST /auth/refresh-token
async fn refresh_token(token: Json<RefreshToken>) -> ServerResult<Json<SecurityToken>> {
    if token.refresh_token.is_empty() {
        return Err(Error::BadRequest("The refresh token is empty".to_string()));
    }
    todo!()
}

pub fn routes() -> Router {
    Router::new()
        .route("/auth/logon", post(logon))
        .route("/auth/refresh-token", post(refresh_token))
}

/// Generate a security token.
///
/// The security token is a 256-bit random number encoded in hexadecimal. We are using the `rand` crate to generate the
/// random number which is considered cryptographically secure (source: https://bit.ly/3vOrqSh).
fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let token: [u8; 32] = rng.gen();
    return hex::encode(token);
}

#[cfg(test)]
mod test {
    use crate::{ api::users::create_user, models::auth::{ AuthenticationMethod, Credentials } };
    use super::*;

    #[test]
    fn test_generate_token() {
        let token = generate_token();
        assert_eq!(token.len(), 64);
    }

    #[tokio::test]
    async fn test_logon() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::tests::set_base_dir(temp_dir.path().to_str().unwrap().to_string());

        // 1) invalid user (the user directory does not exist)
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials {
                    username: "local".to_string(),
                    password: "".to_string(),
                },
            });
            assert!(matches!(logon(body).await, Err(Error::Forbidden)));
        }

        // 2) valid user
        {
            create_user("local").unwrap();
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials {
                    username: "local".to_string(),
                    password: "".to_string(),
                },
            });
            let result = logon(body).await;
            assert!(result.is_ok());
            let result = result.unwrap();
            assert_eq!(result.token.len(), 64);
        }

        // 3) unexpected username (not "local")
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials {
                    username: "marty_mcfly".to_string(),
                    password: "".to_string(),
                },
            });
            assert!(matches!(logon(body).await, Err(Error::Forbidden)));
        }

        // 4) unexpected password (expected empty string)
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials {
                    username: "local".to_string(),
                    password: "****".to_string(),
                },
            });
            assert!(matches!(logon(body).await, Err(Error::BadRequest(_))));
        }

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
