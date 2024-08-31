use crate::err_param;
use crate::models::auth::AuthenticationMethod;
use crate::utils::constants::WINDOWS_RESERVED_NAMES;
use anyhow::Result;
use axum::http::HeaderValue;
use lazy_static::lazy_static;
use regex::Regex;

pub type Username = Sanitized;

/// A name of a resource in the catalog.
///
/// This type is used to represent a name in the catalog and is guaranteed to be safe to use as a name for a directory
/// or a file (no path traversal vulnerabilities, etc.).
pub type CatalogName = Sanitized;

/// Sanitized string.
///
/// This type is used to represent a string that has been sanitized.
/// Functions that that take a Sanitized string as input are guaranteed that the value is safe to be used.
#[derive(Clone, PartialEq)]
pub struct Sanitized {
    value: String,
}

impl Sanitized {
    /// Create a new sanitized string.
    ///
    /// This function is private and should not be used directly, only the `sanitize_*` functions should be used.
    fn new(value: String) -> Self {
        Self { value }
    }

    pub fn as_str(&self) -> &str {
        self.value.as_str()
    }
}

impl AsRef<str> for Sanitized {
    fn as_ref(&self) -> &str {
        self.value.as_str()
    }
}

impl std::fmt::Display for Sanitized {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}", self.value)
    }
}

impl std::cmp::PartialEq<str> for Sanitized {
    fn eq(&self, other: &str) -> bool {
        self.value == *other
    }
}

/// From a static literal (used for testing only).
#[cfg(test)]
impl<'s> From<&'s str> for Sanitized {
    fn from(s: &'s str) -> Self {
        Sanitized::new(s.to_string())
    }
}

/// Sanitize a username.
///
/// The username must be at least 3 characters long and must only contain lowercase letters, numbers, dashes,
/// underscores and can only start with a letter or a number.
///
/// If the username is not valid, this function will return an error, otherwise it will return the sanitized username
/// (lower case and space trimmed).
pub fn sanitize_username(username: &str) -> Result<Username> {
    lazy_static! {
        // A regular expression used to check the validity of a username.

        // - The username must be at least 3 characters long.
        // - The username must only contain lowercase letters, numbers, dashes, underscores and dots.
        // - The username must start with a letter or a number.
        static ref RE_USERNAME: Regex = Regex::new(r"^[a-z0-9][a-z0-9\-_\.]{2,}$").unwrap();
    }

    let username = username.trim().to_lowercase();
    if !RE_USERNAME.is_match(&username) {
        return Err(err_param!("The username '{username}' is not valid."));
    }
    Ok(Username::new(username))
}

pub fn sanitize_catalog_name(value: &str) -> Result<CatalogName> {
    if !is_valid_catalog_name(value) {
        return Err(err_param!("Name '{}' is not allowed.", value));
    }
    Ok(Sanitized::new(value.to_string()))
}

/// Check if a path component is valid.
///
/// Empty component no allowed.
/// In many Linux file systems such as ext4, the maximum filename length is 255 bytes.
/// Check for path traversal vulnerabilities (e.g. `.` not allowed).
/// Check for control characters.
/// Check for reserved characters under Windows.
/// Check for reserved names under Windows.
fn is_valid_catalog_name(comp: &str) -> bool {
    !(comp.is_empty()
        || comp.len() > 255
        || WINDOWS_RESERVED_NAMES.contains(&comp.to_uppercase().as_str())
        || comp.chars().any(|c| {
            c.is_control()
                || c == '<'
                || c == '>'
                || c == ':'
                || c == '"'
                || c == '/'
                || c == '\\'
                || c == '?'
                || c == '*'
                || c == '.'
        }))
}

/// Parse the 'Authorization' header.
///
/// #Returns
/// Returns the token if the header is syntactically valid, otherwise returns an error.
pub fn parse_authorization_header(
    authentication_method: AuthenticationMethod,
    authorization_header: &HeaderValue,
) -> Result<String> {
    match authentication_method {
        AuthenticationMethod::UserPassword => {
            let parts: Vec<&str> = authorization_header.to_str()?.split(' ').collect();
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
        assert!(parse_authorization_header(AuthenticationMethod::UserPassword, &authorization_header).is_err());

        // 2) invalid authentication method
        let authorization_header = HeaderValue::from_static("Basic abcdef");
        assert!(parse_authorization_header(AuthenticationMethod::UserPassword, &authorization_header).is_err());

        // 3) valid syntax
        let authorization_header = HeaderValue::from_static("Bearer abcdef");
        assert_eq!(
            parse_authorization_header(AuthenticationMethod::UserPassword, &authorization_header).unwrap(),
            "abcdef"
        );
    }

    #[test]
    fn test_sanitize_username() {
        assert!(sanitize_username("").is_err());
        assert!(sanitize_username("a").is_err());
        assert!(sanitize_username("ab").is_err());
        assert!(sanitize_username(".abcd").is_err());
        assert!(sanitize_username("xyz/../abcd").is_err());
        assert!(sanitize_username("abc").is_ok());
        assert!(sanitize_username("abc123").is_ok());
        assert!(sanitize_username("abc-123").is_ok());
        assert!(sanitize_username("abc_123").is_ok());
        assert!(sanitize_username("abc.123").is_ok());
        assert_eq!(sanitize_username("   marty.McFly ").unwrap().as_str(), "marty.mcfly");
    }

    #[test]
    fn test_sanitize_catalog_name() {
        assert!(sanitize_catalog_name("").is_err());
        assert!(sanitize_catalog_name("/").is_err());
        assert!(sanitize_catalog_name("a").is_ok());
        assert!(sanitize_catalog_name("a/b").is_err());
        assert!(sanitize_catalog_name("c..d").is_err());
        assert!(sanitize_catalog_name("..").is_err());
        assert!(sanitize_catalog_name("\u{009C}").is_err());
        assert!(sanitize_catalog_name("いらっしゃいませ").is_ok());
        assert!(sanitize_catalog_name("AUX").is_err());
        assert!(sanitize_catalog_name("hello>world").is_err());
        assert!(sanitize_catalog_name(
            "non blandit massa enim nec dui nunc mattis enim ut tellus elementum sagittis vitae et leo duis ut \
                diam quam nulla porttitor massa id neque aliquam vestibulum morbi blandit cursus risus at ultrices \
                mi tempus imperdiet nulla malesuada pellentesque elit eget gravida cum sociis natoque penatibus"
        )
        .is_err());
    }
}
