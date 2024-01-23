use std::process::exit;
use std::path::{ PathBuf, Path };
use ini::Ini;
use anyhow::{ Result, Context };

mod commandline;
mod settings;
mod server;
mod api;
mod utils;

const PID_FILENAME: &str = "agent.pid";

#[tokio::main]
async fn main() {
    println!(
        "{} {} (pid={})",
        env!("CARGO_PKG_DESCRIPTION"),
        env!("CARGO_PKG_VERSION"),
        std::process::id()
    );

    let args = commandline::get_args();
    if args.show_config {
        settings::show_config();
        exit(0);
    }

    match run().await {
        Ok(_) => {}
        Err(error) => {
            println!("Error: {}", error);
            exit(1);
        }
    }
}

async fn run() -> Result<()> {
    // We must be able to create files in the app directory (such as agent.pid, logs...).
    let app_dir = settings::get_app_dir();
    if !app_dir.exists() {
        std::fs
            ::create_dir_all(app_dir.as_path())
            .with_context(|| {
                format!("Unable to create the application directory: {}", app_dir.to_str().unwrap())
            })?;
    }

    // server initialization
    let server = server::Server::default();
    let listener = server.bind().await?;

    // save the file agent.pid
    let pid_file: PathBuf = [app_dir.to_str().unwrap(), PID_FILENAME].iter().collect();
    save_pid_file(&pid_file, &listener.local_addr().unwrap())?;

    // run the server
    let result = server.run(listener).await;

    // delete the file agent.pid
    delete_pid_file(&pid_file);
    result
}

fn save_pid_file(file: &Path, local_addr: &std::net::SocketAddr) -> Result<()> {
    // save the port and the current pid to a file
    let mut content = Ini::new();
    content
        .with_section(None::<String>)
        .set("pid", std::process::id().to_string())
        .set("port", local_addr.port().to_string())
        .set("api_key", settings::get_api_key());
    content
        .write_to_file(file)
        .with_context(|| { format!("Unable to save the pid file: {}", file.to_str().unwrap()) })
}

fn delete_pid_file(file: &Path) {
    if file.exists() {
        match std::fs::remove_file(file) {
            Ok(_) => {}
            Err(error) => {
                println!("Warning: {}", error);
            }
        };
    }
}

#[cfg(test)]
mod main_tests {
    use super::*;
    use std::net::SocketAddr;
    use tempfile::tempdir;

    #[test]
    fn test_save_pid_file() {
        let app_dir = tempdir().unwrap();
        let file = app_dir.path().join("test.pid");
        let local_addr = SocketAddr::new("127.0.0.1".parse().unwrap(), 1234);
        save_pid_file(&file, &local_addr).unwrap();
        assert!(file.exists());
        assert_eq!(
            format!("pid={}\nport=1234\napi_key=cf55f65...\n", std::process::id().to_string()),
            std::fs::read_to_string(&file).unwrap()
        );
        std::fs::remove_file(file).unwrap();
        std::fs::remove_dir(app_dir.into_path()).unwrap();
    }

    #[test]
    fn test_delete_pid_file() {
        // file exists
        let app_dir = tempdir().unwrap();
        let file = app_dir.path().join("test.pid");
        std::fs::write(&file, "test").unwrap();
        delete_pid_file(&file);
        assert!(!file.exists());
        std::fs::remove_dir(app_dir.into_path()).unwrap();
    }
}
