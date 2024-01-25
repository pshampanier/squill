use anyhow::{ anyhow, Result };
use lazy_static::lazy_static;
use regex::Regex;

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

#[cfg(test)]
mod tests {
    use super::*;

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
