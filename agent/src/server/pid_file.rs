use std::{ io::Write, path::Path };
use serde::{ Deserialize, Serialize };
use anyhow::{ Context, Result };

pub const PID_FILENAME: &str = "agent.pid";

#[derive(Serialize, Deserialize)]
pub struct PidFile {
    pub pid: u32,
    pub port: u16,
    pub api_key: String,
}

/// Load the pid file (if any).
///
/// This function will return None if the pid file does not exists, cannot be read or if the content of the file is not
/// valid.
pub fn load_pid_file(dir: &Path) -> Option<PidFile> {
    let file = dir.join(PID_FILENAME);
    let Ok(content) = std::fs::read_to_string(file) else {
        return None;
    };
    let Ok(pid_file) = toml::from_str::<PidFile>(&content) else {
        return None;
    };
    Some(pid_file)
}

pub fn delete_pid_file(dir: &Path) -> Result<()> {
    let file = dir.join(PID_FILENAME);
    if file.exists() {
        std::fs
            ::remove_file(&file)
            .with_context(|| format!("Cannot delete the pid file: '{:?}'.", file))?;
    }
    Ok(())
}

pub fn save_pid_file(dir: &Path, local_addr: &std::net::SocketAddr, api_key: &str) -> Result<()> {
    // save the port and the current pid to a file
    let content = PidFile {
        pid: std::process::id(),
        port: local_addr.port(),
        api_key: api_key.to_string(),
    };
    let mut file = std::fs::File::create(dir.join(PID_FILENAME))?;
    file
        .write_all(toml::to_string_pretty(&content)?.as_bytes())
        .with_context(|| format!("Cannot write the pid file: '{:?}'.", dir.join(PID_FILENAME)))?;
    Ok(())
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
