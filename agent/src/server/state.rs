use crate::jinja::JinjaEnvironment;
use crate::models::auth::SecurityTokens;
use crate::models::PushMessage;
use crate::pool::{self, ConnectionGuard, ConnectionPool};
use crate::resources::catalog;
use crate::server::notification_channels::NotificationChannel;
use crate::server::user_sessions::UserSession;
use crate::settings;
use crate::tasks::{TaskFn, TasksQueue};
use crate::utils::constants::DRIVERS_DIRNAME;
use crate::utils::validators::Username;
use crate::UserError;
use anyhow::{Context, Result};
use core::panic;
use futures::future::BoxFuture;
use lru::LruCache;
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex};
use std::time::SystemTime;
use tracing::debug;
use tracing::trace;
use tracing::warn;
use uuid::Uuid;

use super::notification_channels::PushNotificationService;

pub struct SecurityCaches {
    /// The security token cache.
    ///
    /// - The key is a `token` from [SecurityToken].
    /// - The value is a `session_id` that can be used to retrieve the user session from the [UserSessionCache].
    security_tokens: LruCache<String, Uuid>,

    /// The refresh token cache.
    ///
    /// - The key is a `refresh_token` from [SecurityToken].
    /// - The value is a `session_id` that can be used to retrieve the user session from the [UserSessionCache].
    refresh_tokens: LruCache<String, Uuid>,

    /// The user session cache.
    ///
    /// - The key is a `session_id`.
    /// - The value is a user session.
    ///
    /// The user session is stored in an Arc to allow multiple threads to access it once they got it from the cache. There
    /// is not explicit eviction when the expiration time is reached, the cache will evict the entry when it needs to make
    /// room for a new entry. Nevertheless the user session will be considered as expired and will be rejected by the server.
    user_sessions: LruCache<Uuid, Arc<UserSession>>,
}

impl SecurityCaches {
    pub fn new() -> Self {
        Self {
            // We can safely unwrap here because the settings are validated at the start of the agent.
            security_tokens: LruCache::new(NonZeroUsize::new(settings::get_max_user_sessions()).unwrap()),
            refresh_tokens: LruCache::new(NonZeroUsize::new(settings::get_max_user_sessions()).unwrap()),
            user_sessions: LruCache::new(NonZeroUsize::new(settings::get_max_user_sessions()).unwrap()),
        }
    }
}

#[derive(Clone)]
pub struct ServerState {
    security_caches: Arc<Mutex<SecurityCaches>>,

    /// A queue of tasks to be executed by the agent.
    /// The tasks are executed in a FIFO order but can be executed concurrently.
    tasks_queue: Arc<TasksQueue>,

    /// The connection pool to the agent database.
    agent_db_conn_pool: Arc<ConnectionPool>,

    /// The connection pool to the user's databases.
    ///
    /// - the key is a `connection_id` from a [crate::models::Connection].
    /// - the value is a connection pool to the database.
    user_db_conn_pool: Arc<Mutex<LruCache<Uuid, Arc<ConnectionPool>>>>,
}

impl ServerState {
    /// Create a new state with the given agent settings.
    pub fn new(agent_db_conn_pool: Arc<ConnectionPool>) -> Self {
        Self {
            security_caches: Arc::new(Mutex::new(SecurityCaches::new())),
            tasks_queue: Arc::new(TasksQueue::new(
                settings::get_max_concurrent_tasks(),
                settings::get_max_task_queue_size(),
            )),
            agent_db_conn_pool,
            user_db_conn_pool: Arc::new(Mutex::new(LruCache::new(
                NonZeroUsize::new(settings::get_max_users_conn_pool_size()).unwrap(),
            ))),
        }
    }

    /// Start the background tasks run by the state.
    pub async fn start(&self) {
        self.tasks_queue.start().await
    }

    /// Get a connection to the agent database.
    ///
    /// The connection is taken from the connection pool and will return to the pool once dropped.
    pub async fn get_agentdb_connection(&self) -> Result<ConnectionGuard> {
        self.agent_db_conn_pool
            .get()
            .await
            .map_err(anyhow::Error::from)
            .context("Cannot get a connection to the agent database.")
    }

    /// Get a connection to a user's database.
    ///
    /// Here a user's database refers to a connection created by a user in the catalog.
    /// The connection is taken from the connection pool and will return to the pool once dropped.
    pub async fn get_user_db_connection(&self, connection_id: Uuid) -> Result<ConnectionGuard> {
        // Get the connection pool from the cache.
        // This code is intentionally not trying to get a connection from the pool as soon as we've got the pool,
        // instead we get the pool first and release the lock on the mutex before getting the connection. This is to
        // avoid holding the lock for too long while waiting for the connection to be available because getting the
        // connection from the pool can take some time if there is no connection available in the pool.
        let conn_pool_opt = match self.user_db_conn_pool.lock() {
            Ok(mut user_db_conn_pool) => user_db_conn_pool.get(&connection_id).cloned(),
            Err(_) => {
                panic!("Unable to recover from a poisoned user db connection mutex");
            }
        };

        // Using the connection pool if found in cache, otherwise crate it and add it to the cache.
        let conn_pool = match conn_pool_opt {
            Some(pool) => pool,
            None => {
                // connection pool not found in the cache.
                let mut agent_db_conn = self.get_agentdb_connection().await?;
                catalog::get::<crate::models::Connection>(&mut agent_db_conn, connection_id)
                    .await
                    .context("Cannot get the connection from the agent database.")
                    .and_then(|conn_model| {
                        let jinja_env = self.get_jinja_env(&conn_model.driver);
                        let uri = jinja_env.render_template("uri", &conn_model)?;
                        let conn_pool = Arc::new(pool::create(uri)?);
                        match self.user_db_conn_pool.lock() {
                            Ok(mut user_db_conn_pool) => {
                                user_db_conn_pool.put(connection_id, conn_pool.clone());
                                Ok(conn_pool)
                            }
                            Err(_) => {
                                panic!("Unable to recover from a poisoned user db connection mutex");
                            }
                        }
                    })?
            }
        };

        conn_pool.get().await.map_err(anyhow::Error::from).context("Cannot get a connection to the user database.")
    }

    /// Add a user session.
    ///
    /// A new security token is created and stored in the cache. The user session is stored in the cache with along with
    /// the security token and the refresh token.
    pub fn add_user_session(&self, username: &Username, user_id: Uuid) -> Arc<SecurityTokens> {
        // Create the security token.
        let security_tokens = Arc::new(SecurityTokens { user_id, session_id: Uuid::new_v4(), ..Default::default() });

        // Create the user session.
        let user_session = Arc::new(UserSession {
            username: username.clone(),
            security_tokens: security_tokens.clone(),
            expires_at: Self::get_expiration_time(security_tokens.expires_in),
            notification_channel: None,
        });

        // Add the user session and its tokens to the cache.
        match self.security_caches.lock() {
            Ok(mut security_caches) => {
                let session_id = security_tokens.session_id;
                security_caches.user_sessions.put(session_id, user_session);
                security_caches.security_tokens.put(security_tokens.access_token.clone(), session_id);
                security_caches.refresh_tokens.put(security_tokens.refresh_token.clone(), session_id);
                // TODO: add a metric about the number of user sessions in cache.
                security_tokens
            }
            Err(_) => {
                // TODO: Log the error.
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Get a user session from its id.
    ///
    /// This method will return None if the user session is not found in the cache.
    pub fn get_user_session(&self, session_id: Uuid) -> Option<Arc<UserSession>> {
        match self.security_caches.lock() {
            Ok(mut security_caches) => security_caches.user_sessions.get(&session_id).cloned(),
            Err(_) => {
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Get a user session from a security token.
    ///
    /// This method will return None if the security token is not found in the cache or if the security token is expired.
    pub fn get_user_session_from_token(&self, token: &str) -> Option<Arc<UserSession>> {
        match self.security_caches.lock() {
            Ok(mut security_caches) => {
                // First, check if the session_id exists
                if let Some(session_id) = security_caches.security_tokens.get(token).cloned() {
                    // Now, get the user session
                    if let Some(user_session) = security_caches.user_sessions.get(&session_id).cloned() {
                        // Check if the session has expired
                        if user_session.expires_at > Self::get_expiration_time(0) {
                            // TODO: Add a metric about the number of hits
                            return Some(user_session);
                        } else {
                            // Session is expired, remove it from the cache
                            // TODO: Add a metric about the number of hits on expired tokens
                            security_caches.security_tokens.pop(token);
                        }
                    }
                }
            }
            Err(_) => {
                // TODO: Log the error
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
        // TODO: Add a metric about the number of hits on expired tokens
        None
    }

    /// Replace a security token in the cache.
    ///
    /// This method will replace the previous tokens with the new ones. Neither the previous security token nor the
    /// previous refresh token will be usable.
    ///
    /// # Returns
    /// The new security token.
    pub fn refresh_security_tokens(&self, refresh_token: &str) -> Result<Arc<SecurityTokens>> {
        match self.security_caches.lock() {
            Ok(mut security_caches) => {
                match security_caches.refresh_tokens.get(refresh_token).cloned() {
                    Some(session_id) => {
                        match security_caches.user_sessions.get(&session_id).cloned() {
                            Some(user_session) => {
                                // Remove the previous tokens from the cache.
                                let token = user_session.security_tokens.access_token.clone();
                                let refresh_token = user_session.security_tokens.refresh_token.clone();
                                security_caches.security_tokens.pop(&token);
                                security_caches.refresh_tokens.pop(&refresh_token);

                                // Create the new security token (and refresh token inside it).
                                let new_security_tokens = Arc::new(SecurityTokens {
                                    session_id,
                                    user_id: user_session.security_tokens.user_id,
                                    client_id: user_session.security_tokens.client_id,
                                    ..Default::default()
                                });

                                // Update the user session
                                let new_user_session = Arc::new(UserSession {
                                    security_tokens: new_security_tokens.clone(),
                                    expires_at: Self::get_expiration_time(new_security_tokens.expires_in),
                                    username: user_session.username.clone(),
                                    notification_channel: user_session.notification_channel.clone(),
                                });

                                debug!("Security token refreshed for user `{}`", new_user_session.get_username());
                                security_caches.user_sessions.put(session_id, new_user_session);
                                security_caches
                                    .security_tokens
                                    .put(new_security_tokens.access_token.clone(), session_id);
                                security_caches
                                    .refresh_tokens
                                    .put(new_security_tokens.refresh_token.clone(), session_id);
                                Ok(new_security_tokens)
                            }
                            None => {
                                // The user session is not found in the cache.
                                Err(UserError::NotFound("User session not found".to_string()).into())
                            }
                        }
                    }
                    None => {
                        // The refresh token is not found in the cache.
                        Err(UserError::NotFound("Refresh token not found".to_string()).into())
                    }
                }
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned security caches mutex");
            }
        }
    }

    /// Revoke a session from a security token.
    ///
    /// The given security token will be removed from the cache. Neither the security token nor the refresh token will
    /// be usable anymore.
    pub fn revoke_session(&self, security_token: &str) {
        match self.security_caches.lock() {
            Ok(mut security_caches) => {
                if let Some(session_id) = security_caches.security_tokens.pop(security_token) {
                    if let Some(user_session) = security_caches.user_sessions.pop(&session_id) {
                        security_caches.refresh_tokens.pop(&user_session.security_tokens.refresh_token);
                    }
                } else {
                    warn!("Unable to revoke a Security Token, token not found in the cache.");
                }
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Attach a notification channel to a user session.
    pub fn attach_notification_channel(&self, user_session_id: Uuid, notification_channel: NotificationChannel) {
        match self.security_caches.lock() {
            Ok(mut security_caches) => {
                if let Some(user_session) = security_caches.user_sessions.get(&user_session_id) {
                    debug!("Notification channel attached to user `{}`", &user_session.username);
                    let new_user_session = user_session.with_channel(Some(Arc::new(notification_channel)));
                    security_caches.user_sessions.put(user_session_id, Arc::new(new_user_session));
                }
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Detach a notification channel from a user session.
    ///
    /// The notification channel will be removed from the user session and all future notifications will be ignored
    /// until a new notification channel is attached.
    pub fn detach_notification_channel(&self, user_session_id: Uuid) {
        match self.security_caches.lock() {
            Ok(mut security_caches) => {
                if let Some(user_session) = security_caches.user_sessions.get(&user_session_id) {
                    debug!("Notification channel detach to user `{}`", &user_session.username);
                    let new_user_session = user_session.with_channel(None);
                    security_caches.user_sessions.put(user_session_id, Arc::new(new_user_session));
                }
            }
            Err(_) => {
                panic!("Unable to recover from a poisoned user session mutex");
            }
        }
    }

    /// Push a task into the queue.
    ///
    /// The task will be executed by one of the worker threads.
    /// The returned result indicates whether the task was successfully pushed into the queue. It does not indicate
    /// whether the task was successfully executed.
    pub async fn push_task(&self, task: TaskFn) -> Result<()> {
        self.tasks_queue.push(task).await
    }

    /// Calculate the expiration time based on the current time and a duration in seconds.
    ///
    /// # Arguments
    /// duration - The duration from now in seconds.
    ///
    /// # Returns
    /// The expiration time in seconds since the UNIX epoch.
    fn get_expiration_time(duration: u32) -> u32 {
        (SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap().as_secs() as u32) + duration
    }

    /// Get a Jinja environment for a specific driver.
    pub fn get_jinja_env(&self, driver: &str) -> JinjaEnvironment<'_> {
        let mut jinja_env = JinjaEnvironment::new();
        jinja_env.set_template_directory(settings::get_assets_dir().join(DRIVERS_DIRNAME).join(driver));
        jinja_env
    }
}

impl PushNotificationService for ServerState {
    /// Push a notification to the client through the notification channel.
    ///
    /// If the notification channel is not attached or an error occurs, the notification will be ignored.
    /// Error are logged as trace messages but they can be ignored because notifications are not critical, they may
    /// leave the client in an inconsistent state but the client will recover when it reconnects.
    fn push_notification(&self, user_session_id: Uuid, message: impl Into<PushMessage>) -> BoxFuture<'_, ()> {
        let message = message.into();
        Box::pin(async move {
            let user_session = match self.security_caches.lock() {
                Ok(mut security_caches) => security_caches.user_sessions.get(&user_session_id).cloned(),
                Err(_) => {
                    panic!("Unable to recover from a poisoned user session mutex");
                }
            };
            match user_session {
                Some(user_session) => user_session.push_notification(message).await,
                None => {
                    trace!("Push Notification ignored (reason: user session not found in the cache).");
                }
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests;

    #[tokio::test]
    async fn test_add_user_session() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let state = ServerState::new(conn_pool);
        let session_tokens = state.add_user_session(&"username".into(), Uuid::new_v4());
        assert!(state.get_user_session_from_token(&session_tokens.access_token).is_some());
    }

    #[tokio::test]
    async fn test_get_user_session_from_token() {
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let state = ServerState::new(conn_pool);
        let security_tokens = state.add_user_session(&"username".into(), Uuid::new_v4());

        // 1. get a non existing user session
        assert!(state.get_user_session_from_token("non_existent_token").is_none());

        // 2. get an existing user session
        let user_session = state.get_user_session_from_token(&security_tokens.access_token).unwrap();
        assert_eq!(user_session.get_user_id(), security_tokens.user_id);

        // 3. get an expired user session
        tests::settings::set_token_expiration(std::time::Duration::from_secs(0));
        let security_tokens_expired = state.add_user_session(&"username_expired".into(), Uuid::new_v4());
        assert!(state.get_user_session_from_token(&security_tokens_expired.access_token).is_none());
    }

    #[tokio::test]
    async fn test_refresh_security_tokens() {
        // setup: create a security token
        let (_base_dir, conn_pool) = tests::setup().await.unwrap();
        let state = ServerState::new(conn_pool);
        let security_tokens = state.add_user_session(&"username".into(), Uuid::new_v4());

        // refresh the security token using the refresh token
        let new_security_tokens = state.refresh_security_tokens(&security_tokens.refresh_token);
        assert!(new_security_tokens.is_ok());

        // check that the old security token and refresh token are not valid anymore
        assert!(state.get_user_session_from_token(&security_tokens.access_token).is_none());
        assert!(state.refresh_security_tokens(&security_tokens.refresh_token).is_err());

        // check that the new security token is able to retrieve the user session
        let new_user_session = state.get_user_session_from_token(&new_security_tokens.unwrap().access_token);
        assert!(new_user_session.is_some());
        assert_eq!(new_user_session.unwrap().get_user_id(), security_tokens.user_id);
    }
}
