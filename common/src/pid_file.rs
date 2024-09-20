use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    io::Write,
    path::{Path, PathBuf},
};
use sysinfo::{Pid, ProcessRefreshKind, RefreshKind, System};
use tracing::{trace, warn};

use crate::constants::X_API_KEY_HEADER;

pub const PID_FILENAME: &str = "agent.pid";

#[derive(Serialize, Deserialize, Clone)]
pub struct PidFile {
    pub pid: u32,
    pub address: String,
    pub port: u16,
    pub api_key: String,
}

pub fn get_pid_file_path(dir: &Path) -> PathBuf {
    dir.join(PID_FILENAME)
}

/// Load the pid file (if any).
///
/// This function will return None if the pid file does not exists, cannot be read or if the content of the file is not
/// valid.
pub fn load_pid_file(dir: &Path) -> Option<PidFile> {
    let file = get_pid_file_path(dir);
    let Ok(content) = std::fs::read_to_string(&file) else {
        return None;
    };
    match toml::from_str::<PidFile>(&content) {
        Ok(pid_file) => {
            trace!("The pid file has been loaded: {:?}", file);
            Some(pid_file)
        }
        Err(error) => {
            warn!("Cannot parse the pid file: '{:?}'. Error: {}", &file, error);
            None
        }
    }
}

pub fn delete_pid_file(dir: &Path) -> Result<()> {
    let file = get_pid_file_path(dir);
    if file.exists() {
        std::fs::remove_file(&file).with_context(|| format!("Cannot delete the pid file: '{:?}'.", file))?;
    }
    trace!("The pid file has been deleted: {:?}", file);
    Ok(())
}

pub fn save_pid_file(dir: &Path, local_addr: &std::net::SocketAddr, api_key: &str) -> Result<()> {
    // save the port and the current pid to a file
    let content = PidFile {
        pid: std::process::id(),
        address: local_addr.ip().to_string(),
        port: local_addr.port(),
        api_key: api_key.to_string(),
    };
    let file_path = get_pid_file_path(dir);
    let mut file = std::fs::File::create(&file_path)?;
    file.write_all(toml::to_string_pretty(&content)?.as_bytes())
        .with_context(|| format!("Cannot write the pid file: '{:?}'.", &file_path))?;
    trace!("The pid file has been created: {:?}", &file_path);
    Ok(())
}

/// Get the URL of the agent described by the pid file.
pub fn get_agent_url(pid_file: &PidFile) -> String {
    format!("http://{}:{}", pid_file.address, pid_file.port)
}

/// The running status of the agent described by the pid file.
pub enum AgentStatus {
    /// The agent is running and responding to an API request.
    /// The u32 value is the process id of the agent.
    Running(u32),

    /// The agent is not running.
    NotRunning,

    /// The agent is running but not responding to an API request.
    /// The u32 value is the process id of the agent.
    /// The String value is the reason why the agent is not responding.
    NotResponding(u32, String),
}

/// Check if the agent described by the pid file is running.
///
/// This function will return an error if the server is already running.
/// In order to check if the server is running, this function will check if there is a pid file present on the file
/// system and if so will use it to try to connect the exiting running agent. If there is an agent running and
/// responding to an API request, this function will return an error, otherwise it will return Ok(()).
pub async fn get_agent_status(pid_file: &PidFile) -> AgentStatus {
    // Check an alternative that works on the Apple Store
    let running_proc = System::new_with_specifics(RefreshKind::new().with_processes(ProcessRefreshKind::everything()));
    if running_proc.process(Pid::from_u32(pid_file.pid)).is_none() {
        // The process is no longer running
        return AgentStatus::NotRunning;
    }

    // Check of the server is responding to an API request
    let http_client = reqwest::Client::new();
    match http_client
        .get(format!("{}/api/v1/agent", get_agent_url(pid_file)))
        .header(X_API_KEY_HEADER, &pid_file.api_key)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                AgentStatus::Running(pid_file.pid)
            } else {
                AgentStatus::NotResponding(pid_file.pid, response.status().to_string())
            }
        }
        Err(err) => AgentStatus::NotResponding(pid_file.pid, err.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pid_file() {
        // 1) Save the pid file
        let app_dir = tempfile::tempdir().unwrap();
        let local_addr = std::net::SocketAddr::new("127.0.0.1".parse().unwrap(), 1234);
        let api_key = "cf55f65...";
        save_pid_file(app_dir.path(), &local_addr, api_key).unwrap();
        assert!(app_dir.path().join(PID_FILENAME).exists());

        // 2) Load the pid file just created
        let pid_file = load_pid_file(app_dir.path()).unwrap();
        assert_eq!(pid_file.pid, std::process::id());
        assert_eq!(pid_file.port, 1234);
        assert_eq!(pid_file.api_key, api_key);

        // 3) Delete the pid file
        assert!(delete_pid_file(app_dir.path()).is_ok());

        // 4) Try to delete a PID file that does not exists
        let another_dir = tempfile::tempdir().unwrap();
        assert!(delete_pid_file(another_dir.path()).is_ok());
    }
}
