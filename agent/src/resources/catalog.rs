use crate::{
    err_not_found,
    err_param,
    models::collections::CollectionItem,
    settings,
    utils::{
        constants::{ CATALOG_ENTRY_FILE_EXTENSION, USER_CATALOG_DIRNAME },
        validators::{ sanitize_catalog_path, CatalogPath, CatalogPathComponent, Username },
    },
};
use anyhow::{ Context, Result };
use serde::{ Deserialize, Serialize };
use core::panic;
use std::path::{ Path, PathBuf };
use tracing::{ error, warn };

pub type CatalogEntry = CollectionItem<CatalogEntryType>;

/// Types of items that can be owned by a user.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(test, derive(PartialEq))]
pub enum CatalogEntryType {
    Connection,
    Environment,
    Favorite,
    Workspace,
    Folder,
    Unknown,
}

impl Default for CollectionItem<CatalogEntryType> {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            item_type: CatalogEntryType::Unknown,
        }
    }
}

/// A Section of the catalog.
///
/// The catalog is organized in different sections:
//
/// ```text
/// └── users
///     └── :username
///         ├── user.json
///         └── catalog                   <- The root of the catalog
///             ├── connections              |
///             ├── environments          <- | Sections of the catalog
///             ├── workspaces               |
///             └── favorites                |
/// ```
#[derive(PartialEq, Debug)]
pub enum CatalogSection {
    Connections,
    Environments,
    Favorites,
    Workspaces,
}

impl CatalogSection {
    pub fn as_str(&self) -> &'static str {
        match self {
            CatalogSection::Connections => "connections",
            CatalogSection::Workspaces => "workspaces",
            CatalogSection::Environments => "environments",
            CatalogSection::Favorites => "favorites",
        }
    }

    pub fn variants() -> Vec<&'static CatalogSection> {
        vec![
            &CatalogSection::Connections,
            &CatalogSection::Workspaces,
            &CatalogSection::Environments,
            &CatalogSection::Favorites
        ]
    }

    /// Get the section from a sanitized path.
    ///
    /// Because the path is sanitized, we can assume that the first component of the path is the section and this method
    /// should never fail.
    pub fn from_path(path: &CatalogPath) -> CatalogSection {
        match path.as_str().split('/').next() {
            Some("connections") => CatalogSection::Connections,
            Some("workspaces") => CatalogSection::Workspaces,
            Some("environments") => CatalogSection::Environments,
            Some("favorites") => CatalogSection::Favorites,
            _ => panic!("Invalid path: {}", path.as_str()),
        }
    }

    /// Get the section as a sanitized path.
    pub fn as_path(&self) -> CatalogPath {
        // It's safe to use unwrap below because the value given to sanitize_catalog_path_component is a well-known
        // constant that is guaranteed to be a valid path component.
        crate::utils::validators::sanitize_catalog_path_component(self.as_str()).unwrap()
    }
}

/// Create a file catalog entry to the filesystem.
///
/// The type of the entry is determined by the path.
pub fn create_file(username: &Username, path: &CatalogPath, id: &str) -> Result<CatalogEntry> {
    let section = CatalogSection::from_path(path);
    let item_type = match section {
        CatalogSection::Workspaces => CatalogEntryType::Workspace,
        CatalogSection::Environments => CatalogEntryType::Environment,
        CatalogSection::Connections => CatalogEntryType::Connection,
        CatalogSection::Favorites => panic!("Files cannot be created in section: {}", section.as_str()),
    };
    let fs_path = to_fs_path(username, path).with_extension(CATALOG_ENTRY_FILE_EXTENSION);
    if fs_path.exists() {
        return Err(err_param!("'{}' already exists.", path));
    }
    let entry = CatalogEntry {
        item_type,
        name: fs_path.file_stem().unwrap().to_str().unwrap().to_owned(),
        id: id.to_owned(),
    };
    write_fs_entry(&fs_path, &entry)?;
    Ok(entry)
}

pub fn create_dir(username: &Username, path: &CatalogPath) -> Result<()> {
    if exists(username, path) {
        return Err(err_param!("'{}' is already used.", path));
    }
    let fs_path = to_fs_path(username, path);
    std::fs
        ::create_dir(fs_path)
        .with_context(|| format!("Unable to create the directory '{}' in the user's catalog.", path))
}

/// Check if a path exists in the catalog.
///
/// # Arguments
///
/// * `username` - The username of the user.
/// * `path` - The path to the directory or file to check, it must be a path relative to the catalog
///    root directory.
///
/// # Returns
/// `true` if the path is already used by a folder or a file in the catalog, `false` otherwise.
pub fn exists(username: &Username, path: &CatalogPath) -> bool {
    let fs_path = to_fs_path(username, path);
    fs_path.exists() || fs_path.with_extension(CATALOG_ENTRY_FILE_EXTENSION).exists()
}

pub fn delete(username: &Username, path: &CatalogPath) -> Result<()> {
    if !exists(username, path) {
        return Err(err_param!("'{}' does not exist.", path));
    }
    let fs_path = to_fs_path(username, path);
    if fs_path.exists() {
        // this is a directory
        std::fs
            ::remove_dir_all(fs_path)
            .with_context(|| format!("Unable to delete the directory '{}' in the user's catalog.", path))?;
    } else {
        // this is a file
        std::fs
            ::remove_file(fs_path.with_extension(CATALOG_ENTRY_FILE_EXTENSION))
            .with_context(|| format!("Unable to delete the catalog entry for '{}'.", path))?;
    }
    Ok(())
}

/// Rename a directory or a file in the catalog.
///
/// The path must be a valid path to a directory or a file in the catalog.
pub fn rename(username: &Username, path: &CatalogPath, new_name: &CatalogPathComponent) -> Result<()> {
    if !exists(username, path) {
        // The path to be renamed does not exist.
        return Err(err_not_found!("'{}' does not exist.", path));
    } else {
        // The new path must not exist.
        let new_path = sanitize_catalog_path(
            PathBuf::from(path.as_str()).parent().unwrap().join(new_name.as_str()).as_os_str().to_str().unwrap()
        )?;
        if exists(username, &new_path) {
            return Err(err_param!("'{}' already exists.", new_path));
        }
    }
    let fs_path = to_fs_path(username, path);
    if fs_path.exists() {
        // This is a directory, we only need to rename the directory.
        let fs_new_path = fs_path.with_file_name(new_name.as_str());
        std::fs
            ::rename(fs_path, fs_new_path)
            .with_context(|| format!("Unable to rename the directory '{}' in the user's catalog.", path))?;
    } else {
        // This is a file
        // - read the content of the file
        // - change the name stored in the content
        // - write the content to the new file
        // - delete the old file
        let fs_new_path = fs_path.with_file_name(new_name.as_str()).with_extension(CATALOG_ENTRY_FILE_EXTENSION);
        let mut entry = read_fs_entry(&fs_path.with_extension(CATALOG_ENTRY_FILE_EXTENSION))?;
        entry.name = new_name.as_str().to_owned();
        write_fs_entry(&fs_new_path, &entry)?;
        match std::fs::remove_file(fs_path.with_extension(CATALOG_ENTRY_FILE_EXTENSION)) {
            Ok(_) => (),
            Err(e) => {
                // we can't delete the old file, we need to rollback the changes
                let _ = std::fs::remove_file(fs_new_path);
                error!("Unable to delete the old catalog entry for '{}': {}", path, e);
            }
        }
    }
    Ok(())
}

/// Read the content of a directory and return a list of catalog entries.
pub fn read_dir(username: &Username, path: &CatalogPath) -> Result<Vec<CatalogEntry>> {
    let fs_path = to_fs_path(username, path);
    if !fs_path.exists() {
        return Err(err_not_found!("'{}' does not exist.", path));
    }
    if !fs_path.is_dir() {
        return Err(err_param!("'{}' is not a directory.", path));
    }
    let fs_entries = std::fs
        ::read_dir(fs_path)
        .with_context(|| { format!("Unable to read the content of the directory '{}'.", path) })?;

    let mut entries = Vec::new();
    for fs_entry in fs_entries {
        match fs_entry {
            Ok(fs_entry) => {
                match inner_read(&fs_entry.path()) {
                    Ok(entry) => entries.push(entry),
                    Err(e) => {
                        // We don't want to stop the whole process if one entry is invalid, instead we are returning
                        // an unknown item with the name of the file.
                        warn!("Invalid catalog entry '{}': {}", fs_entry.path().display(), e);
                        entries.push(CatalogEntry {
                            name: fs_entry.path().file_name().unwrap().to_str().unwrap().to_owned(),
                            ..CatalogEntry::default()
                        });
                    }
                }
            }
            Err(e) => {
                error!("Skipping entry: {}", e);
            }
        }
    }

    return Ok(entries);

    // Read a CatalogEntry from the catalog.
    fn inner_read(fs_path: &Path) -> Result<CatalogEntry> {
        if fs_path.is_dir() {
            return Ok(CatalogEntry {
                name: fs_path.file_name().unwrap().to_str().unwrap().to_owned(),
                item_type: CatalogEntryType::Folder,
                ..CatalogEntry::default()
            });
        } else if
            fs_path.is_file() &&
            fs_path.extension().is_some() &&
            fs_path.extension().unwrap().eq(CATALOG_ENTRY_FILE_EXTENSION)
        {
            return read_fs_entry(fs_path);
        } else {
            Err(anyhow::anyhow!("Invalid catalog entry: {}", fs_path.display()))
        }
    }
}

/// Read a catalog entry from the filesystem.
fn read_fs_entry(fs_path: &Path) -> Result<CatalogEntry> {
    let file_content = std::fs
        ::read_to_string(fs_path)
        .with_context(|| format!("Unable to read catalog file: {}", fs_path.display()))?;
    let entry: CatalogEntry = serde_json
        ::from_str(&file_content)
        .with_context(|| format!("Unable to parse catalog file: {}", fs_path.display()))?;
    Ok(entry)
}

/// Write a catalog entry to the filesystem.
fn write_fs_entry(fs_path: &Path, entry: &CatalogEntry) -> Result<()> {
    std::fs
        ::write(fs_path, serde_json::to_string_pretty(entry)?)
        .with_context(|| format!("Unable to write catalog file: {}", fs_path.display()))
}

/// The absolute path to a catalog entry on the filesystem.
fn to_fs_path(username: &Username, path: &CatalogPath) -> PathBuf {
    settings::get_user_dir(username.as_str()).join(USER_CATALOG_DIRNAME).join(path.as_str())
}

pub fn get_workspace_catalog_path(path: &str) -> Result<CatalogPath> {
    sanitize_catalog_path(format!("{}/{}", CatalogSection::Workspaces.as_str(), path).as_str())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        resources::{ catalog, users::create_user },
        utils::{ constants::DEFAULT_WORKSPACE_NAME, tests::settings, validators::Username },
    };

    #[test]
    fn test_catalog_section_as_str() {
        assert_eq!(CatalogSection::Connections.as_str(), "connections");
        assert_eq!(CatalogSection::Workspaces.as_str(), "workspaces");
        assert_eq!(CatalogSection::Environments.as_str(), "environments");
        assert_eq!(CatalogSection::Favorites.as_str(), "favorites");
    }

    #[test]
    fn test_catalog_section_variants() {
        assert_eq!(CatalogSection::variants().len(), 4);
    }

    #[test]
    fn test_catalog_section_from_path() {
        assert_eq!(CatalogSection::from_path(&CatalogPath::from("connections")), CatalogSection::Connections);
        assert_eq!(CatalogSection::from_path(&CatalogPath::from("connections/My Conn")), CatalogSection::Connections);
        assert_eq!(CatalogSection::from_path(&CatalogPath::from("workspaces/A/B")), CatalogSection::Workspaces);
        assert_eq!(CatalogSection::from_path(&CatalogPath::from("environments")), CatalogSection::Environments);
        assert_eq!(CatalogSection::from_path(&CatalogPath::from("favorites")), CatalogSection::Favorites);
        assert!(std::panic::catch_unwind(|| CatalogSection::from_path(&CatalogPath::from("invalid/path"))).is_err());
    }

    #[test]
    fn test_rename() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        create_user(&username).unwrap();

        // 1) Rename a directory
        let path = CatalogPath::from("workspaces/folder_to_rename");
        catalog::create_dir(&username, &path).unwrap();
        let new_name = CatalogPathComponent::from("new_folder_name");
        assert!(catalog::rename(&username, &path, &new_name).is_ok());
        assert!(!settings::get_user_dir(username.as_str()).join(USER_CATALOG_DIRNAME).join(path.as_str()).exists());
        assert!(
            settings
                ::get_user_dir(username.as_str())
                .join(USER_CATALOG_DIRNAME)
                .join("workspaces")
                .join(new_name.as_str())
                .exists()
        );

        // 2) Rename a file
        let path = CatalogPath::from("workspaces/file_to_rename");
        catalog::create_file(&username, &path, "id").unwrap();
        let new_name = CatalogPathComponent::from("new_file_name");
        assert!(catalog::rename(&username, &path, &new_name).is_ok());
        assert!(
            !settings
                ::get_user_dir(username.as_str())
                .join(USER_CATALOG_DIRNAME)
                .join(path.as_str())
                .with_extension(CATALOG_ENTRY_FILE_EXTENSION)
                .exists()
        );
        assert!(
            settings
                ::get_user_dir(username.as_str())
                .join(USER_CATALOG_DIRNAME)
                .join(path.as_str())
                .with_file_name(new_name.as_str())
                .with_extension(CATALOG_ENTRY_FILE_EXTENSION)
                .exists()
        );

        // 3) Rename a entry that does not exist
        let path = CatalogPath::from("workspaces/invalid/path");
        let new_name = CatalogPathComponent::from("new_file_name");
        assert!(catalog::rename(&username, &path, &new_name).is_err());

        // 4) Rename a entry to a name that already exists
        let path = CatalogPath::from("workspaces/folder_to_rename");
        let new_name = CatalogPathComponent::from("another_folder_name");
        catalog::create_dir(&username, &path).unwrap();
        catalog::create_dir(&username, &CatalogPath::from("workspaces/another_folder_name")).unwrap();
        assert!(catalog::rename(&username, &path, &new_name).is_err());

        // 5) Rename directory that failed to delete the previous directory
        let path = CatalogPath::from("workspaces/read_only_folder");
        let new_name = CatalogPathComponent::from("new_readonly_folder");
        catalog::create_dir(&username, &path).unwrap();
        let restore_permissions = crate::utils::tests::set_readonly(to_fs_path(&username, &path).parent().unwrap());
        assert!(catalog::rename(&username, &path, &new_name).is_err());
        assert!(to_fs_path(&username, &path).exists());
        std::fs::set_permissions(to_fs_path(&username, &path).parent().unwrap(), restore_permissions).unwrap();

        // 6) Rename file that failed to create the new file
        let path = CatalogPath::from("workspaces/read_only_workspace");
        let new_name = CatalogPathComponent::from("new_readonly_workspace");
        catalog::create_file(&username, &path, "id").unwrap();
        let restore_permissions = crate::utils::tests::set_readonly(to_fs_path(&username, &path).parent().unwrap());
        assert!(catalog::rename(&username, &path, &new_name).is_err());
        assert!(to_fs_path(&username, &path).with_extension(CATALOG_ENTRY_FILE_EXTENSION).exists());
        std::fs::set_permissions(to_fs_path(&username, &path).parent().unwrap(), restore_permissions).unwrap();

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }

    #[test]
    fn test_create_file() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        create_user(&username).unwrap();

        // 1) Create a file
        let path = CatalogPath::from("workspaces/new");
        assert!(catalog::create_file(&username, &path, "id").is_ok());
        assert!(
            settings
                ::get_user_dir(username.as_str())
                .join(USER_CATALOG_DIRNAME)
                .join(path.as_str())
                .with_extension(CATALOG_ENTRY_FILE_EXTENSION)
                .exists()
        );

        // 2) Create a file that already exists
        assert!(catalog::create_file(&username, &path, "id").is_err());

        // 3) Create a file in the favorites section (expect to panic)
        assert!(
            std::panic
                ::catch_unwind(|| { catalog::create_file(&username, &CatalogPath::from("favorites/new"), "id") })
                .is_err()
        );

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }

    #[test]
    fn test_create_dir() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        create_user(&username).unwrap();

        // 1) Create a directory
        let path = CatalogPath::from("workspaces/new");
        assert!(catalog::create_dir(&username, &path).is_ok());
        assert!(settings::get_user_dir(username.as_str()).join(USER_CATALOG_DIRNAME).join(path.as_str()).exists());

        // 2) Create a directory that already exists
        assert!(catalog::create_dir(&username, &path).is_err());

        // 3) Create a directory that conflicts with a file
        let path = CatalogPath::from("workspaces/new_file");
        catalog::create_file(&username, &path, "id").unwrap();
        assert!(catalog::create_dir(&username, &path).is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }

    #[test]
    fn test_exists() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        create_user(&username).unwrap();

        // 1) Check if a directory exists
        let path = CatalogPath::from("workspaces/new_folder");
        assert!(!catalog::exists(&username, &path));
        catalog::create_dir(&username, &path).unwrap();
        assert!(catalog::exists(&username, &path));

        // 2) Check if a file exists
        let path = CatalogPath::from("workspaces/new_file");
        assert!(!catalog::exists(&username, &path));
        catalog::create_file(&username, &path, "id").unwrap();
        assert!(catalog::exists(&username, &path));

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }

    #[test]
    fn test_delete() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        create_user(&username).unwrap();

        // 1) Delete a directory
        let path = CatalogPath::from("workspaces/folder_to_delete");
        catalog::create_dir(&username, &path).unwrap();
        assert!(catalog::delete(&username, &path).is_ok());
        assert!(!settings::get_user_dir(username.as_str()).join(USER_CATALOG_DIRNAME).join(path.as_str()).exists());

        // 2) Delete a file
        let path = CatalogPath::from("workspaces/file_to_delete");
        catalog::create_file(&username, &path, "id").unwrap();
        assert!(catalog::delete(&username, &path).is_ok());
        assert!(!settings::get_user_dir(username.as_str()).join(USER_CATALOG_DIRNAME).join(path.as_str()).exists());

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }

    #[test]
    fn test_read_dir() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        create_user(&username).unwrap();

        // 1. Read a valid path
        let result = catalog::read_dir(&username, &CatalogPath::from(CatalogSection::Workspaces.as_str()));
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().len() == 1);
        assert!(result.as_ref().unwrap()[0].item_type.eq(&CatalogEntryType::Workspace));
        assert!(result.as_ref().unwrap()[0].name.eq(DEFAULT_WORKSPACE_NAME));

        // 2. Read an invalid path
        assert!(catalog::read_dir(&username, &CatalogPath::from("workspaces/invalid/path")).is_err());

        // 3. Read a file (expect to fail)
        let default_workflow_path = PathBuf::from(CatalogSection::Workspaces.as_str())
            .join(DEFAULT_WORKSPACE_NAME)
            .with_extension(CATALOG_ENTRY_FILE_EXTENSION);
        assert!(read_dir(&username, &CatalogPath::from(&default_workflow_path)).is_err());
    }
}
