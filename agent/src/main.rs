mod commandline;
mod settings;
mod server;
mod api;
mod utils;
mod pid_file;

use std::process::exit;
use anyhow::{ Result, Context };
use crate::pid_file::{ save_pid_file, delete_pid_file, PID_FILENAME };

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

/// Initialize and start the web server
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

    // run the server
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
