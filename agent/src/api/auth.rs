use axum::{ Router, routing::post };
use serde::{ Serialize, Deserialize };
use lazy_static::lazy_static;
use axum::extract::Json;
use rand::Rng;
use regex::Regex;
use hex;
use crate::{ api::error::ServerResult, settings };

use super::error::Error;

const USERNAME_LOCAL: &str = "local";

lazy_static! {
    // A regular expression used to check the validity of a username.

    // - The username must be at least 3 characters long.
    // - The username must only contain lowercase letters, numbers, dashes, underscores and dots.
    // - The username must start with a letter or a number.
    static ref RE_USERNAME: Regex = Regex::new(r"^[a-z0-9][a-z0-9\-_]{2,}$").unwrap();
}

#[derive(Deserialize, Debug)]
struct LogonBody {
    username: String,
    password: String,
}

#[derive(Serialize, Debug)]
struct LogonResult {
    token: String,
}

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let token: [u8; 32] = rng.gen();
    return hex::encode(token);
}

async fn logon(body: Json<LogonBody>) -> ServerResult<Json<LogonResult>> {
    // Usernames are case insensitive. We are using the lowercase version, especially whenever we need to access the
    // filesystem.
    let username = body.username.to_lowercase();

    // The username must be a valid username and the user must exists.
    if
        !RE_USERNAME.is_match(&username) ||
        !username.eq(USERNAME_LOCAL) ||
        !settings::get_user_dir(&username).join(".settings.json").exists()
    {
        return Err(Error::Forbidden);
    }

    if !body.password.is_empty() {
        // As of now, we only support the local user and the password must be empty.
        return Err(Error::BadRequest);
    }

    let response = LogonResult {
        token: generate_token(),
    };

    Ok(Json(response))
}

pub fn routes() -> Router {
    Router::new().route("/auth/logon", post(logon))
}

#[cfg(test)]
mod test {
    use crate::api::users::create_user;
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
            let body = Json(LogonBody {
                username: "local".to_string(),
                password: "".to_string(),
            });
            assert!(matches!(logon(body).await, Err(Error::Forbidden)));
        }

        // 2) valid user
        {
            create_user("local").unwrap();
            let body = Json(LogonBody {
                username: "local".to_string(),
                password: "".to_string(),
            });
            let result = logon(body).await;
            assert!(result.is_ok());
            let result = result.unwrap();
            assert_eq!(result.token.len(), 64);
        }

        // 3) unexpected username (not "local")
        {
            let body = Json(LogonBody {
                username: "marty_mcfly".to_string(),
                password: "".to_string(),
            });
            assert!(matches!(logon(body).await, Err(Error::Forbidden)));
        }

        // 4) unexpected password (expected empty string)
        {
            let body = Json(LogonBody {
                username: "local".to_string(),
                password: "*****".to_string(),
            });
            assert!(matches!(logon(body).await, Err(Error::BadRequest)));
        }

        // cleanup
        std::fs::remove_dir_all(temp_dir).unwrap();
    }
}
