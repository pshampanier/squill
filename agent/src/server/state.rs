use std::sync::{ Mutex, Arc };
use std::num::NonZeroUsize;
use std::time::SystemTime;
use lru::LruCache;

use crate::models::auth::{ SecurityToken, TokenType };
use crate::settings;

/// The user session cache.
///
/// The key is the security token. The user session is stored in an Arc to allow multiple threads to access it once
/// they got it from the cache. There is not explicit eviction when the expiration time is reached, the cache will
/// evict the entry when it needs to make room for a new entry. Nevertheless the user session will be considered as
/// expired and will be rejected by the server.
type UserSessionCache = Arc<Mutex<LruCache<String, Arc<UserSession>>>>;

type RefreshTokenCache = Arc<Mutex<LruCache<String, Arc<RefreshToken>>>>;

pub struct UserSession {
    username: String,
    user_id: String,
    expires_at: u32,
}

impl UserSession {
    /// Get the username.
    pub fn get_username(&self) -> &str {
        self.username.as_str()
    }

    /// Get the user id.
    pub fn get_user_id(&self) -> &str {
        self.user_id.as_str()
    }
}

pub struct RefreshToken {
    token: String,
    username: String,
    user_id: String,
}

#[derive(Clone)]
pub struct ServerState {
    user_sessions: UserSessionCache,
    refresh_tokens: RefreshTokenCache,
}

impl ServerState {
    /// Create a new state with the given agent settings.
    pub fn new() -> Self {
        Self {
            refresh_tokens: Arc::new(
                Mutex::new(
                    LruCache::new(NonZeroUsize::new(settings::get_max_refresh_tokens()).unwrap())
                )
            ),
            user_sessions: Arc::new(
                Mutex::new(
                    LruCache::new(NonZeroUsize::new(settings::get_max_user_sessions()).unwrap())
                )
            ),
        }
    }

    /// Add a user session to the cache.
    ///
    /// This method will replace an existing user session if the token is already in the cache.
    pub fn add_user_session(&self, token: &SecurityToken, username: &str) {
        let user_session = Arc::new(UserSession {
            username: username.to_string(),
            user_id: token.user_id.clone(),
            expires_at: (
                SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() as u32
            ) + token.expires_in,
        });

        // Add the user session to the cache.
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.put(token.token.to_string(), user_session);
                // TODO: add a metric about the number of user sessions in cache.
            }
            Err(_) => {
                // TODO: Log the error.
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }

        // Add the refresh token to the cache.
        let refresh_token = Arc::new(RefreshToken {
            token: token.refresh_token.to_string(),
            username: username.to_string(),
            user_id: token.user_id.clone(),
        });
        match self.refresh_tokens.lock() {
            Ok(mut refresh_tokens) => {
                refresh_tokens.put(token.refresh_token.to_string(), refresh_token);
            }
            Err(_) => {
                // TODO: Log the error.
                panic!("Unable to recover from a poisoned refresh token mutex");
            }
        }
    }

    pub fn get_user_session(&self, token: &str) -> Option<Arc<UserSession>> {
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                match user_sessions.get(token) {
                    Some(user_session) => {
                        if
                            user_session.expires_at >
                            (
                                SystemTime::now()
                                    .duration_since(SystemTime::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs() as u32
                            )
                        {
                            // TODO: add a metric about the number hits.
                            return Option::Some(user_session.clone());
                        } else {
                            // expired, remove it from the cache
                            // TODO: add a metric about the number hits on expired tokens.
                            user_sessions.pop(token);
                            return Option::None;
                        }
                    }
                    None => {
                        // not found
                        // TODO: add a metric about the number miss.
                        return Option::None;
                    }
                }
            }
            Err(_) => {
                // TODO: Log the error.
                // We can't perform the recovery here, we need to leave the scope of the match otherwize the borrow
                // checker will complain about user_sessions.
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Refresh a security token.
    ///
    /// The refresh token is used to generate a new security token.
    /// The refresh token provided in the reponse is the refresh token provided in the request or a new refresh token.
    ///
    /// # Arguments
    /// user_id - The user id of the authenticated user.
    /// refresh_token - The refresh token to be used to generate a new security token.
    ///
    /// # Returns
    /// The new security token or None if the refresh token is invalid or does not match the authenticated user.
    pub fn refresh_token(&self, user_id: &str, refresh_token: &str) -> Option<Arc<SecurityToken>> {
        let Ok(mut refresh_tokens) = self.refresh_tokens.lock() else {
            panic!("Unable to recover from a poisoned user session mutex");
        };
        let Some(refresh_token) = refresh_tokens.get(refresh_token) else {
            // The refresh token does not exists.
            return Option::None;
        };
        if refresh_token.user_id.ne(user_id) {
            // The user id of the authenticated used for this request does not match, it would be like stealing someone
            // else's refresh token...
            return Option::None;
        }

        let new_security_token = Arc::new(SecurityToken {
            token: "".to_string(),
            token_type: TokenType::Bearer,
            refresh_token: "".to_string(),
            expires_in: settings::get_token_expiration(),
            user_id: refresh_token.user_id.clone(),
        });

        // TODO:
        // WRNING: THIS IS NOT CONSISTENT, WE SHOULD HAVE THE SECURITY TOCKEN ALWAYS GENERATED IN THE SAME CRATE...
        // 1. Generate a new security token
        // 2. Add the new security token to the cache
        // 3. Add the new refresh token to the cache
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests::settings;

    #[test]
    fn test_add_user_session() {
        let state = ServerState::new();
        let session_token = SecurityToken::default();
        state.add_user_session(&session_token, "username");
        assert!(state.get_user_session(&session_token.token).is_some());
    }

    #[test]
    fn test_get_user_session() {
        let state = ServerState::new();
        let session_token = SecurityToken::default();
        state.add_user_session(&session_token, "username");

        // 1. get a non existing user session
        assert!(state.get_user_session("non_existant_token").is_none());

        // 2. get an existing user session
        let user_session = state.get_user_session(&session_token.token).unwrap();
        assert_eq!(user_session.username, "username");
        assert_eq!(user_session.user_id, session_token.user_id);

        // 3. get an expired user session
        settings::set_token_expiration(0);
        let session_token_expired = SecurityToken::default();
        state.add_user_session(&session_token_expired, "username");
        assert!(state.get_user_session(&session_token_expired.token).is_none());
        assert!(state.get_user_session(&session_token.token).is_some());
    }
}
