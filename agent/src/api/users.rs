use crate::{ server::context::RequestContext, settings };
use crate::api::error::ServerResult;
use crate::api::error::Error;
use crate::models::users::User;
use crate::utils::constants::USER_FILENAME;
use crate::server::state::ServerState;
use anyhow::Context;
use axum::{ extract::Path, Json, Router, routing::{ get, put } };

/// GET /users/:username/user
///
/// Get the user data for the specified user, including:
/// - username & user_id
/// - settings
/// - all root directories and files
/// - all favorites
async fn get_user(
    context: ServerResult<RequestContext>,
    Path(username): Path<String>
) -> ServerResult<Json<User>> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let username = crate::utils::validators::sanitize_username(username.as_str())?;

    // As for now, the user can only get its own data.
    if username.ne(&context?.get_username()) {
        return Err(Error::Forbidden);
    }

    let user_dir = settings::get_user_dir(&username);
    let user_file = user_dir.join(USER_FILENAME);
    let user_file_content = std::fs
        ::read_to_string(user_file.as_path())
        .with_context(|| {
            format!("Unable to read the user file: {}", user_file.to_str().unwrap())
        })?;
    let user: User = serde_json
        ::from_str(&user_file_content)
        .with_context(|| {
            format!("Unable to parse the user file: {}", user_file.to_str().unwrap())
        })?;
    Ok(Json(user))
}

/// TODO: TO BE IMPLEMENTED
/// PUT /users/:username/rename
async fn rename_user(
    context: ServerResult<RequestContext>,
    Path(username): Path<String>
) -> ServerResult<Json<User>> {
    // First we need to sanitize the username to make sure it will not pose security threats sur as directory traversal.
    let username = crate::utils::validators::sanitize_username(username.as_str())?;
    // As for now, the user itself can change its name.
    if username.ne(&context?.get_username()) {
        return Err(Error::Forbidden);
    }
    let _user_dir = settings::get_user_dir(&username);
    todo!()
}

pub fn authenticated_routes(state: ServerState) -> Router {
    Router::new()
        .route("/users/:username/user", get(get_user))
        .route("/users/:username/rename", put(rename_user))
        .with_state(state)
}
