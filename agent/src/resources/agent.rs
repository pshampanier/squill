use crate::models;
use crate::settings;
use crate::utils::constants::DRIVERS_DIRNAME;
use crate::Result;
use anyhow::anyhow;
use std::path::Path;
use tracing::debug;

/// Load the drivers from the agent's assets directory.
pub fn load_drivers() -> Result<Vec<models::Driver>> {
    load_drivers_from_dir(settings::get_assets_dir().join(DRIVERS_DIRNAME))
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
    use tokio_test::assert_ok;

    #[test]
    fn test_load_drivers() {
        let drivers = assert_ok!(load_drivers());
        assert_eq!(drivers.len(), 4);
    }
}
