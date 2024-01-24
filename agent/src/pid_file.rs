use std::{ io::Write, path::Path };
use serde::{ Deserialize, Serialize };

type Error = Box<dyn std::error::Error>;

pub const PID_FILENAME: &str = "agent.pid";

#[derive(Serialize, Deserialize, Debug)]
pub struct PidFile {
    pid: u32,
    port: u16,
    api_key: String,
}

pub fn load_pid_file(dir: &Path) -> Result<PidFile, Error> {
    let file = dir.join(PID_FILENAME);
    let content = std::fs::read_to_string(file)?;
    let pid_file: PidFile = toml::from_str(&content)?;
    Ok(pid_file)
}

pub fn delete_pid_file(dir: &Path) -> Result<(), Error> {
    let file = dir.join(PID_FILENAME);
    if file.exists() {
        std::fs::remove_file(file)?;
    }
    Ok(())
}

pub fn save_pid_file(
    dir: &Path,
    local_addr: &std::net::SocketAddr,
    api_key: &str
) -> Result<(), Error> {
    // save the port and the current pid to a file
    let content = PidFile {
        pid: std::process::id(),
        port: local_addr.port(),
        api_key: api_key.to_string(),
    };
    let mut file = std::fs::File::create(dir.join(PID_FILENAME))?;
    file.write_all(toml::to_string_pretty(&content)?.as_bytes())?;
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
