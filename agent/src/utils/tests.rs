///
/// Set a path to read-only and return its original permissions.
///
/// # Example
///
///    let restore_permissions = set_readonly(path);
///    // ...do something
///    std::fs::set_permissions(path, restore_permissions).unwrap();
///
/// # Arguments
/// path: &std::path::Path - A path to set read-only.
///
/// # Returns
/// std::fs::Permissions - Original permissions.
pub fn set_readonly(path: &std::path::Path) -> std::fs::Permissions {
    let permissions = std::fs::metadata(path).unwrap().permissions();
    let mut readonly = permissions.clone();
    readonly.set_readonly(true);
    std::fs::set_permissions(path, readonly).unwrap();
    permissions
}
