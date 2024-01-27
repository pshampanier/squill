use std::sync::{ Mutex, Arc };
use std::num::NonZeroUsize;
use std::time::SystemTime;
use lru::LruCache;

use crate::models::auth::SecurityToken;
use crate::settings;

/// The user session cache.
///
/// The key is the security token. The user session is stored in an Arc to allow multiple threads to access it once
/// they got it from the cache. There is not explicit eviction when the expiration time is reached, the cache will
/// evict the entry when it needs to make room for a new entry. Nevertheless the user session will be considered as
/// expired and will be rejected by the server.
type UserSessionCache = Arc<Mutex<LruCache<String, Arc<UserSession>>>>;

pub struct UserSession {
    username: String,
    user_id: String,
    expires_at: u32,
}

#[derive(Clone)]
pub struct ServerState {
    user_sessions: UserSessionCache,
}

impl ServerState {
    /// Create a new state with the given agent settings.
    pub fn new() -> Self {
        Self {
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
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.put(token.token.to_string(), user_session);
                // TODO: add a metric about the number of user sessions in cache.
                return;
            }
            Err(_) => {
                // TODO: Log the error.
                panic!("Unable to recover from a poisoned user session mutex");
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
