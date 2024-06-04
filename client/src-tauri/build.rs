use std::{ env, fs, path::Path };

static AGENT_BIN_NAME: &str = "agent";
static BUNDLE_DIR_NAME: &str = "bundle";

fn main() {
    // The PROFILE environment variable is set by Cargo and should be either "debug" or "release".
    // https://doc.rust-lang.org/cargo/reference/environment-variables.html#environment-variables-cargo-sets-for-build-scripts
    let profile = env::var("PROFILE").unwrap();
    if profile == "release" {
        // The release build is expected to have the agent binary available at the location specified in
        // tauri.conf.json. The code below will identify where the agent binary is and copy it to the expected
        // location with the expected name (see https://tauri.app/v1/guides/building/sidecar/).

        // The TARGET environment variable is set by Cargo and should be the target triple of the build
        // (e.g. x86_64-unknown-linux-gnu).
        // https://doc.rust-lang.org/cargo/reference/config.html#buildtarget
        let target = env::var("TARGET").unwrap();

        // The TARGET_DIR could be either CARGO_BUILD_TARGET_DIR or CARGO_TARGET_DIR.
        // In our case it's expected to be CARGO_BUILD_TARGET_DIR
        // https://doc.rust-lang.org/cargo/reference/config.html#buildtarget-dir
        let target_dir = env::var("CARGO_BUILD_TARGET_DIR").expect("msg: CARGO_BUILD_TARGET_DIR not set");

        // We need to copy the agent binary where the tauri API build expects it to be.
        // This is the location used by externalBin in tauri.conf.json.
        let bundle_dir = Path::new(&target_dir).parent().unwrap().join(BUNDLE_DIR_NAME);
        let agent_bin_name = AGENT_BIN_NAME;
        let agent_bin_from = Path::new(&target_dir).join(profile).join(agent_bin_name);
        let agent_bin_to = bundle_dir.join(format!("{}-{}", agent_bin_name, target));
        fs::create_dir_all(&bundle_dir).unwrap_or_else(|_|
            panic!("Failed to create the bundle directory: {:?}", bundle_dir)
        );
        fs::copy(&agent_bin_from, &agent_bin_to).unwrap_or_else(|_|
            panic!("Failed to copy {:?} to {:?}", agent_bin_from, agent_bin_to)
        );
    }
    tauri_build::build()
}
