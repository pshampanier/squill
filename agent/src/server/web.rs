use crate::{ settings, api };
use crate::api::error::Error;
use crate::server::state::ServerState;
use crate::server::pid_file::{ save_pid_file, delete_pid_file, load_pid_file, PID_FILENAME };
use axum::http::{ self, HeaderValue };
use axum::{ Router, extract::Request, middleware::{ Next, from_fn }, response::Response };
use anyhow::{ Result, Context };
use tokio::signal;
use tokio::net::TcpListener;
use sysinfo::{ Pid, System };

const API_KEY_HEADER: &str = "X-API-Key";

pub struct Server {}

impl Default for Server {
    fn default() -> Self {
        Self {}
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
        let server = Server::default();
        let listener = server.bind().await?;

        // Save the file agent.pid
        let app_dir = settings::get_app_dir();
        save_pid_file(
            &app_dir,
            &listener.local_addr().unwrap(),
            settings::get_api_key().as_str()
        ).expect(
            format!(
                "Unable to save the pid file: {}",
                app_dir.join(PID_FILENAME).to_str().unwrap()
            ).as_str()
        );

        // Run the server
        let result = server.run(listener).await;

        // delete the file agent.pid
        delete_pid_file(&app_dir).expect(
            format!(
                "Unable to delete the pid file: {}",
                app_dir.join(PID_FILENAME).to_str().unwrap()
            ).as_str()
        );
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

    /// Run the server.
    ///
    /// This function will start the server and will not return until the server is stopped.
    async fn run(&self, listener: TcpListener) -> Result<()> {
        // create the server state
        let state = ServerState::new();

        // routes that don't required authentication
        let routes = Router::new()
            .merge(api::auth::routes(state.clone()))
            .merge(api::agent::routes(state.clone()))
            .layer(from_fn(check_api_key));
        // routes that require authentication
        let auth_routes = Router::new().merge(
            api::users
                ::authenticated_routes(state.clone())
                .layer(from_fn(check_api_key))
                .layer(from_fn(check_authentication))
        );

        // all routes are nested under the /api/v1 path
        let api = Router::new().nest("/api/v1", routes.merge(auth_routes));

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
        let s = System::new_all();
        if s.process(Pid::from_u32(pid_file.pid)).is_some() {
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
async fn check_api_key(req: Request, next: Next) -> Result<Response, Error> {
    let api_key_header = req.headers().get(API_KEY_HEADER);
    if let Some(api_key) = api_key_header {
        let value = api_key.to_str();
        if value.is_ok() && value.unwrap() == settings::get_api_key() {
            return Ok(next.run(req).await);
        }
    }
    Err(Error::Forbidden)
}

/// Check the security token.
///
/// The security token is passed in the Authorization header and is required for most of the requests.
/// If the security token is not provided, the request will be rejected with a 403 Forbidden error.
/// If the security token is provided but is invalid, the request will be rejected with a 400 Bad Request error.
async fn check_authentication(req: Request, next: Next) -> Result<Response, Error> {
    let authorization_header = req.headers().get(http::header::AUTHORIZATION);
    if let Some(authorization_header) = authorization_header {
        match parse_authorization_header(authorization_header) {
            Ok(token) => {
                // TODO: Check the security token
                return Ok(next.run(req).await);
            }
            Err(_) => {
                return Err(Error::BadRequest("(Invalid 'Authorization' header)".to_string()));
            }
        }
    }
    return Err(Error::Forbidden);

    // Parse the 'Authorization' header.
    fn parse_authorization_header(authorization_header: &HeaderValue) -> Result<String> {
        let parts: Vec<&str> = authorization_header.to_str()?.split(" ").collect();
        if parts.len() != 2 || parts[0] != "Bearer" {
            return Err(anyhow::anyhow!("Invalid syntax, expecting 'Bearer <token>'"));
        }
        Ok(parts[1].to_string())
    }
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
