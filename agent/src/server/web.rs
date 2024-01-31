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
use tokio::sync::mpsc;
use tokio::sync::mpsc::{ Sender, Receiver };

pub struct Server {
    stop_channel_sender: Option<Sender<()>>,
}

impl Default for Server {
    fn default() -> Self {
        Self {
            stop_channel_sender: None,
        }
    }
}

impl Server {
    pub async fn start() -> Result<()> {
        println!(
            "{} {} (pid={})",
            env!("CARGO_PKG_DESCRIPTION"),
            env!("CARGO_PKG_VERSION"),
            std::process::id()
        );

        // If the server is already running, return an error.
        Self::check_if_running().await?;

        // Server initialization
        let mut server = Server::default();
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

        // create a channel to stop the server (used for unit tests only)
        let (stop_channel_sender, stop_channel_receiver) = mpsc::channel::<()>(100);
        self.stop_channel_sender = Some(stop_channel_sender.clone());

        // start the server
        println!("listening on {}", listener.local_addr().unwrap().to_string());
        axum
            ::serve(listener, api)
            .with_graceful_shutdown(shutdown_signal(stop_channel_receiver)).await?;
        Ok(())
    }

    /// Stop the server.
    ///
    /// This method will send a message to the server to stop it or will return an error if the server is not running.
    #[cfg(test)]
    #[allow(dead_code)]
    pub async fn stop(&self) -> Result<()> {
        match self.stop_channel_sender.as_ref() {
            Some(stop_channel_sender) => {
                stop_channel_sender
                    .send(()).await
                    .with_context(|| "Unable to send the stop the server.")
            }
            None => { Err(anyhow::anyhow!("The server is not running.")) }
        }
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
async fn shutdown_signal(mut stop_receiver: Receiver<()>) {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to install Ctrl+C handler");
    };

    let stop_message = async {
        stop_receiver.recv().await.expect("failed to receive stop message handler");
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
        _ = stop_message => {},
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
        assert!(Server::default().bind().await.is_err());

        // 2. Valid listen address
        settings::set_listen_address("127.0.0.1".to_string());
        assert!(Server::default().bind().await.is_ok());
    }

    #[tokio::test]
    async fn test_start() {
        // 1. Cannot create the pid file
        settings::set_app_dir(tempdir().unwrap().path());
        assert!(Server::start().await.is_err());
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
