use anyhow::{ anyhow, Result };
use axum::http::HeaderValue;
use lazy_static::lazy_static;
use regex::Regex;
use crate::models::auth::AuthenticationMethod;

/// Sanitize a username.
///
/// The username must be at least 3 characters long and must only contain lowercase letters, numbers, dashes,
/// underscores and can only start with a letter or a number.
///
/// If the username is not valid, this function will return an error, otherwise it will return the sanitized username
/// (lower case and space trimmed).
pub fn sanitize_username(username: &str) -> Result<String> {
    lazy_static! {
        // A regular expression used to check the validity of a username.

        // - The username must be at least 3 characters long.
        // - The username must only contain lowercase letters, numbers, dashes, underscores and dots.
        // - The username must start with a letter or a number.
        static ref RE_USERNAME: Regex = Regex::new(r"^[a-z0-9][a-z0-9\-_\.]{2,}$").unwrap();
    }

    let username = username.trim().to_lowercase();
    if !RE_USERNAME.is_match(&username) {
        return Err(anyhow!("The username is not valid."));
    }
    Ok(username)
}

/// Parse the 'Authorization' header.
///
/// #Returns
/// Returns the token if the header is syntaxically valid, otherwise returns an error.
pub fn parse_authorization_header(
    authentication_method: AuthenticationMethod,
    authorization_header: &HeaderValue
) -> Result<String> {
    match authentication_method {
        AuthenticationMethod::UserPassword => {
            let parts: Vec<&str> = authorization_header.to_str()?.split(" ").collect();
            if parts.len() != 2 || parts[0] != "Bearer" {
                return Err(anyhow::anyhow!("Invalid syntax, expecting 'Bearer <token>'"));
            }
            Ok(parts[1].to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_authorization_header() {
        // 1) invalid syntax
        let authorization_header = HeaderValue::from_static("Bearer");
        assert!(
            parse_authorization_header(
                AuthenticationMethod::UserPassword,
                &authorization_header
            ).is_err()
        );

        // 2) invalid authentication method
        let authorization_header = HeaderValue::from_static("Basic abcdef");
        assert!(
            parse_authorization_header(
                AuthenticationMethod::UserPassword,
                &authorization_header
            ).is_err()
        );

        // 3) valid syntax
        let authorization_header = HeaderValue::from_static("Bearer abcdef");
        assert_eq!(
            parse_authorization_header(
                AuthenticationMethod::UserPassword,
                &authorization_header
            ).unwrap(),
            "abcdef"
        );
    }

    #[test]
    fn test_sanitize_username() {
        assert!(sanitize_username("").is_err());
        assert!(sanitize_username("a").is_err());
        assert!(sanitize_username("ab").is_err());
        assert!(sanitize_username(".abcd").is_err());
        assert!(sanitize_username("abc").is_ok());
        assert!(sanitize_username("abc123").is_ok());
        assert!(sanitize_username("abc-123").is_ok());
        assert!(sanitize_username("abc_123").is_ok());
        assert!(sanitize_username("abc.123").is_ok());
        assert_eq!(sanitize_username("   marty.McFly ").unwrap(), "marty.mcfly");
    }
}
