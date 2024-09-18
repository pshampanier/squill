use crate::models::auth::SecurityTokens;
use crate::models::PushMessage;
use crate::server::notification_channels::NotificationChannel;
use crate::utils::validators::Username;
use std::sync::Arc;
use tracing::trace;
use uuid::Uuid;

/// A user session stored in the cache.
///
/// The user session is the server side of the security token. It contains a reference to the whole security token
/// information transmitted to the client, including the refresh token. The key in the cache is the security token value
/// itself.
///
/// It also contains the Notification Channel than can be used to send notifications to the user.
pub struct UserSession {
    pub username: Username,

    /// The latest security token associated to this session.
    pub security_tokens: Arc<SecurityTokens>,

    /// The expiration time of the security token.
    pub expires_at: u32,

    /// The notification channel associated to this session.
    pub notification_channel: Option<Arc<NotificationChannel>>,
}

impl UserSession {
    /// Get the username.
    pub fn get_username(&self) -> &str {
        self.username.as_str()
    }

    /// Get the user id.
    pub fn get_user_id(&self) -> Uuid {
        self.security_tokens.user_id
    }

    pub fn get_id(&self) -> Uuid {
        self.security_tokens.session_id
    }

    /// Push a notification to the client through the notification channel.
    ///
    /// If the notification channel is not attached or an error occurs, the notification will be ignored.
    /// Error are logged as trace messages but they can be ignored because notifications are not critical, they may
    /// leave the client in an inconsistent state but the client will recover when it reconnects.
    pub async fn push_notification<T: Into<PushMessage>>(&self, message: T) {
        if let Some(notification_channel) = &self.notification_channel {
            notification_channel.push(message).await;
        } else {
            trace!("Push Notification ignored (reason: notification channel not attached).");
        }
    }

    /// Clone the user session and assign the given notification channel.
    pub fn with_channel(&self, notification_channel: Option<Arc<NotificationChannel>>) -> Self {
        Self {
            username: self.username.clone(),
            security_tokens: self.security_tokens.clone(),
            expires_at: self.expires_at,
            notification_channel,
        }
    }
}
