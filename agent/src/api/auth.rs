use crate::api::error::{Error, ServerResult};
use crate::models::auth::{Authentication, AuthenticationMethod, RefreshToken, SecurityTokens, TokenType};
use crate::resources::users;
use crate::server::state::ServerState;
use crate::settings;
use crate::utils::user_error::UserError;
use crate::utils::validators::{parse_authorization_header, sanitize_username};
use axum::extract::{Json, State};
use axum::http::header::{HeaderMap, AUTHORIZATION};
use axum::{routing::post, Router};
use hex;
use rand::Rng;
use tracing::{error, info};
use uuid::Uuid;

impl Default for SecurityTokens {
    fn default() -> Self {
        Self {
            access_token: generate_token(),
            access_token_type: TokenType::Bearer,
            refresh_token: generate_token(),
            expires_in: settings::get_token_expiration().as_secs() as u32,
            user_id: Uuid::nil(),
            client_id: Uuid::nil(),
            session_id: Uuid::nil(),
        }
    }
}

/// POST /auth/logon
///
/// This endpoint is used to authenticate a user and to generate a security token.
/// As for now it only supports the local user and the password must be empty.
async fn logon(State(state): State<ServerState>, auth: Json<Authentication>) -> ServerResult<Json<SecurityTokens>> {
    match auth.method {
        AuthenticationMethod::UserPassword => {
            // Usernames are case insensitive. We are using the lowercase version to prevent any duplicate issues when the
            // filesystem is case insensitive.
            let username = sanitize_username(auth.credentials.username.as_str())?;

            // As for now, only the local user is supported.
            if username.ne(users::local_username()) {
                return Err(Error::Forbidden);
            }

            if !auth.credentials.password.is_empty() {
                // As of now, we only support the local user and the password must be empty.
                return Err(Error::BadRequest("Password must be empty".to_string()));
            }

            let conn = state.get_agentdb_connection().await?;
            match users::get_by_username(&conn, &username).await {
                Ok(user) => {
                    let token = state.add_user_session(&username, user.user_id);
                    info!("User `{}` logged in.", &username);
                    Ok(Json((*token).clone()))
                }
                Err(err) => match err.downcast_ref::<UserError>() {
                    Some(UserError::NotFound(_)) => {
                        error!("{}", err);
                        Err(Error::Forbidden)
                    }
                    _ => {
                        error!("Logon error for user `{}`: {}", &username, err);
                        Err(Error::InternalServerError)
                    }
                },
            }
        }
    }
}

/// POST /auth/refresh-token
async fn refresh_token(
    State(state): State<ServerState>,
    token: Json<RefreshToken>,
) -> ServerResult<Json<SecurityTokens>> {
    let Ok(refresh_token) = state.refresh_security_tokens(&token.refresh_token) else {
        // Refresh token not found.
        return Err(Error::Forbidden);
    };
    Ok(Json((*refresh_token).clone()))
}

/// POST /auth/logout
///
/// This endpoint is used to logout a user, i.e. to invalidate the security and refresh tokens.
/// While the Authorization header is required, this endpoint will not return a 403 Forbidden if the tokens are invalid
/// or expired. Instead, it will return a 200 OK since the goal is only to invalidate the tokens. Nevertheless if the
/// Authorization header is missing or syntactically wrong, a 400 Bad Request will be returned.
async fn logout(State(state): State<ServerState>, headers: HeaderMap) -> ServerResult<()> {
    let security_token = match headers.get(AUTHORIZATION) {
        Some(header) => match header.to_str() {
            Ok(header_value) => parse_authorization_header(AuthenticationMethod::UserPassword, header_value)
                .map_err(|e| Error::BadRequest(e.to_string()))?,
            Err(_) => return Err(Error::BadRequest("Invalid Authorization header".to_string())),
        },
        None => return Err(Error::BadRequest("Missing Authorization header".to_string())),
    };

    state.revoke_session(&security_token);
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
    use super::*;
    use crate::models::auth::{AuthenticationMethod, Credentials};
    use crate::resources::users;
    use crate::utils::tests;
    use axum::http::HeaderValue;

    #[test]
    fn test_generate_token() {
        let token = generate_token();
        assert_eq!(token.len(), 64);
    }

    #[tokio::test]
    async fn test_logon() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let local_username = users::local_username();

        // 1) invalid user (the user directory does not exist)
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials { username: "invalid_user".to_string(), password: "".to_string() },
            });
            let state = axum::extract::State(ServerState::new(conn_pool.clone()));
            assert!(matches!(logon(state, body).await, Err(Error::Forbidden)));
        }

        // 2) valid user
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials { username: local_username.to_string(), password: "".to_string() },
            });
            let state = axum::extract::State(ServerState::new(conn_pool.clone()));
            let result = logon(state, body).await;
            assert!(result.is_ok());
            let result = result.unwrap();
            assert_eq!(result.access_token.len(), 64);
        }

        // 3) unexpected username (not "local")
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials { username: "marty_mcfly".to_string(), password: "".to_string() },
            });
            let state = axum::extract::State(ServerState::new(conn_pool.clone()));
            assert!(matches!(logon(state, body).await, Err(Error::Forbidden)));
        }

        // 4) unexpected password (expected empty string)
        {
            let body = Json(Authentication {
                method: AuthenticationMethod::UserPassword,
                credentials: Credentials { username: local_username.to_string(), password: "****".to_string() },
            });
            let state = axum::extract::State(ServerState::new(conn_pool.clone()));
            assert!(matches!(logon(state, body).await, Err(Error::BadRequest(_))));
        }
    }

    #[tokio::test]
    async fn test_refresh_token() {
        // setup: create a user session
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let state = axum::extract::State(ServerState::new(conn_pool));
        let security_token = state.add_user_session(&"local".into(), Uuid::new_v4());

        // 1) invalid refresh token
        assert!(matches!(
            refresh_token(state.clone(), Json(RefreshToken { refresh_token: "invalid".to_string() })).await,
            Err(Error::Forbidden)
        ));

        // 2) valid refresh token
        assert!(refresh_token(
            state.clone(),
            Json(RefreshToken { refresh_token: security_token.refresh_token.clone() })
        )
        .await
        .is_ok());
    }

    #[tokio::test]
    async fn test_logout() {
        // setup: create a user session
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let state = axum::extract::State(ServerState::new(conn_pool));
        let mut headers = HeaderMap::new();
        let security_tokens = state.add_user_session(&"local".into(), Uuid::new_v4());

        // 1) missing Authorization header
        assert!(matches!(logout(state.clone(), headers.clone()).await, Err(Error::BadRequest(_))));

        // 2) invalid Authorization header
        headers.insert(AUTHORIZATION, HeaderValue::from_static("Bearerxxxx invalid"));
        assert!(matches!(logout(state.clone(), headers.clone()).await, Err(Error::BadRequest(_))));

        // 3) valid Authorization header
        headers
            .insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", security_tokens.access_token)).unwrap());
        assert!(logout(state.clone(), headers.clone()).await.is_ok());
        assert!(state.get_user_session(&security_tokens.access_token).is_none());

        // 4) valid Authorization header but the access token is no longer valid
        assert!(logout(state.clone(), headers.clone()).await.is_ok());
    }
}
