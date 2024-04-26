mod api;
mod commandline;
mod models;
mod resources;
mod settings;
mod server;
mod utils;

use std::path::PathBuf;
use tracing_appender::rolling;
use tracing::{ error, Subscriber };
use tracing_subscriber::{ self, filter::EnvFilter };
use tracing_subscriber::{ Registry, prelude::* };
use anyhow::{ Result, Context };
use utils::constants::ENV_VAR_LOG_LEVEL;
use utils::validators::sanitize_username;
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
            error!("{}", error);
            std::process::exit(1);
        }
    }
}

/// Initialize the tracing system.
///
/// All logs are written to the standard output and to log files if the logging collector is enabled.
fn get_tracing_subscriber() -> Result<Box<dyn Subscriber + Send + Sync>> {
    // logs are always written to the standard output.
    let stdout_log = tracing_subscriber::fmt
        ::layer()
        .with_writer(std::io::stdout.with_max_level(settings::get_log_level()))
        .pretty()
        .compact()
        .with_line_number(false)
        .with_ansi(true)
        .with_file(false)
        .with_target(true)
        .with_filter(EnvFilter::from_env(ENV_VAR_LOG_LEVEL));

    let file_log = if settings::get_log_collector() {
        // the logging collector is enabled, we must be initiate the creation of log files.
        let log_dir = PathBuf::from(settings::get_log_dir());
        if !log_dir.exists() {
            std::fs
                ::create_dir_all(log_dir.as_path())
                .with_context(|| { format!("Unable to create the log directory: {}", log_dir.to_str().unwrap()) })?;
        }
        let file_appender = rolling::daily(log_dir, "agent.log");
        Some(
            tracing_subscriber::fmt
                ::layer()
                .with_ansi(false)
                .with_thread_ids(true)
                .with_writer(file_appender.with_max_level(settings::get_log_level()))
                .with_filter(EnvFilter::from_env(ENV_VAR_LOG_LEVEL))
        )
    } else {
        None
    };

    Ok(Box::new(Registry::default().with(file_log).with(stdout_log)))
}

/// Initialize and start the web server
async fn run(args: &commandline::Args) -> Result<()> {
    // we must be able to create files in the app directory (such as agent.pid, logs...).
    let app_dir = settings::get_app_dir();
    if !app_dir.exists() {
        std::fs
            ::create_dir_all(app_dir.as_path())
            .with_context(|| { format!("Unable to create the application directory: {}", app_dir.to_str().unwrap()) })?;
    }
    // now that the command line has been parsed, the app_directory exists we can initialize the tracing system.
    tracing::subscriber::set_global_default(get_tracing_subscriber()?)?;

    match &args.command {
        commandline::Commands::Start { .. } => {
            // start the web server
            return Server::start().await;
        }
        commandline::Commands::UserAdd { username } => {
            resources::users::create_user(&sanitize_username(username)?)?;
        }
        commandline::Commands::UserDel { username } => {
            resources::users::delete_user(&sanitize_username(username)?)?;
        }
        commandline::Commands::ShowConfig => {
            settings::show_config();
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::tests::settings;
    #[test]
    fn test_init_tracing() {
        let log_dir = tempfile::tempdir().unwrap().into_path().join("logs");

        // set the log level to error so not log will be mixed in the test result output on stdout.
        settings::set_log_level(crate::models::agent::LogLevel::Error);

        // 1) disable the log collector, the log directory should not be created.
        settings::set_log_collector(false);
        settings::set_log_dir(log_dir.parent().unwrap().to_str().unwrap().to_string());
        get_tracing_subscriber().unwrap();
        assert!(!log_dir.exists());

        // 2) enable the log collector, the log directory should be created and logs written in that directory.
        settings::set_log_collector(true);
        settings::set_log_dir(log_dir.to_str().unwrap().to_string());
        let subscriber = get_tracing_subscriber().unwrap();
        tracing::subscriber::with_default(subscriber, || {
            tracing::info!("test");
        });
        let log_files: Vec<_> = std::fs
            ::read_dir(&log_dir)
            .unwrap()
            .filter_map(|res| {
                res.ok().and_then(|entry| {
                    if entry.path().file_name().unwrap().to_str().unwrap().starts_with("agent.log") {
                        Some(entry.path())
                    } else {
                        None
                    }
                })
            })
            .collect();
        assert!(log_files.len() == 1);
    }
}
