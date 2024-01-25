use crate::{ settings, api };
use crate::api::error::Error;
use axum::http::{ self, HeaderValue };
use axum::{ Router, extract::Request, middleware::{ Next, from_fn }, response::Response };
use anyhow::{ Result, Context };
use tokio::signal;
use tokio::net::TcpListener;

const API_KEY_HEADER: &str = "X-API-Key";

pub struct Server {}

impl Default for Server {
    fn default() -> Self {
        Self {}
    }
}

impl Server {
    /// Bind the server to listen_address:port
    ///
    /// This function will return an error if the listen address is not valid or if the port is already in use.
    /// This function will not start the server, this is done later by calling start() on the returned TcpListener.
    pub async fn bind(&self) -> Result<TcpListener> {
        let listen_addr = format!("{}:{}", settings::get_listen_address(), settings::get_port());
        tokio::net::TcpListener
            ::bind(&listen_addr).await
            .with_context(|| {
                format!("Unable to bind to the listen address: {}", listen_addr.to_string())
            })
    }

    /// Start the server.
    ///
    /// This function will start the server and will not return until the server is stopped.
    pub async fn start(&self, listener: TcpListener) -> Result<()> {
        // routes that don't required authentication
        let routes = Router::new()
            .merge(api::auth::routes())
            .merge(api::agent::routes())
            .layer(from_fn(check_api_key));
        // routes that require authentication
        let auth_routes = Router::new().merge(
            api::users
                ::authenticated_routes()
                .layer(from_fn(check_api_key))
                .layer(from_fn(check_authentication))
        );
        // all routes are nested under the /api/v1 path
        let router = Router::new().nest("/api/v1", routes.merge(auth_routes));

        // start the server
        println!("listening on {}", listener.local_addr().unwrap().to_string());
        axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await?;
        Ok(())
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
                // todo!("Check the security token");
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
