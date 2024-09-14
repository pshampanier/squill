use crate::api::error::{Error, ServerResult};
use crate::models::auth::AuthenticationMethod;
use crate::server::context::RequestContext;
use crate::server::state::ServerState;
use crate::utils::validators::parse_authorization_header;
use crate::{agent_db, api, settings};
use anyhow::{Context, Result};
use axum::extract::State;
use axum::http::{self, HeaderValue, Method};
use axum::middleware::{from_fn, from_fn_with_state, Next};
use axum::{extract::Request, response::Response, Router};
use common::constants::{
    QUERY_PARAM_API_KEY, QUERY_PARAM_TOKEN, X_API_KEY_HEADER, X_REQUEST_ID_HEADER, X_RESOURCE_TYPE,
};
use common::pid_file::{delete_pid_file, get_agent_status, load_pid_file, save_pid_file, AgentStatus, PID_FILENAME};
use http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use rand::Rng;
use std::net::SocketAddr;
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::TcpListener;
use tokio::signal;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::{self, TraceLayer};
use tower_http::LatencyUnit;
use tracing::{debug, info, warn, Level};

pub struct Server {}

impl Server {
    pub async fn start() -> Result<()> {
        info!(
            "{} {}.{} {} ({}pid={})",
            env!("CARGO_PKG_DESCRIPTION"),
            env!("CARGO_PKG_VERSION"),
            super::super::built_info::GIT_COMMIT_HASH_SHORT.unwrap_or("ci"),
            super::super::built_info::TARGET,
            if super::super::built_info::PROFILE == "debug" { "debug, " } else { "" },
            std::process::id()
        );

        // If the server is already running, return an error.
        Self::check_if_running().await?;

        // Initialize the agent database
        agent_db::init().await?;

        // Server initialization
        let mut server = Server {};
        let listener = server.bind().await?;

        // Save the file agent.pid
        let app_dir = settings::get_app_dir();
        save_pid_file(&app_dir, &listener.local_addr()?, &settings::get_api_key())
            .or(Err(anyhow::anyhow!("Unable to save the pid file: {:?}", app_dir.join(PID_FILENAME))))?;

        // Run the server
        let result = server.run(listener).await;

        // delete the file agent.pid
        delete_pid_file(&app_dir)
            .or(Err(anyhow::anyhow!("Unable to delete the pid file: {:?}", app_dir.join(PID_FILENAME))))?;

        result
    }

    /// Bind the server to listen_address:port
    ///
    /// This function will return an error if the listen address is not valid or if the port is already in use.
    /// This function will not start the server, this is done later by calling start() on the returned TcpListener.
    async fn bind(&self) -> Result<TcpListener> {
        let listen_addr = format!("{}:{}", settings::get_listen_address(), settings::get_port());
        tokio::net::TcpListener::bind(&listen_addr)
            .await
            .with_context(|| format!("Unable to bind to the listen address: {}", listen_addr))
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
            api::users::authenticated_routes(state.clone())
                .merge(api::agent::authenticated_routes(state.clone()))
                .merge(api::connections::authenticated_routes(state.clone()))
                .layer(from_fn_with_state(state.clone(), check_authentication))
                .layer(from_fn(check_api_key)),
        );

        // all routes are nested under the /api/v1 path
        Router::new().nest("/api/v1", routes.merge(auth_routes))
    }

    /// Run the server.
    ///
    /// This function will start the server and will not return until the server is stopped.
    async fn run(&mut self, listener: TcpListener) -> Result<()> {
        // create the server state
        let state = ServerState::new();

        // Start the background tasks run by the state.
        state.start().await;

        // Get the router that will handle all the requests for the REST API.
        let api = Self::api(&state).layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().include_headers(false).level(Level::TRACE))
                .on_request(trace::DefaultOnRequest::new().level(Level::TRACE))
                .on_response(trace::DefaultOnResponse::new().level(Level::INFO).latency_unit(LatencyUnit::Micros)),
        );

        // Add the CORS middleware
        let layers = api
            .layer(get_cors_layer().context("Error while configuring CORS.")?)
            .into_make_service_with_connect_info::<SocketAddr>();

        // start the server
        info!("Listening on {}", listener.local_addr().unwrap().to_string());
        axum::serve(listener, layers).with_graceful_shutdown(shutdown_signal()).await?;
        Ok(())
    }

    /// Check if the server is already running.
    ///
    /// This function will return an error if the server is already running.
    /// In order to check if the server is running, this function will check if there is a pid file present on the file
    /// system and if so will use it to try to connect the exiting running agent. If there is an agent running and
    /// responding to an API request, this function will return an error, otherwise it will return Ok(()).
    pub async fn check_if_running() -> Result<()> {
        // load the pid file (if any)
        let Some(pid_file) = load_pid_file(&settings::get_app_dir()) else {
            // No pid file, the server is not running
            return Ok(());
        };

        warn!("The server may already be running (pid={})", pid_file.pid);
        match get_agent_status(&pid_file).await {
            AgentStatus::Running(pid) => {
                // The server is already running
                Err(anyhow::anyhow!("The agent is already running (agent pid={})", pid))
            }
            AgentStatus::NotRunning => {
                // The process is no longer running
                info!("No agent with pid={} found, continue...", pid_file.pid);
                Ok(())
            }
            AgentStatus::NotResponding(pid, reason) => {
                // The server is running but not responding to an API request
                warn!("{}", reason);
                info!("The agent is running but not responding to an API request, continue... (agent pid={})", pid);
                Ok(())
            }
        }
    }

    /// Get the status of the agent.
    pub async fn status() -> AgentStatus {
        let app_dir = settings::get_app_dir();
        if let Some(pid_file) = load_pid_file(&app_dir) {
            get_agent_status(&pid_file).await
        } else {
            AgentStatus::NotRunning
        }
    }
}

/// Create the layer for the CORS middleware.
fn get_cors_layer() -> Result<CorsLayer> {
    let mut cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([
            AUTHORIZATION,
            ACCEPT,
            CONTENT_TYPE,
            http::HeaderName::from_str(X_API_KEY_HEADER).unwrap(),
            http::HeaderName::from_str(X_REQUEST_ID_HEADER).unwrap(),
            http::HeaderName::from_str(X_RESOURCE_TYPE).unwrap(),
        ])
        .max_age(settings::get_cors_max_age())
        .expose_headers([http::HeaderName::from_str(X_REQUEST_ID_HEADER).unwrap()]);

    let cors_allowed_origins_setting = settings::get_cors_allowed_origins();
    if cors_allowed_origins_setting.contains(&"*".to_string()) {
        if cors_allowed_origins_setting.len() > 1 {
            return Err(anyhow::anyhow!(
                "Wildcard origin (`*`) cannot be used with other origins in the setting 'cors_allowed_origins={:?}'.",
                cors_allowed_origins_setting
            ));
        } else {
            cors = cors.allow_origin(Any);
        }
    } else {
        let mut allowed_origins: Vec<HeaderValue> = Vec::new();
        for origin in settings::get_cors_allowed_origins() {
            let allowed_origin = HeaderValue::from_str(origin.as_str())
                .with_context(|| format!("Invalid origin: '{}' from the setting 'cors_allowed_origins'.", origin))?;
            allowed_origins.push(allowed_origin);
        }
        cors = cors.allow_origin(allowed_origins);
    }

    Ok(cors)
}

fn get_query_parameter<'r>(req: &'r Request, key: &str) -> Option<&'r str> {
    req.uri().query().and_then(|query| {
        query
            .split('&')
            .find(|pair| {
                let mut iter = pair.split('=');
                iter.next().unwrap_or_default() == key
            })
            .map(|pair| {
                let mut iter = pair.split('=');
                iter.next().unwrap_or_default();
                iter.next().unwrap_or_default()
            })
    })
}

// "Authorization", "Content-Type", "X-Api-Key"

/// Check the API key.
///
/// The API key is passed in the X-API-Key header and is required for all requests.
/// If the API key is not provided or invalid, the request will be rejected with a 403 Forbidden error.
async fn check_api_key(mut req: Request, next: Next) -> ServerResult<Response> {
    let api_key = {
        if let Some(header) = req.headers().get(X_API_KEY_HEADER) {
            Some(header.to_str().unwrap_or_default())
        } else {
            get_query_parameter(&req, QUERY_PARAM_API_KEY)
        }
    };
    if api_key == Some(&settings::get_api_key()) {
        // We've found the api key, before continuing to the next middleware, we need to add the context request
        // TODO: If there is already a request id in the request header, we should not generate a new one.
        let request_id = gen_request_id();
        let context = RequestContext::new(&request_id);
        req.extensions_mut().insert(Result::<RequestContext, Error>::Ok(context));
        let mut response = next.run(req).await;
        response.headers_mut().insert(X_REQUEST_ID_HEADER, HeaderValue::from_str(&request_id)?);
        Ok(response)
    } else {
        warn!("Invalid or missing API key.");
        debug!("headers: {:?}", req.headers());
        Err(Error::Forbidden)
    }
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
    next: Next,
) -> ServerResult<Response> {
    let (authorization, from_header) = {
        if let Some(header) = req.headers().get(AUTHORIZATION) {
            (Some(header.to_str().unwrap_or_default()), true)
        } else {
            (get_query_parameter(&req, QUERY_PARAM_TOKEN), false)
        }
    };

    match authorization {
        Some(authorization) => {
            let security_token = match from_header {
                true => parse_authorization_header(AuthenticationMethod::UserPassword, authorization)
                    .map_err(|e| Error::BadRequest(e.to_string()))?,
                false => authorization.to_string(),
            };
            let user_session = state.get_user_session(&security_token).ok_or(Error::Forbidden)?;
            let mut context = context?;
            context.add_user_session(user_session);
            req.extensions_mut().insert(Result::<RequestContext, Error>::Ok(context));
            Ok(next.run(req).await)
        }
        None => {
            warn!("Authorization header is missing.");
            Err(Error::Forbidden)
        }
    }
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
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c =>  { info!("Received Ctrl+C, initiating graceful shutdown.") },
        _ = terminate => { info!("Received SIGTERM, initiating graceful shutdown.") },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{resources::users, utils::tests};
    use axum::{body::Body, http::header::AUTHORIZATION};
    use common::pid_file::PidFile;
    use std::io::Write;
    use tempfile::tempdir;
    use tokio::io::AsyncWriteExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_check_if_running() {
        // 1. No pid file
        let app_dir = tempdir().unwrap();
        tests::settings::set_app_dir(app_dir.path());
        assert!(Server::check_if_running().await.is_ok());

        // 2. The process is no longer running
        let mut pid_file =
            PidFile { pid: 0, port: 1234, address: "127.0.0.1".to_string(), api_key: "cf55f65...".to_string() };
        std::fs::File::create(app_dir.path().join(PID_FILENAME))
            .unwrap()
            .write_all(toml::to_string_pretty(&pid_file).unwrap().as_bytes())
            .unwrap();
        assert!(Server::check_if_running().await.is_ok());

        // 3. The server is running but not responding to an API request
        let listener = tokio::net::TcpListener::bind("localhost:0").await.unwrap();
        pid_file.pid = std::process::id();
        pid_file.port = listener.local_addr().unwrap().port();
        std::fs::File::create(app_dir.path().join(PID_FILENAME))
            .unwrap()
            .write_all(toml::to_string_pretty(&pid_file).unwrap().as_bytes())
            .unwrap();
        std::mem::drop(listener);
        assert!(Server::check_if_running().await.is_ok());

        // 4. The server is already running
        let listener = tokio::net::TcpListener::bind(format!("{}:{}", pid_file.address, pid_file.port)).await.unwrap();
        let handle = tokio::spawn(async move {
            let (mut tcp_stream, _) = listener.accept().await.unwrap();
            tcp_stream.write_all(b"HTTP/1.1 200 OK\r\n\r\n").await.unwrap();
            let (mut tcp_stream, _) = listener.accept().await.unwrap();
            tcp_stream.write_all(b"HTTP/1.1 500 Internal Server Error\r\n\r\n").await.unwrap();
        });
        assert!(Server::check_if_running().await.is_err()); // 200 OK -> the server is responding
        assert!(Server::check_if_running().await.is_ok()); // 500 Internal Server Error -> the server is running as expected
        std::mem::drop(handle)
    }

    #[tokio::test]
    async fn test_bind() {
        // 1. Invalid listen address
        tests::settings::set_listen_address("invalid_address".to_string());
        assert!((Server {}).bind().await.is_err());

        // 2. Valid listen address
        tests::settings::set_listen_address("127.0.0.1".to_string());
        assert!((Server {}).bind().await.is_ok());
    }

    #[tokio::test]
    async fn test_run() {
        // setup
        let tempdir = tempdir().unwrap();
        tests::settings::set_app_dir(tempdir.path());
        let mut server = Server {};
        let listener = server.bind().await.unwrap();
        let host = listener.local_addr().unwrap().to_string();
        let http_client = reqwest::Client::new();

        // run the server as a task
        let task_handle = tokio::spawn(async move { server.run(listener).await });

        // Send a request to the server
        let result = http_client
            .get(format!("http://{host}/api/v1/agent"))
            .header(X_API_KEY_HEADER, settings::get_api_key())
            .send()
            .await;
        assert!(result.is_ok());
        std::mem::drop(task_handle);
    }

    #[tokio::test]
    async fn test_start() {
        // 1. Cannot create the pid file
        // settings::set_app_dir(tempdir().unwrap().path());
        // assert!(Server::start().await.is_err());

        // find a port available
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        tests::settings::set_port(listener.local_addr().unwrap().port());
        std::mem::drop(listener);

        // 2. Successful start
        let tempdir = tempdir().unwrap();
        tests::settings::set_app_dir(tempdir.path());

        // run the server in another thread
        let joint_handle = tokio::spawn(async move { Server::start().await });

        // Send a request to the server to check if it is running
        // Because we cannot predict when the server is going to be ready, we are going to try to connect to the server
        // multiple times before giving up.
        let http_client = reqwest::Client::new();
        let mut remaining_attempts = 10;
        while remaining_attempts > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            let result = http_client
                .get(format!("http://localhost:{}/api/v1/agent", settings::get_port()))
                .header(X_API_KEY_HEADER, settings::get_api_key())
                .send()
                .await;
            if result.is_ok() {
                break;
            } else {
                remaining_attempts -= 1;
            }
        }
        assert!(remaining_attempts > 0);
        assert!(load_pid_file(tempdir.path()).is_some());

        // On Unix we can initiate a graceful shutdown by sending a SIGTERM signal, this is going to allow us to check
        // if the server is able to shutdown gracefully and delete the pid file.
        #[cfg(unix)]
        {
            nix::sys::signal::kill(nix::unistd::Pid::this(), nix::sys::signal::Signal::SIGTERM).unwrap();
            joint_handle.await.unwrap().unwrap();
            assert!(load_pid_file(tempdir.path()).is_none()); // pid file should be deleted
        }
    }

    #[tokio::test]
    async fn test_check_api_key() {
        let state = ServerState::new();

        // 1. Missing API key
        let response = super::Server::api(&state)
            .oneshot(Request::builder().uri("/api/v1/agent").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 2. Invalid API key
        let response = super::Server::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/agent")
                    .header(X_API_KEY_HEADER, "invalid_api_key")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 3. Valid API key
        let response = super::Server::api(&state)
            .oneshot(
                Request::builder()
                    .uri("/api/v1/agent")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::OK);
        assert!(response.headers().contains_key(X_REQUEST_ID_HEADER));
        assert!(!response.headers().get(X_REQUEST_ID_HEADER).unwrap().to_str().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_check_authentication() {
        // We are using GET /users/:username/user for this test since this endpoint requires authentication.
        let _base_dir = tests::setup().await;
        let local_username = users::local_username().as_str();
        let state = ServerState::new();
        let conn = state.get_agentdb_connection().await.unwrap();
        let user = users::get_by_username(&conn, users::local_username()).await.unwrap();
        let security_token = state.add_user_session(&local_username.into(), user.user_id);

        // 1. Invalid security token
        let response = super::Server::api(&state)
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/users/{local_username}/user"))
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .header(AUTHORIZATION, format!("Bearer {}", "invalid_token"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 2. Missing Authorization header
        let response = super::Server::api(&state)
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/users/{local_username}/user"))
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::FORBIDDEN);

        // 3. Invalid Authorization header (not the expected format)
        let response = super::Server::api(&state)
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/users/{local_username}/user"))
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .header(AUTHORIZATION, "invalid_authorization_header")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::BAD_REQUEST);

        // 4. Valid security token
        let response = super::Server::api(&state)
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/users/{local_username}/user"))
                    .method("GET")
                    .header(X_API_KEY_HEADER, settings::get_api_key())
                    .header(AUTHORIZATION, format!("Bearer {}", security_token.access_token.as_str()))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), http::StatusCode::OK);
    }
}
