use crate::{ settings, api };
use crate::api::error::Error;
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
    // bind the server to listen_address:port
    pub async fn bind(&self) -> Result<TcpListener> {
        let listen_addr = format!("{}:{}", settings::get_listen_address(), settings::get_port());
        tokio::net::TcpListener
            ::bind(&listen_addr).await
            .with_context(|| {
                format!("Unable to bind to the listen address: {}", listen_addr.to_string())
            })
    }

    pub async fn run(&self, listener: TcpListener) -> Result<()> {
        let routes = Router::new().merge(api::auth::routes()).merge(api::agent::routes());
        // build our application with a route
        let router = Router::new().nest("/api/v1", routes).layer(from_fn(check_api_key));

        // start the server
        println!("listening on {}", listener.local_addr().unwrap().to_string());
        axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await?;
        Ok(())
    }
}

/// Check the API key.
///
/// The API key is passed in the X-API-Key header and is required for all requests.
async fn check_api_key(req: Request, next: Next) -> Result<Response, Error> {
    // requires the http crate to get the header name
    let api_key_header = req.headers().get(API_KEY_HEADER);
    if let Some(api_key) = api_key_header {
        let value = api_key.to_str();
        if value.is_ok() && value.unwrap() == settings::get_api_key() {
            return Ok(next.run(req).await);
        }
    }
    Err(Error::Forbidden)
}

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
        _ = terminate => {},
    }
}
