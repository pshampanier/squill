use hex;
use rand::Rng;
use axum::{ Router, routing::post };
use axum::extract::{ Json, State };
use crate::resources::users;
use crate::server::context::RequestContext;
use crate::utils::validators::sanitize_username;
use crate::utils::constants::USER_FILENAME;
use crate::{ api::error::ServerResult, settings };
use crate::models::auth::{ TokenType, Authentication, SecurityToken, RefreshToken };
use crate::server::state::ServerState;

use super::error::Error;

const USERNAME_LOCAL: &str = "local";

impl Default for SecurityToken {
    fn default() -> Self {
        Self {
            token: generate_token(),
            token_type: TokenType::Bearer,
            refresh_token: generate_token(),
            expires_in: settings::get_token_expiration(),
            user_id: "".to_string(),
        }
    }
}

/// POST /auth/logon
///
/// This endpoint is used to authenticate a user and to generate a security token.
/// As for now it only supports the local user and the password must be empty.
async fn logon(
    State(state): State<ServerState>,
    auth: Json<Authentication>
) -> ServerResult<Json<SecurityToken>> {
    // Usernames are case insensitive. We are using the lowercase version to prevent any duplicate issues when the
    // filesystem is case insensitive.
    let username = sanitize_username(auth.credentials.username.as_str())?;

    // The username must be a valid username and the user must exists.
    if
        !username.eq(USERNAME_LOCAL) ||
        !settings::get_user_dir(&username).join(USER_FILENAME).exists()
    {
        return Err(Error::Forbidden);
    }

    if !auth.credentials.password.is_empty() {
        // As of now, we only support the local user and the password must be empty.
        return Err(Error::BadRequest("Password must be empty".to_string()));
    }

    let Ok(user) = users::get_user(&username) else {
        // The user does not exists.
        return Err(Error::Forbidden);
    };

    // Create a security token.
    let token = SecurityToken {
        user_id: user.user_id.clone(),
        ..Default::default()
    };

    state.add_user_session(&token, &username);
    Ok(Json(token))
}

/// POST /auth/refresh-token
/// TODO: TO BE IMPLEMENTED
async fn refresh_token(
    context: ServerResult<RequestContext>,
    State(state): State<ServerState>,
    token: Json<RefreshToken>
) -> ServerResult<Json<SecurityToken>> {
    if token.refresh_token.is_empty() {
        return Err(Error::BadRequest("The refresh token is empty".to_string()));
    }
    let Some(token) = state.refresh_token(&context?.get_user_id(), &token.refresh_token) else {
        return Err(Error::Forbidden);
    };
    let token = token.as_ref().clone();
    Ok(Json(token))
}

/// Create a router for the endpoints that can be reached without authentication.
pub fn routes(state: ServerState) -> Router {
    Router::new().route("/auth/logon", post(logon)).with_state(state)
}

/// Create a router for the endpoints that requires authentication to be reached.
pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new().route("/auth/refresh-token", post(refresh_token)).with_state(state)
}

/// Generate a security token.
///
/// The security token is a 256-bit random number encoded in hexadecimal. We are using the `rand` crate to generate the
/// random number which is considered cryptographically secure (source: https://bit.ly/3vOrqSh).
fn generate_token() -> String {
    let token: [u8; 32] = rand::thread_rng().gen();
    return hex::encode(token);
}

#[cfg(test)]
mod test {
    use crate::{
        resources::users::create_user,
        models::auth::{ AuthenticationMethod, Credentials },
    };
    use crate::utils::tests::settings;
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
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());

        // 1) invalid user (the user directory does not exist)
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials {
                    username: "local".to_string(),
                    password: "".to_string(),
                },
            });
            let state = axum::extract::State(ServerState::new());
            assert!(matches!(logon(state, body).await, Err(Error::Forbidden)));
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
            let state = axum::extract::State(ServerState::new());
            let result = logon(state, body).await;
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
            let state = axum::extract::State(ServerState::new());
            assert!(matches!(logon(state, body).await, Err(Error::Forbidden)));
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
            let state = axum::extract::State(ServerState::new());
            assert!(matches!(logon(state, body).await, Err(Error::BadRequest(_))));
        }

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
