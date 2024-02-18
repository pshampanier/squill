use crate::models::users::UserSettings;
use crate::resources::catalog;
use crate::resources::catalog::CatalogEntry;
use crate::resources::users;
use crate::utils::validators;
use crate::server::context::RequestContext;
use crate::api::error::ServerResult;
use crate::api::error::Error;
use crate::models::users::User;
use crate::server::state::ServerState;
use anyhow::Context;
use axum::routing::post;
use axum::routing::put;
use axum::{ Json, Router, routing::get };
use axum::extract::{ Path, Query };

/// GET /users/:username/user
///
/// Get the user data for the specified user, including:
/// - username & user_id
/// - settings
/// - all root directories and files
/// - all favorites
async fn get_user(context: ServerResult<RequestContext>, Path(username): Path<String>) -> ServerResult<Json<User>> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let username = crate::utils::validators::sanitize_username(username.as_str())?;

    // As for now, the user can only get its own data.
    if username.ne(context?.get_username()) {
        return Err(Error::Forbidden);
    }

    // In case the user cannot be found, we do not return a 404 error, be instead we return a 500 error because it is
    // not expected that we pass the authentication middleware if the user does not exist.
    match users::get_user(&username) {
        Ok(user) => Ok(Json(user)),
        Err(_) => Err(Error::InternalServerError),
    }
}

/// Query parameters for the `read_user_catalog` function.
#[derive(serde::Deserialize)]
struct ReadUserCatalogQuery {
    path: String,
}

/// GET /users/:username/catalog?path=...
///
/// List all catalog entries for the specified user and path.
/// The path is relative to the user's catalog directory and must stat with either `environments`, `workspaces` or
/// `favorites`.
///
/// ```text
/// └── users
///     └── :username
///         ├── user.json
///         └── catalog
///             ├── favorites
///             ├── workspaces
///             │   ...
///             └── environments
///                 ├── production.json
///                 └── stage-1.json
/// ```
///
/// The `path` must be a folder.
/// This function is not recursive, it only lists the direct children of the specified path.
/// The user can only get its own data.
async fn read_user_catalog(
    context: ServerResult<RequestContext>,
    Path(username): Path<String>,
    Query(params): Query<ReadUserCatalogQuery>
) -> ServerResult<Json<Vec<CatalogEntry>>> {
    // First we need to sanitize the username and path to make sure they will not pose security threats.
    let username = validators::sanitize_username(username.as_str())?;
    let catalog_path = validators::sanitize_catalog_path(params.path.as_str())?;

    // Make sure we are not trying to access a directory that we are not allowed to.
    if username.ne(context?.get_username()) {
        return Err(Error::Forbidden);
    }

    let entries = catalog
        ::read_dir(&username, &catalog_path)
        .with_context(|| {
            format!("Unable to read the catalog for the user '{}' and path '{}'.", username, catalog_path)
        })?;

    Ok(Json(entries))
}

#[derive(serde::Deserialize)]
struct RenameUserCatalogEntry {
    new_name: String,
}

/// POST /users/:username/catalog?path=...
/// { "name": "new_name" }
///
/// Rename a catalog entry for the specified user and path.
/// Because this method is not idempotent, we are using a POST instead of a PUT despite the fact that we are updating
/// an existing resource.
async fn rename_user_catalog_entry(
    context: ServerResult<RequestContext>,
    Path(username): Path<String>,
    Query(params): Query<ReadUserCatalogQuery>,
    Json(args): Json<RenameUserCatalogEntry>
) -> ServerResult<()> {
    // First we need to sanitize the username and path to make sure they will not pose security threats.
    let username = validators::sanitize_username(username.as_str())?;
    let catalog_path = validators::sanitize_catalog_path(params.path.as_str())?;
    let new_name = validators::sanitize_catalog_path_component(args.new_name.as_str())?;

    // Make sure we are not trying to access a directory that we are not allowed to.
    if username.ne(context?.get_username()) {
        return Err(Error::Forbidden);
    }

    catalog
        ::rename(&username, &catalog_path, &new_name)
        .with_context(|| {
            format!(
                "Unable to rename the catalog entry of path '{}' to '{}' for the user '{}'.",
                catalog_path,
                new_name,
                username
            )
        })?;

    Ok(())
}

/// PUT /users/:username/settings
///
/// Save the user settings.
async fn save_user_settings(
    context: ServerResult<RequestContext>,
    Path(username): Path<String>,
    user_settings: Json<UserSettings>
) -> ServerResult<Json<UserSettings>> {
    let username = validators::sanitize_username(username.as_str())?;

    // Make sure we are not trying to write settings for another user.
    if username.ne(context?.get_username()) {
        return Err(Error::Forbidden);
    }

    let user_settings = users
        ::save_user_settings(&username, user_settings.0)
        .with_context(|| { format!("Unable to save the settings for the user '{}'.", username) })?;

    Ok(Json(user_settings))
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new()
        .route("/users/:username/user", get(get_user))
        .route("/users/:username/catalog", get(read_user_catalog))
        .route("/users/:username/catalog/rename", post(rename_user_catalog_entry))
        .route("/users/:username/settings", put(save_user_settings))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use crate::api::users::tests::catalog::CatalogEntryType;
    use crate::resources::users::{ create_user, delete_user };
    use crate::server::state::ServerState;
    use crate::utils::constants::{ DEFAULT_WORKSPACE_NAME, USER_CATALOG_WORKSPACES_DIRNAME };
    use crate::utils::user_error::UserError;
    use crate::utils::validators::Username;
    use crate::utils::tests::settings;
    use super::*;

    #[tokio::test]
    async fn test_get_user() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        let state = ServerState::new();
        let security_token = state.add_user_session(&username, "user_id");
        create_user(&username).unwrap();

        // 1) valid user
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = get_user(ServerResult::Ok(context), Path(username.to_string())).await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().username.eq(username.as_str()));

        // 2) invalid user parameter (do no pass sanitization)
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = get_user(ServerResult::Ok(context), Path("../user1".to_string())).await;
        assert!(matches!(result, Err(Error::UserError(UserError::InvalidParameter(_)))));

        // 3) invalid username (different from the authenticated user)
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = get_user(ServerResult::Ok(context), Path("another_user".to_string())).await;
        assert!(matches!(result, Err(Error::Forbidden)));

        // 4) failed for some reasons (e.g. user file is corrupted)
        delete_user(&username).unwrap();
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = get_user(ServerResult::Ok(context), Path(username.to_string())).await;
        assert!(result.is_err());

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }

    #[tokio::test]
    async fn test_read_user_catalog() {
        // setup
        let temp_dir = tempfile::tempdir().unwrap();
        settings::set_base_dir(temp_dir.path().to_str().unwrap().to_string());
        let username: Username = "marty.mcfly".into();
        let state = ServerState::new();
        let security_token = state.add_user_session(&username, "user_id");
        create_user(&username).unwrap();

        // 1) valid user & path
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = read_user_catalog(
            ServerResult::Ok(context),
            Path(username.to_string()),
            Query(ReadUserCatalogQuery { path: USER_CATALOG_WORKSPACES_DIRNAME.to_string() })
        ).await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().len() == 1);
        assert!(result.as_ref().unwrap()[0].name.eq(DEFAULT_WORKSPACE_NAME));
        assert!(result.as_ref().unwrap()[0].item_type == CatalogEntryType::Workspace);

        // 2) invalid user parameter (do no pass sanitization)
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = read_user_catalog(
            ServerResult::Ok(context),
            Path("../user1".to_string()),
            Query(ReadUserCatalogQuery { path: USER_CATALOG_WORKSPACES_DIRNAME.to_string() })
        ).await;
        assert!(matches!(result, Err(Error::UserError(UserError::InvalidParameter(_)))));

        // 3) invalid path parameter (do no pass sanitization)
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = read_user_catalog(
            ServerResult::Ok(context),
            Path(username.to_string()),
            Query(ReadUserCatalogQuery { path: "../catalog/workspaces".to_string() })
        ).await;
        assert!(matches!(result, Err(Error::InternalServerError)));

        // 4) invalid username (different from the authenticated user)
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = read_user_catalog(
            ServerResult::Ok(context),
            Path("another_user".to_string()),
            Query(ReadUserCatalogQuery { path: USER_CATALOG_WORKSPACES_DIRNAME.to_string() })
        ).await;
        assert!(matches!(result, Err(Error::Forbidden)));

        // 5) invalid path parameter (path does not exist)
        let mut context = RequestContext::new("xxx");
        context.add_user_session(state.get_user_session(&security_token.token).unwrap());
        let result = read_user_catalog(
            ServerResult::Ok(context),
            Path(username.to_string()),
            Query(ReadUserCatalogQuery {
                path: format!("{}/path_that_does_not_exist", USER_CATALOG_WORKSPACES_DIRNAME),
            })
        ).await;
        assert!(matches!(result, Err(Error::UserError(UserError::NotFound(_)))));

        // cleanup
        std::fs::remove_dir_all(temp_dir.path()).unwrap();
    }
}
