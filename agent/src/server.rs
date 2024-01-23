use crate::{ settings, api };
use axum::Router;
use anyhow::{ Result, Context };
use tokio::signal;
use tokio::net::TcpListener;

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
        // build our application with a route
        let router = Router::new().nest("/api/v1", api::auth::routes());

        // start the server
        println!("listening on {}", listener.local_addr().unwrap().to_string());
        axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await?;
        Ok(())
    }
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
