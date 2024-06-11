use hex;
use rand::Rng;
use axum::{ Router, routing::post };
use axum::extract::{ Json, State };
use axum::http::header::{ HeaderMap, AUTHORIZATION };
use tracing::error;
use crate::resources::users;
use crate::utils::user_error::UserError;
use crate::utils::validators::{ parse_authorization_header, sanitize_username };
use crate::settings;
use crate::server::state::ServerState;
use crate::models::auth::{ Authentication, AuthenticationMethod, RefreshToken, SecurityToken, TokenType };
use crate::api::error::{ Error, ServerResult };

const USERNAME_LOCAL: &str = "local";

impl Default for SecurityToken {
    fn default() -> Self {
        Self {
            token: generate_token(),
            token_type: TokenType::Bearer,
            refresh_token: generate_token(),
            expires_in: settings::get_token_expiration().as_secs() as u32,
            user_id: String::new(),
        }
    }
}

/// POST /auth/logon
///
/// This endpoint is used to authenticate a user and to generate a security token.
/// As for now it only supports the local user and the password must be empty.
async fn logon(State(state): State<ServerState>, auth: Json<Authentication>) -> ServerResult<Json<SecurityToken>> {
    match auth.method {
        AuthenticationMethod::UserPassword => {
            // Usernames are case insensitive. We are using the lowercase version to prevent any duplicate issues when the
            // filesystem is case insensitive.
            let username = sanitize_username(auth.credentials.username.as_str())?;

            // As for now, only the local user is supported.
            if username.ne(USERNAME_LOCAL) {
                return Err(Error::Forbidden);
            }

            if !auth.credentials.password.is_empty() {
                // As of now, we only support the local user and the password must be empty.
                return Err(Error::BadRequest("Password must be empty".to_string()));
            }

            match users::get_user(&username) {
                Ok(user) => {
                    let token = state.add_user_session(&username, &user.user_id);
                    Ok(Json((*token).clone()))
                }
                Err(err) => {
                    match err.downcast_ref::<UserError>() {
                        Some(UserError::NotFound(_)) => {
                            error!("{}", err);
                            Err(Error::Forbidden)
                        }
                        _ => {
                            error!("Logon error for user `{}`: {}", &username, err);
                            Err(Error::InternalServerError)
                        }
                    }
                }
            }
        }
    }
}

/// POST /auth/refresh-token
async fn refresh_token(
    State(state): State<ServerState>,
    token: Json<RefreshToken>
) -> ServerResult<Json<SecurityToken>> {
    let Some(refresh_token) = state.get_refresh_token(&token.refresh_token) else {
        // Refresh token not found.
        return Err(Error::Forbidden);
    };

    let new_security_token = state.refresh_security_token(&refresh_token);
    Ok(Json((*new_security_token).clone()))
}

/// POST /auth/logout
///
/// This endpoint is used to logout a user, i.e. to invalidate the security and refresh tokens.
/// While the Authorization header is required, this endpoint will not return a 403 Forbidden if the tokens are invalid
/// or expired. Instead, it will return a 200 OK since the goal is only to invalidate the tokens. Nevertheless if the
/// Authorization header is missing or syntactically wrong, a 400 Bad Request will be returned.
async fn logout(State(state): State<ServerState>, headers: HeaderMap) -> ServerResult<()> {
    let authorization_header = headers.get(AUTHORIZATION);
    if authorization_header.is_none() {
        return Err(Error::BadRequest("Missing Authorization header".to_string()));
    }

    let Ok(security_token) = parse_authorization_header(
        AuthenticationMethod::UserPassword,
        authorization_header.unwrap()
    ) else {
        return Err(Error::BadRequest("Invalid Authorization header".to_string()));
    };

    if let Some(user_session) = state.get_user_session(&security_token) {
        state.revoke_security_token(&user_session.get_security_token());
    }

    Ok(())
}

/// Create a router for the endpoints that can be reached without authentication.
pub fn routes(state: ServerState) -> Router {
    Router::new()
        .route("/auth/logon", post(logon))
        .route("/auth/logout", post(logout))
        .route("/auth/refresh-token", post(refresh_token))
        .with_state(state)
}

/// Generate a security token.
///
/// The security token is a 256-bit random number encoded in hexadecimal. We are using the `rand` crate to generate the
/// random number which is considered cryptographically secure (source: <https://bit.ly/3vOrqSh>).
fn generate_token() -> String {
    let token: [u8; 32] = rand::thread_rng().gen();
    hex::encode(token)
}

#[cfg(test)]
mod test {
    use axum::http::HeaderValue;
    use crate::resources::users::create_user;
    use crate::models::auth::{ AuthenticationMethod, Credentials };
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
            create_user(&"local".into()).unwrap();
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

    #[tokio::test]
    async fn test_refresh_token() {
        // setup: create a user session
        let state = axum::extract::State(ServerState::new());
        let security_token = state.add_user_session(&"local".into(), "local_id");

        // 1) invalid refresh token
        assert!(
            matches!(
                refresh_token(state.clone(), Json(RefreshToken { refresh_token: "invalid".to_string() })).await,
                Err(Error::Forbidden)
            )
        );

        // 2) valid refresh token
        assert!(
            refresh_token(
                state.clone(),
                Json(RefreshToken { refresh_token: security_token.refresh_token.clone() })
            ).await.is_ok()
        );
    }

    #[tokio::test]
    async fn test_logout() {
        // setup: create a user session
        let state = axum::extract::State(ServerState::new());
        let mut headers = HeaderMap::new();
        let security_token = state.add_user_session(&"local".into(), "local_id");

        // 1) missing Authorization header
        assert!(matches!(logout(state.clone(), headers.clone()).await, Err(Error::BadRequest(_))));

        // 2) invalid Authorization header
        headers.insert(AUTHORIZATION, HeaderValue::from_static("Bearerxxxx invalid"));
        assert!(matches!(logout(state.clone(), headers.clone()).await, Err(Error::BadRequest(_))));

        // 3) valid Authorization header
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", security_token.token)).unwrap());
        assert!(logout(state.clone(), headers.clone()).await.is_ok());
        assert!(state.get_user_session(&security_token.token).is_none());

        // 4) valid Authorization header but the security token is no longer valid
        assert!(logout(state.clone(), headers.clone()).await.is_ok());
    }
}
