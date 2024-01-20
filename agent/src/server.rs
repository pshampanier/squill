use crate::settings;
use axum::{ response::Html, routing::get, Router };
use ini::Ini;
use anyhow::{ Result, Context };
use tokio::signal;
use std::path::{ PathBuf, Path };

const PID_FILE_NAME: &str = "agent.pid";

pub struct Server {}

impl Server {
    fn new_router(&self) -> Router {
        Router::new().route("/", get(handler))
    }

    fn save_pid_file(&self, file: &Path, local_addr: &std::net::SocketAddr) -> Result<()> {
        // save the port and the current pid to a file
        let mut content = Ini::new();
        content
            .with_section(None::<String>)
            .set("port", local_addr.port().to_string())
            .set("pid", std::process::id().to_string());
        content.write_to_file(file)?;
        Ok(())
    }

    fn delete_pid_file(&self, file: &Path) {
        if file.exists() {
            match std::fs::remove_file(file) {
                Ok(_) => {}
                Err(error) => {
                    println!("Warning: {}", error);
                }
            };
        }
    }

    pub async fn run(&self, settings: &settings::AgentSettings) -> Result<()> {
        // build our application with a route
        let router = self.new_router();

        // bind the server to listen_address:port
        let listen_addr = format!("{}:{}", settings.listen_address, settings.port);
        let listener = tokio::net::TcpListener::bind(listen_addr).await.unwrap();

        // save the port and the current pid to a file
        let default_base_dir = settings::get_default_base_dir();
        let user_directory = Path::new(&default_base_dir);
        if !user_directory.exists() {
            std::fs::create_dir_all(user_directory)?;
        }
        let file: PathBuf = [user_directory.to_str().unwrap(), PID_FILE_NAME].iter().collect();
        self
            .save_pid_file(&file, &listener.local_addr().unwrap())
            .with_context(|| {
                format!("Unable to save the pid file: {}", file.to_str().unwrap())
            })?;

        // start the server
        println!("listening on {}", listener.local_addr().unwrap());
        let result = axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await;

        // delete the pid file
        self.delete_pid_file(&file);

        match result {
            Ok(_) => Ok(()),
            Err(error) => Err(error).context("Unexpected server error."),
        }
    }
}

async fn handler() -> Html<&'static str> {
    Html("<h1>Hello, World!</h1>")
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
