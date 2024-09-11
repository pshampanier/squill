use crate::models;
use crate::Result;
use anyhow::anyhow;
use std::env;
use std::path::Path;
use std::path::PathBuf;
use tracing::debug;

/// Load the drivers from the agent's assets directory.
pub fn load_drivers() -> Result<Vec<models::Driver>> {
    if env::current_exe()?.parent().unwrap().join("assets/drivers").exists() {
        return load_drivers_from_dir(env::current_exe()?.parent().unwrap().join("assets/drivers"));
    }
    #[cfg(debug_assertions)]
    if PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets/drivers").exists() {
        return load_drivers_from_dir(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets/drivers"));
    }
    Err(anyhow!("Drivers directory not found"))
}

// Load the drivers from the given directory.
fn load_drivers_from_dir<P: AsRef<Path>>(path: P) -> Result<Vec<models::Driver>> {
    let path = path.as_ref();
    if !path.exists() || !path.is_dir() {
        return Err(anyhow!("Drivers directory does not exist: {:?}", path));
    }
    debug!("Loading drivers from {:?}", path);
    let mut drivers = Vec::new();
    for entry in path.read_dir()? {
        let entry = entry?;
        if entry.path().is_dir() {
            let mut driver_manifest = entry.path().join(entry.path().file_name().unwrap());
            driver_manifest.set_extension("yaml");
            let manifest = std::fs::read_to_string(&driver_manifest)?;
            let driver: models::Driver = serde_yml::from_str(&manifest)?;
            drivers.push(driver);
        }
    }
    Ok(drivers)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_load_drivers() {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets/drivers");
        let drivers = load_drivers_from_dir(path).unwrap();
        assert_eq!(drivers.len(), 4);
    }
}
