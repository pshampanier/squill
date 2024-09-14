use crate::api::error::Error;
use crate::api::error::ServerResult;
use crate::err_forbidden;
use crate::err_param;
use crate::models;
use crate::models::resources::ResourceRef;
use crate::models::users::User;
use crate::models::users::UserSettings;
use crate::models::ResourceType;
use crate::resources::catalog;
use crate::resources::users;
use crate::resources::Resource;
use crate::server::context::RequestContext;
use crate::server::state::ServerState;
use crate::utils::validators;
use crate::utils::validators::sanitize_catalog_name;
use crate::Result;
use anyhow::Context;
use axum::extract::Path;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::routing::post;
use axum::routing::put;
use axum::{routing::get, Json, Router};
use common::constants::X_RESOURCE_TYPE;
use serde_json::Value;
use squill_drivers::futures::Connection;
use uuid::Uuid;

/// GET /users/:username/user
///
/// Get the user data for the specified user, including:
async fn get_user(
    State(state): State<ServerState>,
    context: RequestContext,
    Path(username): Path<String>,
) -> ServerResult<Json<User>> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let user_session = context.get_user_session_with_username(&username)?;
    let conn = state.get_agentdb_connection().await?;

    // In case the user cannot be found, we do not return a 404 error, be instead we return a 500 error because it is
    // not expected that we pass the authentication middleware if the user does not exist.
    match users::get_by_user_id(&conn, user_session.get_user_id()).await {
        Ok(user) => Ok(Json(user)),
        Err(_) => Err(Error::InternalServerError),
    }
}

/// GET /users/:username/catalog/:catalog_id/list
///
/// List all catalog entries for the specified user and catalog_id.
/// This function is not recursive, it only lists the direct children of the specified path.
/// The user can only get its own data.
async fn read_user_catalog(
    State(state): State<ServerState>,
    context: RequestContext,
    Path((username, catalog_id)): Path<(String, Uuid)>,
) -> ServerResult<Json<Vec<ResourceRef>>> {
    // First we need to sanitize the username and path to make sure they will not pose security threats.
    let user_session = context.get_user_session_with_username(&username)?;
    let conn = state.get_agentdb_connection().await?;
    let catalog_resources = catalog::list(&conn, user_session.get_user_id(), catalog_id).await?;
    Ok(Json(catalog_resources))
}

async fn read_user_catalog_root(
    State(state): State<ServerState>,
    context: RequestContext,
    Path(username): Path<String>,
) -> ServerResult<Json<Vec<ResourceRef>>> {
    read_user_catalog(State(state), context, Path((username, Uuid::nil()))).await
}

#[derive(serde::Deserialize)]
struct RenameUserCatalogEntry {
    new_name: String,
}

/// POST /users/:username/catalog/:catalog_id/rename
/// { "new_name": "a new name" }
///
/// Rename a catalog entry for the specified user and path.
/// Because this method is not idempotent, we are using a POST instead of a PUT despite the fact that we are updating
/// an existing resource.
async fn rename_user_catalog_resource(
    State(state): State<ServerState>,
    context: RequestContext,
    Path((username, catalog_id)): Path<(String, Uuid)>,
    Json(args): Json<RenameUserCatalogEntry>,
) -> ServerResult<()> {
    // First we need to sanitize the username and path to make sure they will not pose security threats.
    let user_session = context.get_user_session_with_username(&username)?;
    let new_name = validators::sanitize_catalog_name(args.new_name.as_str())?;
    let conn = state.get_agentdb_connection().await?;
    catalog::rename(&conn, user_session.get_user_id(), catalog_id, &new_name).await.map_err(|e| e.into())
}

/// POST /users/:username/catalog
/// X-Resource-Type: "connection" | "environment" | "folder"
///
/// { "id": "xxx-xxxx...", "name": "a new name", "parent_id": "a parent id", ... }
///
/// Save a resource in the user's catalog.
async fn create_user_catalog_resource(
    State(state): State<ServerState>,
    context: RequestContext,
    headers: HeaderMap,
    Path(username): Path<String>,
    Json(request_body): Json<Value>,
) -> ServerResult<Json<ResourceRef>> {
    async fn inner_create_user_catalog_resource<T: Resource>(
        conn: &Connection,
        user_id: Uuid,
        resource: T,
    ) -> Result<ResourceRef> {
        // We need to check if the user has the right to create the resource.
        // - users are only allowed to create resources for themselves, not for other users.
        // - the parent resource must exist (cannot crate a resource at the root of the catalog).
        // - the resource name must be valid (no special characters, no directory traversal, etc).
        if user_id != resource.owner_user_id() || resource.parent_id().is_nil() {
            return Err(err_forbidden!("You are not allowed to create this resource."));
        }
        sanitize_catalog_name(resource.name())?;
        catalog::add(conn, &resource).await
    }
    let user_session = context.get_user_session_with_username(&username)?;
    let conn = state.get_agentdb_connection().await?;
    let resource_type = headers
        .get(X_RESOURCE_TYPE)
        .ok_or_else(|| Error::BadRequest("Missing 'X-Resource-Type' header".to_string()))
        .and_then(|header_value| {
            header_value.to_str().map_err(|_| Error::BadRequest("Invalid 'X-Resource-Type' header".to_string()))
        })?;

    let resource_ref = match ResourceType::from_str(resource_type) {
        Ok(ResourceType::Connection) => {
            inner_create_user_catalog_resource(
                &conn,
                user_session.get_user_id(),
                serde_json::from_value::<models::Connection>(request_body)?,
            )
            .await
        }
        Ok(ResourceType::Environment) => {
            inner_create_user_catalog_resource(
                &conn,
                user_session.get_user_id(),
                serde_json::from_value::<models::Environment>(request_body)?,
            )
            .await
        }
        Ok(ResourceType::Folder) => {
            inner_create_user_catalog_resource(
                &conn,
                user_session.get_user_id(),
                serde_json::from_value::<models::Folder>(request_body)?,
            )
            .await
        }
        Ok(_) => Err(err_param!("Unexpected '{X_RESOURCE_TYPE}' header value: '{resource_type}'")),
        Err(_) => Err(err_param!("Invalid '{X_RESOURCE_TYPE}' header")),
    }?;
    Ok(Json(resource_ref))
}

/// PUT /users/:username/settings
///
/// Save the user settings.
async fn save_user_settings(
    State(state): State<ServerState>,
    context: ServerResult<RequestContext>,
    Path(username): Path<String>,
    user_settings: Json<UserSettings>,
) -> ServerResult<Json<UserSettings>> {
    let username = validators::sanitize_username(username.as_str())?;

    // Make sure we are not trying to write settings for another user.
    if username.ne(context?.get_username()) {
        return Err(Error::Forbidden);
    }

    let conn = state.get_agentdb_connection().await?;

    users::save_settings(&conn, &username, &user_settings.0)
        .await
        .with_context(|| format!("Unable to save the settings for the user '{}'.", username))?;

    Ok(Json(user_settings.0))
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new()
        .route("/users/:username/catalog/:catalog_id/list", get(read_user_catalog))
        .route("/users/:username/catalog/list", get(read_user_catalog_root))
        .route("/users/:username/catalog/:catalog_id/rename", post(rename_user_catalog_resource))
        .route("/users/:username/catalog", post(create_user_catalog_resource))
        .route("/users/:username/settings", put(save_user_settings))
        .route("/users/:username/user", get(get_user))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent_db;
    use crate::resources::folders::METADATA_CONTENT_TYPE;
    use crate::resources::users;
    use crate::server::state::ServerState;
    use crate::utils::tests;
    use crate::utils::user_error::UserError;
    use crate::utils::validators::Username;
    use models::folders::ContentType;
    use tokio_test::assert_ok;

    #[tokio::test]
    async fn test_get_user() {
        let _base_dir = tests::setup().await;
        let conn = agent_db::get_connection().await.unwrap();
        let username: Username = "marty.mcfly".into();
        let marty_mcfly = users::create(&conn, &username).await.unwrap();
        let state = ServerState::new();
        let security_tokens = state.add_user_session(&username, marty_mcfly.user_id);

        // 1) valid user
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = get_user(State(state.clone()), context, Path(username.to_string())).await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().username.eq(username.as_str()));

        // 2) invalid user parameter (do no pass sanitization)
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = get_user(State(state.clone()), context, Path("../user1".to_string())).await;
        assert!(matches!(result, Err(Error::UserError(UserError::InvalidParameter(_)))));

        // 3) invalid username (different from the authenticated user)
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = get_user(State(state.clone()), context, Path("another_user".to_string())).await;
        assert!(matches!(result, Err(Error::Forbidden)));

        // 4) failed for some reasons (e.g. user file is corrupted)
        users::delete(&conn, &username).await.unwrap();
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = get_user(State(state.clone()), context, Path(username.to_string())).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_user_catalog_resource() {
        let _base_dir = tests::setup().await;
        let conn = agent_db::get_connection().await.unwrap();
        let username: Username = "marty.mcfly".into();
        let marty_mcfly = users::create(&conn, &username).await.unwrap();
        let state = ServerState::new();
        let security_tokens = state.add_user_session(&username, marty_mcfly.user_id);
        let root_folders = catalog::list(&conn, marty_mcfly.user_id, Uuid::nil()).await.unwrap();
        let environments_folder = root_folders
            .iter()
            .find(|f| f.get_metadata(METADATA_CONTENT_TYPE) == Some(ContentType::Environments.as_ref()))
            .unwrap();
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());

        // 1) valid connection
        let mut http_headers = HeaderMap::new();
        http_headers.insert(X_RESOURCE_TYPE, ResourceType::Connection.as_str().parse().unwrap());
        let _ = assert_ok!(
            create_user_catalog_resource(
                State(state.clone()),
                context.clone(),
                http_headers.clone(),
                Path(username.to_string()),
                Json(
                    serde_json::to_value(models::Connection {
                        driver: "mock".to_string(),
                        name: "New connection".to_string(),
                        owner_user_id: marty_mcfly.user_id,
                        parent_id: environments_folder.id,
                        ..Default::default()
                    })
                    .unwrap()
                ),
            )
            .await
        );

        // 2) valid folder
        let mut http_headers = HeaderMap::new();
        http_headers.insert(X_RESOURCE_TYPE, ResourceType::Folder.as_str().parse().unwrap());
        let _ = assert_ok!(
            create_user_catalog_resource(
                State(state.clone()),
                context.clone(),
                http_headers.clone(),
                Path(username.to_string()),
                Json(
                    serde_json::to_value(models::Folder {
                        folder_id: Uuid::new_v4(),
                        name: "New folder".to_string(),
                        owner_user_id: marty_mcfly.user_id,
                        parent_id: environments_folder.id,
                        content_type: ContentType::Favorites,
                    })
                    .unwrap()
                ),
            )
            .await
        );

        // 3) invalid name (do not pass sanitization)
        assert!(matches!(
            create_user_catalog_resource(
                State(state.clone()),
                context.clone(),
                http_headers.clone(),
                Path(username.to_string()),
                Json(
                    serde_json::to_value(models::Folder {
                        folder_id: Uuid::new_v4(),
                        name: "New / folder".to_string(),
                        owner_user_id: marty_mcfly.user_id,
                        parent_id: environments_folder.id,
                        content_type: ContentType::Favorites,
                    })
                    .unwrap()
                ),
            )
            .await,
            Err(Error::UserError(UserError::InvalidParameter(_)))
        ));

        // 3) cannot create root folder (parent_id is nil) via the REST API
        assert!(matches!(
            create_user_catalog_resource(
                State(state.clone()),
                context.clone(),
                http_headers.clone(),
                Path(username.to_string()),
                Json(
                    serde_json::to_value(models::Folder {
                        folder_id: Uuid::new_v4(),
                        name: "New folder (2)".to_string(),
                        owner_user_id: marty_mcfly.user_id,
                        parent_id: Uuid::nil(),
                        content_type: ContentType::Favorites,
                    })
                    .unwrap()
                ),
            )
            .await,
            Err(Error::UserError(UserError::Forbidden(_)))
        ));
    }

    /*
    #[tokio::test]
    async fn test_read_user_catalog() {
        // setup
        let _base_dir = tests::setup().await;
        let conn = agent_db::get_connection().await.unwrap();
        let username: Username = "marty.mcfly".into();
        let state = ServerState::new();
        let security_token = state.add_user_session(&username, "user_id");
        users::create(&conn, &username).await;

        // 1) valid user & path
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = read_user_catalog(
            State(state.clone()),
            ServerResult::Ok(context),
            Path(username.to_string()),
            Query(CatalogQueryParameters { path: CatalogSection::Workspaces.as_str().to_string() }),
        )
        .await;
        assert!(result.is_ok());
        assert!(result.as_ref().unwrap().len() == 1);
        assert!(result.as_ref().unwrap()[0].name.eq(DEFAULT_WORKSPACE_NAME));
        assert!(result.as_ref().unwrap()[0].item_type == CatalogEntryType::Workspace);

        // 2) invalid user parameter (do no pass sanitization)
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = read_user_catalog(
            State(state.clone()),
            ServerResult::Ok(context),
            Path("../user1".to_string()),
            Query(CatalogQueryParameters { path: CatalogSection::Workspaces.as_str().to_string() }),
        )
        .await;
        assert!(matches!(result, Err(Error::UserError(UserError::InvalidParameter(_)))));

        // 3) invalid path parameter (do no pass sanitization)
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = read_user_catalog(
            State(state.clone()),
            ServerResult::Ok(context),
            Path(username.to_string()),
            Query(CatalogQueryParameters { path: "../catalog/workspaces".to_string() }),
        )
        .await;
        assert!(matches!(result, Err(Error::InternalServerError)));

        // 4) invalid username (different from the authenticated user)
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = read_user_catalog(
            State(state.clone()),
            ServerResult::Ok(context),
            Path("another_user".to_string()),
            Query(CatalogQueryParameters { path: CatalogSection::Workspaces.as_str().to_string() }),
        )
        .await;
        assert!(matches!(result, Err(Error::Forbidden)));

        // 5) invalid path parameter (path does not exist)
        let mut context = RequestContext::new(Uuid::nil());
        context.add_user_session(state.get_user_session(&security_tokens.access_token).unwrap());
        let result = read_user_catalog(
            State(state.clone()),
            ServerResult::Ok(context),
            Path(username.to_string()),
            Query(CatalogQueryParameters {
                path: format!("{}/path_that_does_not_exist", CatalogSection::Workspaces.as_str()),
            }),
        )
        .await;
        assert!(matches!(result, Err(Error::UserError(UserError::NotFound(_)))));
    }
    */
}
