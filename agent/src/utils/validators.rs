use crate::err_param;
use crate::models::auth::AuthenticationMethod;
use crate::resources::catalog::CatalogSection;
use crate::utils::constants::WINDOWS_RESERVED_NAMES;
use anyhow::{ anyhow, Result };
use axum::http::HeaderValue;
use lazy_static::lazy_static;
use regex::Regex;
use std::path::PathBuf;

pub type Username = Sanitized;

/// A path to a user's catalog entry.
///
/// This type is used to represent a path to a user's catalog entry and is guaranteed to be safe to use (no path
/// traversal vulnerabilities, etc.). It must always be relative to the root of the user's catalog directory and so it
/// always starts with either `environments` or `workspaces`.
pub type CatalogPath = Sanitized;

/// A component of a path to a user's catalog entry.
///
/// This type is used to represent a component of a path to a user's catalog entry and is guaranteed to be safe to use
/// as a name for a directory or a file (no path traversal vulnerabilities, etc.).
pub type CatalogPathComponent = Sanitized;

/// Sanitized string.
///
/// This type is used to represent a string that has been sanitized.
/// Functions that that take a Sanitized string as input are guaranteed that the value is safe to be used.
#[derive(Clone)]
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
impl From<&'static str> for Sanitized {
    fn from(s: &'static str) -> Self {
        Sanitized::new(s.to_string())
    }
}

#[cfg(test)]
impl From<&PathBuf> for Sanitized {
    fn from(s: &PathBuf) -> Self {
        Sanitized::new(s.as_path().to_str().unwrap().to_string())
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

/// Sanitize a catalog path.
///
/// - The path must be relative to one of the root of the catalog.
/// - Maximum length of a path is 260 characters (restriction from windows).
/// - Windows reserved names are not allowed (e.g. 'CON', 'PRN', 'AUX', 'NUL', 'COM0',...).
/// - The following characters are reserved characters under Windows and are not allowed in file names:
///
///   < (less than)
///   > (greater than)
///   : (colon)
///   " (double quote)
///   / (forward slash)
///   \ (backslash)
///   | (vertical bar or pipe)
///   ? (question mark)
///   * (asterisk)
///
/// - The path must not contain control characters.
/// - The path must not contain the characters `.` and `..` as they are used for path traversal.
///
///   Source: <https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file>
pub fn sanitize_catalog_path(value: &str) -> Result<CatalogPath> {
    let path = PathBuf::from(value);
    if path.components().count() == 0 {
        return Err(anyhow!("Empty path is not valid."));
    } else if
        !CatalogSection::variants()
            .into_iter()
            .map(|v| v.as_str())
            .collect::<Vec<&str>>()
            .contains(&path.components().next().unwrap().as_os_str().to_str().unwrap())
    {
        // The path must be relative to the root of the user's catalog directory and so must start by either
        // `environments` or `workspaces`.
        return Err(anyhow!("The path must be relative to the root of the user's catalog."));
    } else if path.as_os_str().len() > 260 {
        // Maximum length of a path under Windows is 260 characters.
        return Err(anyhow!("The path is too long."));
    } else if path.components().any(|comp| !is_valid_catalog_path_component(comp.as_os_str().to_str().unwrap())) {
        return Err(anyhow!("The path is not valid."));
    }

    Ok(CatalogPath::new(value.to_string()))
}

pub fn sanitize_catalog_path_component(value: &str) -> Result<CatalogPathComponent> {
    if !is_valid_catalog_path_component(value) {
        return Err(err_param!("'{}' is not allowed.", value));
    }
    Ok(Sanitized::new(value.to_string()))
}

pub fn join_catalog_path(parent: &CatalogPath, child: &CatalogPathComponent) -> CatalogPath {
    Sanitized::new(format!("{}/{}", parent.as_str(), child.as_str()))
}

/// Check if a path component is valid.
///
/// Empty component no allowed.
/// In many Linux file systems such as ext4, the maximum filename length is 255 bytes.
/// Check for path traversal vulnerabilities (e.g. `.` not allowed).
/// Check for control characters.
/// Check for reserved characters under Windows.
/// Check for reserved names under Windows.
fn is_valid_catalog_path_component(comp: &str) -> bool {
    !(
        comp.is_empty() ||
        comp.len() > 255 ||
        WINDOWS_RESERVED_NAMES.contains(&comp.to_uppercase().as_str()) ||
        comp
            .chars()
            .any(|c| {
                c.is_control() ||
                    c == '<' ||
                    c == '>' ||
                    c == ':' ||
                    c == '"' ||
                    c == '/' ||
                    c == '\\' ||
                    c == '?' ||
                    c == '*' ||
                    c == '.'
            })
    )
}

/// Parse the 'Authorization' header.
///
/// #Returns
/// Returns the token if the header is syntactically valid, otherwise returns an error.
pub fn parse_authorization_header(
    authentication_method: AuthenticationMethod,
    authorization_header: &HeaderValue
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
    fn test_sanitize_catalog_path() {
        assert!(sanitize_catalog_path("").is_err());
        assert!(sanitize_catalog_path("/").is_err());
        assert!(sanitize_catalog_path("/a").is_err());
        assert!(sanitize_catalog_path("environments/a").is_ok());
        assert!(sanitize_catalog_path("environments/a/b").is_ok());
        assert!(sanitize_catalog_path("environments/a/b/c..d").is_err());
        assert!(sanitize_catalog_path("environments/a/b/../../../../etc/passwd").is_err());
        assert!(sanitize_catalog_path("environments/a/\u{009C}").is_err());
        assert!(sanitize_catalog_path("environments/いらっしゃいませ").is_ok());
        assert!(sanitize_catalog_path("environments/AUX/tst").is_err());
        assert!(sanitize_catalog_path("environments/hello>world").is_err());
        assert!(sanitize_catalog_path("environments/hello:world").is_err());
        assert!(
            sanitize_catalog_path(
                "environments/non blandit massa enim nec dui nunc mattis enim ut tellus elementum sagittis vitae et leo duis ut \
                diam quam nulla porttitor massa id neque aliquam vestibulum morbi blandit cursus risus at ultrices \
                mi tempus imperdiet nulla malesuada pellentesque elit eget gravida cum sociis natoque penatibus"
            ).is_err()
        );
    }

    #[test]
    fn test_sanitize_catalog_path_component() {
        assert!(sanitize_catalog_path_component("").is_err());
        assert!(sanitize_catalog_path_component("/").is_err());
        assert!(sanitize_catalog_path_component("a").is_ok());
        assert!(sanitize_catalog_path_component("a/b").is_err());
        assert!(sanitize_catalog_path_component("c..d").is_err());
        assert!(sanitize_catalog_path_component("..").is_err());
        assert!(sanitize_catalog_path_component("\u{009C}").is_err());
        assert!(sanitize_catalog_path_component("いらっしゃいませ").is_ok());
        assert!(sanitize_catalog_path_component("AUX").is_err());
        assert!(sanitize_catalog_path_component("hello>world").is_err());
        assert!(
            sanitize_catalog_path_component(
                "non blandit massa enim nec dui nunc mattis enim ut tellus elementum sagittis vitae et leo duis ut \
                diam quam nulla porttitor massa id neque aliquam vestibulum morbi blandit cursus risus at ultrices \
                mi tempus imperdiet nulla malesuada pellentesque elit eget gravida cum sociis natoque penatibus"
            ).is_err()
        );
    }
}
