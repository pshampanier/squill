mod commandline;
mod settings;
mod server;
mod api;
mod utils;
mod models;
mod resources;

use anyhow::{ Result, Context };
use crate::server::web::Server;

/// Include the generated build information from the module built
pub mod built_info {
    include!(concat!(env!("OUT_DIR"), "/built.rs"));
}

#[tokio::main]
async fn main() {
    let args = commandline::get_args();
    match run(args).await {
        Ok(_) => {}
        Err(error) => {
            println!("Error: {}", error);
            std::process::exit(1);
        }
    }
}

/// Initialize and start the web server
async fn run(args: &commandline::Args) -> Result<()> {
    // We must be able to create files in the app directory (such as agent.pid, logs...).
    let app_dir = settings::get_app_dir();
    if !app_dir.exists() {
        std::fs
            ::create_dir_all(app_dir.as_path())
            .with_context(|| {
                format!("Unable to create the application directory: {}", app_dir.to_str().unwrap())
            })?;
    }
    match &args.command {
        commandline::Commands::Start { .. } => {
            return Server::start().await;
        }
        commandline::Commands::UserAdd { username } => {
            resources::users::create_user(username.as_str())?;
        }
        commandline::Commands::UserDel { username } => {
            resources::users::delete_user(username.as_str())?;
        }
        commandline::Commands::ShowConfig => {
            settings::show_config();
        }
    }
    Ok(())
}
