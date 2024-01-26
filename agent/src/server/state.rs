use std::sync::{ Mutex, Arc };
use std::num::NonZeroUsize;
use std::time::SystemTime;
use lru::LruCache;

use crate::models::agent::AgentSettings;

/// The user session cache.
///
/// The key is the security token. The user session is stored in an Arc to allow multiple threads to access it once
/// they got it from the cache. There is not explicit eviction when the expiration time is reached, the cache will
/// evict the entry when it needs to make room for a new entry. Nevertheless the user session will be considered as
/// expired and will be rejected by the server.
///
/// The cache itself is protected by a mutex and stored behind an Arc. The purpose of the Arc is to allow to rebuild
/// a brand new cache if the mutex is poisoned. This should never happen but we never know... The recovery strategy
/// in case of a such event is to create a new cache. This will affect all existing user sessions but the clients should
/// be able to recover by using their refresh token.
type UserSessionCache = Arc<Mutex<LruCache<String, Arc<UserSession>>>>;

pub struct UserSession {
    username: String,
    user_id: String,
    expires_at: u32,
}

#[derive(Clone)]
pub struct State {
    agent_settings: Arc<AgentSettings>,
    user_sessions: UserSessionCache,
}

impl State {
    /// Create a new state with the given agent settings.
    pub fn new(agent_settings: AgentSettings) -> Self {
        let agent_settings = Arc::new(agent_settings);
        Self {
            agent_settings: agent_settings.clone(),
            user_sessions: Self::new_user_session_cache(agent_settings.max_user_sessions),
        }
    }

    /// Get the agent settings.
    pub fn get_agent_settings(&self) -> Arc<AgentSettings> {
        self.agent_settings.clone()
    }

    /// Update the agent settings.
    ///
    /// This is used to update the agent settings when the configuration file is reloaded or when the settings are
    /// updated from the API.
    ///
    /// # Warning
    /// Replacing the agent settings will not affect all settings the same way. For example, updating max_user_sessions
    /// will have zero effect, updating token_expiration will only affect new user sessions.
    pub fn update_agent_settings(&mut self, agent_settings: AgentSettings) {
        self.agent_settings = Arc::new(agent_settings);
    }

    /// Add a user session to the cache.
    ///
    /// This method will replace an existing user session if the token is already in the cache.
    pub fn add_user_session(&mut self, token: &str, username: &str, user_id: &str) {
        let user_session = Arc::new(UserSession {
            username: username.to_string(),
            user_id: user_id.to_string(),
            expires_at: (
                SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() as u32
            ) + self.agent_settings.token_expiration,
        });
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.put(token.to_string(), user_session);
                // TODO: add a metric about the number of user sessions in cache.
                return;
            }
            Err(_) => {
                // TODO: Log the error.
                // We can't perform the recovery here, we need to leave the scope of the match otherwize the borrow
                // checker will complain about user_sessions.
            }
        }

        // The mutex is poisoned, we need to recover from this.
        self.user_sessions = Self::new_user_session_cache(self.agent_settings.max_user_sessions);
        // try again
        match self.user_sessions.lock() {
            Ok(mut user_sessions) => {
                user_sessions.put(token.to_string(), user_session);
                return;
            }
            Err(_) => {
                // TODO: Log the error.
                // We can't do anything else here, the recovery failed.
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    pub fn get_user_session(&mut self, token: &str) -> Option<Arc<UserSession>> {
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
            }
        }
        // The mutex is poisoned, we can recover from this by creating a new cache.
        self.user_sessions = Self::new_user_session_cache(self.agent_settings.max_user_sessions);
        Option::None
    }

    fn new_user_session_cache(max_user_sessions: usize) -> UserSessionCache {
        Arc::new(Mutex::new(LruCache::new(NonZeroUsize::new(max_user_sessions).unwrap())))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_user_session() {
        let mut state = State::new(AgentSettings::default());
        state.add_user_session("token", "marty.mcfly", "000");
        let user_session = state.get_user_session("token").unwrap();
        assert_eq!(user_session.username, "marty.mcfly");
        assert_eq!(user_session.user_id, "000");
    }

    #[test]
    fn test_get_user_session() {
        let mut state = State::new(AgentSettings::default());
        state.add_user_session("token", "marty.mcfly", "002");

        // 1. get a non existing user session
        assert!(state.get_user_session("non_existant_token").is_none());

        // 2. get an existing user session
        assert!(state.get_user_session("token").is_some());

        // 3. get an expired user session
        state.update_agent_settings(AgentSettings {
            token_expiration: 0,
            ..*state.get_agent_settings()
        });
        state.add_user_session("another_token", "doc", "002");
        assert!(state.get_user_session("another_token").is_none());
        assert!(state.get_user_session("token").is_some());
    }
}
