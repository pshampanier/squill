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

type RefreshTokenCache = Arc<Mutex<LruCache<String, Arc<RefreshToken>>>>;

/// A user session stored in the cache.
///
/// The user session is the server side of the security token. It contains a reference to the whole security token
/// information trasmited to the client, including the refresh token. The key in the cache is the security token value
/// ifself.
pub struct UserSession {
    username: String,
    expires_at: u32,
    security_token: Arc<SecurityToken>,
}

impl UserSession {
    /// Get the user id.
    pub fn get_user_id(&self) -> &str {
        self.security_token.user_id.as_str()
    }

    /// Ge the security token used to create the user session.
    pub fn get_security_token(&self) -> Arc<SecurityToken> {
        self.security_token.clone()
    }
}

/// A refresh token stored in the cache.
///
/// We are using a refresh token to generate a new security token. The `RefreshToken` kept in cache has a reference to
/// the last security token generated. This allows us to invalidate all the security tokens generated from a refresh.
pub struct RefreshToken {
    /// The refresh token token itself, it is a 256-bit random number encoded in hexadecimal.
    token: String,

    /// The last user session associated with the refresh token.
    /// It will be invalidated when a new security token is generated from the refresh token.
    user_session: Arc<UserSession>,
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
    pub fn add_user_session(&self, username: &str, user_id: &str) -> Arc<SecurityToken> {
        // Create the security token.
        let security_token = Arc::new(SecurityToken {
            user_id: user_id.to_string(),
            ..Default::default()
        });

        // Create the user session.
        let user_session = Arc::new(UserSession {
            username: username.to_string(),
            security_token: security_token.clone(),
            expires_at: Self::get_expiration_time(security_token.expires_in),
        });

        // Create a refresh token for the cache based on the security token.
        let refresh_token = Arc::new(RefreshToken {
            token: security_token.refresh_token.clone(),
            user_session: user_session.clone(),
        });

        // Add the user session to the cache.
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.put(security_token.token.to_string(), user_session);
                // TODO: add a metric about the number of user sessions in cache.
            }
            Err(_) => {
                // TODO: Log the error.
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }

        // Add the refresh token to the cache & return the security token.
        match self.refresh_tokens.lock() {
            Ok(mut refresh_tokens) => {
                refresh_tokens.put(refresh_token.token.clone(), refresh_token.clone());
                security_token
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
                        if user_session.expires_at > Self::get_expiration_time(0) {
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
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Get a refresh a security token from the cache.
    ///
    /// # Arguments
    /// refresh_token - The refresh token to look for.
    ///
    /// # Returns
    /// The security token if found, None otherwise.
    pub fn get_refresh_token(&self, refresh_token: &str) -> Option<Arc<RefreshToken>> {
        let Ok(mut refresh_tokens) = self.refresh_tokens.lock() else {
            panic!("Unable to recover from a poisoned user session mutex");
        };
        return refresh_tokens.get(refresh_token).cloned();
    }

    /// Replace a security token in the cache.
    ///
    /// This method will replace the previous tokens with the new ones. Neither the previous security token nor the
    /// previous refresh token will be usable.
    ///
    /// > **Important:** This method does not check the validity of the refresh token and is expecting to be called only
    /// with a previously validated refresh token obtained from the `get_refresh_token` method.
    ///
    /// # Arguments
    /// refresh_token - The refresh token.
    ///
    /// # Returns
    /// The new security token.
    pub fn refresh_security_token(&self, refresh_token: &RefreshToken) -> Arc<SecurityToken> {
        // Creation of a new security token
        let security_token = self.add_user_session(
            &refresh_token.user_session.username,
            refresh_token.user_session.get_user_id()
        );

        // Remove the previous security token from the cache.
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.pop(&refresh_token.user_session.security_token.token);
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }

        // Remove the previous refresh token from the cache.
        match self.refresh_tokens.lock() {
            Ok(mut refresh_tokens) => {
                refresh_tokens.pop(&refresh_token.token);
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned refresh token mutex");
            }
        }

        security_token
    }

    /// Revoke a security token.
    ///
    /// The given security token will be removed from the cache. Neither the security token nor the refresh token will
    /// be usable anymore.
    pub fn revoke_secutity_token(&self, security_token: &SecurityToken) {
        // Remove the previous security token from the cache.
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.pop(&security_token.token);
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }

        // Remove the previous refresh token from the cache.
        match self.refresh_tokens.lock() {
            Ok(mut refresh_tokens) => {
                refresh_tokens.pop(&security_token.refresh_token);
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned refresh token mutex");
            }
        }
    }

    /// Caculate the expiration time based on the current time and a duration in seconds.
    ///
    /// # Arguments
    /// duration - The duration from now in seconds.
    ///
    /// # Returns
    /// The expiration time in seconds since the UNIX epoch.
    fn get_expiration_time(duration: u32) -> u32 {
        (SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() as u32) +
            duration
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests::settings;

    #[test]
    fn test_add_user_session() {
        let state = ServerState::new();
        let session_token = state.add_user_session("username", "user_id");
        assert!(state.get_user_session(&session_token.token).is_some());
    }

    #[test]
    fn test_get_user_session() {
        let state = ServerState::new();
        let security_token = state.add_user_session("username", "user_id");

        // 1. get a non existing user session
        assert!(state.get_user_session("non_existant_token").is_none());

        // 2. get an existing user session
        let user_session = state.get_user_session(&security_token.token).unwrap();
        assert_eq!(user_session.get_user_id(), security_token.user_id);

        // 3. get an expired user session
        settings::set_token_expiration(0);
        let security_token_expired = state.add_user_session("username_expired", "user_id");
        assert!(state.get_user_session(&security_token_expired.token).is_none());
    }

    #[test]
    fn test_refresh_security_token() {
        // setup: create a security token
        let state = ServerState::new();
        let security_token = state.add_user_session("username", "user_id");
        let refresh_token = state.get_refresh_token(&security_token.refresh_token).unwrap();

        // refresh the security token using the refresh token
        let new_security_token = state.refresh_security_token(&refresh_token);

        // check that the old security token and refresh token are not valid anymore
        assert!(state.get_user_session(&security_token.token).is_none());
        assert!(state.get_refresh_token(&refresh_token.token).is_none());

        // check that the new security token is able to retrieve the user session
        let new_user_session = state.get_user_session(&new_security_token.token).unwrap();
        assert_eq!(new_user_session.get_user_id(), security_token.user_id);
    }
}
