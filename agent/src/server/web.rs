use crate::models::auth::AuthenticationMethod;
use crate::utils::validators::parse_authorization_header;
use crate::{ settings, api };
use crate::api::error::{ Error, ServerResult };
use crate::server::state::ServerState;
use crate::server::context::RequestContext;
use crate::server::pid_file::{ save_pid_file, delete_pid_file, load_pid_file, PID_FILENAME };
use crate::utils::constants::{ X_API_KEY_HEADER, X_REQUEST_ID_HEADER };
use std::time::{ SystemTime, UNIX_EPOCH };
use axum::extract::State;
use axum::http::{ self, HeaderValue };
use axum::middleware::{ from_fn, from_fn_with_state, Next };
use axum::{ Router, extract::Request, response::Response };
use anyhow::{ Result, Context };
use rand::Rng;
use tokio::signal;
use tokio::net::TcpListener;
use sysinfo::{ Pid, System };

pub struct Server {}

impl Server {
    pub async fn start() -> Result<()> {
        println!(
            "{} {}.{} {} (pid={})",
            env!("CARGO_PKG_DESCRIPTION"),
            env!("CARGO_PKG_VERSION"),
            super::super::built_info::GIT_COMMIT_HASH_SHORT.unwrap_or("ci"),
            super::super::built_info::TARGET,
            std::process::id()
        );

        // If the server is already running, return an error.
        Self::check_if_running().await?;

        // Server initialization
        let mut server = Server {};
        let listener = server.bind().await?;

        // Save the file agent.pid
        let app_dir = settings::get_app_dir();
        save_pid_file(&app_dir, &listener.local_addr()?, &settings::get_api_key()).or(
            Err(anyhow::anyhow!("Unable to save the pid file: {:?}", app_dir.join(PID_FILENAME)))
        )?;

        // Run the server
        let result = server.run(listener).await;

        // delete the file agent.pid
        delete_pid_file(&app_dir).or(
            Err(anyhow::anyhow!("Unable to delete the pid file: {:?}", app_dir.join(PID_FILENAME)))
        )?;

        result
    }

    /// Bind the server to listen_address:port
    ///
    /// This function will return an error if the listen address is not valid or if the port is already in use.
    /// This function will not start the server, this is done later by calling start() on the returned TcpListener.
    async fn bind(&self) -> Result<TcpListener> {
        let listen_addr = format!("{}:{}", settings::get_listen_address(), settings::get_port());
        tokio::net::TcpListener
            ::bind(&listen_addr).await
            .with_context(|| {
                format!("Unable to bind to the listen address: {}", listen_addr.to_string())
            })
    }

    /// Create the API router.
    fn api(state: &ServerState) -> Router {
        // routes that don't required authentication
        let routes = Router::new()
            .merge(api::auth::routes(state.clone()))
            .merge(api::agent::routes(state.clone()))
            .layer(from_fn(check_api_key));
        // routes that require authentication
        let auth_routes = Router::new().merge(
            api::users
                ::authenticated_routes(state.clone())
                .merge(api::agent::authenticated_routes(state.clone()))
                .layer(from_fn_with_state(state.clone(), check_authentication))
                .layer(from_fn(check_api_key))
        );

        // all routes are nested under the /api/v1 path
        return Router::new().nest("/api/v1", routes.merge(auth_routes));
    }

    /// Run the server.
    ///
    /// This function will start the server and will not return until the server is stopped.
    async fn run(&mut self, listener: TcpListener) -> Result<()> {
        // create the server state
        let state = ServerState::new();

        // Get the router that will handle all the requests for the REST API.
        let api = Self::api(&state);

        // start the server
        println!("listening on {}", listener.local_addr().unwrap().to_string());
        axum::serve(listener, api).with_graceful_shutdown(shutdown_signal()).await?;
        Ok(())
    }

    /// Check if the server is already running.
    ///
    /// This function will return an error if the server is already running.
    /// In order to check if the server is running, this function will check if there is a pid file present on the file
    /// system and if so will use it to try to connect the exising runnning agent. If there is an agent running and
    /// responding to an API request, this function will return an error, otherwise it will return Ok(()).
    pub async fn check_if_running() -> Result<()> {
        // load the pid file (if any)
        let Some(pid_file) = load_pid_file(&settings::get_app_dir()) else {
            // No pid file, the server is not running
            return Ok(());
        };

        // Check an alternative that works on the Apple Store
        let running_proc = System::new_all();
        if running_proc.process(Pid::from_u32(pid_file.pid)).is_none() {
            // The process is no longer running
            return Ok(());
        }

        // TODO: Check of the server is responding to an API request
        todo!()
    }
}

/// Check the API key.
///
/// The API key is passed in the X-API-Key header and is required for all requests.
/// If the API key is not provided or invalid, the request will be rejected with a 403 Forbidden error.
async fn check_api_key(mut req: Request, next: Next) -> ServerResult<Response> {
    let api_key_header = req.headers().get(X_API_KEY_HEADER);
    if let Some(api_key) = api_key_header {
        let value = api_key.to_str();
        if value.is_ok() && value.unwrap() == settings::get_api_key() {
            // We've found the api key, before continuing to the next middleware, we need to add the context request
            // TODO: If there is already a request id in the request header, we should not generate a new one.
            let request_id = gen_request_id();
            let context = RequestContext::new(&request_id);
            req.extensions_mut().insert(Result::<RequestContext, Error>::Ok(context));
            let mut response = next.run(req).await;
            response.headers_mut().insert(X_REQUEST_ID_HEADER, HeaderValue::from_str(&request_id)?);
            return Ok(response);
        }
    }
    Err(Error::Forbidden)
}

/// Check the security token.
///
/// The security token is passed in the Authorization header and is required for most of the requests.
/// If the security token is not provided, the request will be rejected with a 403 Forbidden error.
/// If the security token is provided but is invalid, the request will be rejected with a 400 Bad Request error.
async fn check_authentication(
    State(state): State<ServerState>,
    context: ServerResult<RequestContext>,
    mut req: Request,
    next: Next
) -> ServerResult<Response> {
    let authorization_header = req.headers().get(http::header::AUTHORIZATION);
    let Some(authorization_header) = authorization_header else {
        // The Authorization header is missing.
        return Err(Error::Forbidden);
    };
    let Ok(security_token) = parse_authorization_header(
        AuthenticationMethod::UserPassword,
        authorization_header
    ) else {
        return Err(Error::BadRequest("(Invalid 'Authorization' header)".to_string()));
    };

    let Some(user_session) = state.get_user_session(&security_token) else {
        return Err(Error::Forbidden);
    };

    // Add the user_session information to the context of the request.
    let mut context = context?;
    context.add_user_session(user_session);
    req.extensions_mut().insert(Result::<RequestContext, Error>::Ok(context));

    return Ok(next.run(req).await);
}

/// Generate a request id.
///
/// The request id is used to track a request through the system. It is generated using a random number and the current
/// time. This method generates a request id that is random enough to prevent collision and that is sortable by time but
/// keeps the request id short enough to be used in the logs.
fn gen_request_id() -> String {
    let epoch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as u32;
    let suffix: [u8; 2] = rand::thread_rng().gen();
    format!("{}-{}", hex::encode(epoch.to_be_bytes()), hex::encode(suffix))
}

/// Configure the signal handlers.
///
/// This function will return when the user presses Ctrl+C or when the process receives a SIGTERM signal, allowing the
/// graceful shutdown of the server.
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix
            ::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv().await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => { println!("Received SIGTERM") },
    }
}

#[cfg(test)]
mod tests {
    use axum::{ body::Body, http::header::AUTHORIZATION };
    use tempfile::tempdir;
    use crate::{ resources::users::create_user, utils::tests::settings };
    use super::*;
    use tower::ServiceExt; // for `call`, `oneshot`, and `ready`

    #[tokio::test]
    async fn test_bind() {
        // 1. Invalid listen address
        settings::set_listen_address("invalid_address".to_string());
        assert!((Server {}).bind().await.is_err());

        // 2. Valid listen address
        settings::set_listen_address("127.0.0.1".to_string());
        assert!((Server {}).bind().await.is_ok());
    }

    #[tokio::test]
    async fn test_run() {
        // setup
        let tempdir = tempdir().unwrap();
        settings::set_app_dir(tempdir.path());
        let mut server = Server {};
        let listener = server.bind().await.unwrap();
        let host = listener.local_addr().unwrap().to_string();
        let http_client = reqwest::Client::new();

        // run the server in another thread
        let _ = tokio::spawn(async move { server.run(listener).await });

        // Send a request to the server
        let result = http_client
            .get(format!("http://{host}/api/v1/agent"))
            .header(X_API_KEY_HEADER, settings::get_api_key())
            .send().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_start() {
        // 1. Cannot create the pid file
        // settings::set_app_dir(tempdir().unwrap().path());
        // assert!(Server::start().await.is_err());

        // find a port available
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        settings::set_port(listener.local_addr().unwrap().port());
        std::mem::drop(listener);

        // 2. Successfull start
        let tempdir = tempdir().unwrap();
        settings::set_app_dir(&tempdir.path());

        // run the server in another thread
        let joint_handle = tokio::spawn(async move { Server::start().await });

        // Send a request to the server to check if it is running
        let http_client = reqwest::Client::new();
        let result = http_client
            .get(format!("http://localhost:{}/api/v1/agent", settings::get_port()))
            .header(X_API_KEY_HEADER, settings::get_api_key())
            .send().await;
        assert!(result.is_ok());
        assert!(load_pid_file(tempdir.path()).is_some());

        // On Unix we can initiate a gracefull shutdown by sending a SIGTERM signal, this is going to allow us to check
        // if the server is able to shutdown gracefully and delete the pid file.
        #[cfg(unix)]
        {
            nix::sys::signal
                ::kill(nix::unistd::Pid::this(), nix::sys::signal::Signal::SIGTERM)
                .unwrap();
            joint_handle.await.unwrap().unwrap();
            assert!(load_pid_file(tempdir.path()).is_none()); // pid file should be deleted
        }
    }

    #[tokio::test]
    async fn test_check_api_key() {
        let state = ServerState::new();

        // 1. Missing API key
        let response = super::Server
            ::api(&state)
            .oneshot(Request::builder().uri("/api/v1/agent").body(Body::empty()).unwrap()).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 2. Invalid API key
        let response = super::Server
            ::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/agent")
                    .header(X_API_KEY_HEADER, "invalid_api_key")
                    .body(Body::empty())
                    .unwrap()
            ).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 3. Valid API key
        let response = super::Server
            ::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/agent")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .body(Body::empty())
                    .unwrap()
            ).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::OK);
        assert!(response.headers().contains_key(X_REQUEST_ID_HEADER));
        assert!(response.headers().get(X_REQUEST_ID_HEADER).unwrap().to_str().unwrap().len() > 0);
    }

    #[tokio::test]
    async fn test_check_authentication() {
        // We are using GET /users/:username/user for this test since this endpoint requires authentication.
        let base_dir = tempdir().unwrap();
        let state = ServerState::new();
        let security_token = state.add_user_session("local", "user_id");
        settings::set_base_dir(base_dir.path().to_str().unwrap().to_string());
        let _ = create_user("local");

        // 1. Invalid security token
        let response = super::Server
            ::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/users/local/user")
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .header(AUTHORIZATION, format!("Bearer {}", "invalid_token"))
                    .body(Body::empty())
                    .unwrap()
            ).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 2. Missing Authorization header
        let response = super::Server
            ::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/users/local/user")
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .body(Body::empty())
                    .unwrap()
            ).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 3. Invalid Authorization header (not the expected format)
        let response = super::Server
            ::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/users/local/user")
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .header(AUTHORIZATION, "invalid_authorization_header")
                    .body(Body::empty())
                    .unwrap()
            ).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::BAD_REQUEST);

        // 4. Valid security token
        let response = super::Server
            ::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/users/local/user")
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .header(AUTHORIZATION, format!("Bearer {}", security_token.token.as_str()))
                    .body(Body::empty())
                    .unwrap()
            ).await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::OK);
    }
}
