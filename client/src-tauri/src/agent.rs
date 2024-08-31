use crate::models::agent::AgentEndpoint;
use anyhow::Result;
use common::get_app_dir;
use common::pid_file::{get_agent_status, get_pid_file_path, load_pid_file, AgentStatus, PidFile};
use futures::channel::mpsc::channel;
use futures::{SinkExt, StreamExt};
use lazy_static::lazy_static;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Mutex;
use tauri::Window;
use tracing::{error, info, warn};

/*
 * The latest content of the agent.pid file.
 * If there is no agent running, this value is None.
 */
lazy_static! {
    static ref AGENT_PID_FILE: Mutex<Option<PidFile>> = Mutex::new(None);
}

/**
 * Monitor the state of the agent.
 *
 * The agent watcher is responsible for monitoring the agent.pid file and the agent process.
 * It will start the agent if it is not running.
 * It will emit an event to the web ui when the agent is started or stopped.
 */
pub struct AgentWatcher {
    fs_watcher: Option<RecommendedWatcher>,
}

impl AgentWatcher {
    pub fn new() -> Self {
        Self { fs_watcher: None }
    }

    /**
     * Get the latest content of the agent.pid file.
     */
    pub fn get_pid_file() -> Option<PidFile> {
        AGENT_PID_FILE.lock().unwrap().clone()
    }

    /**
     * Start the agent watcher.
     *
     * The agent watcher will monitor the agent.pid file and the agent process. If the agent.pid file is modified or
     * removed, the agent watcher will emit an event to the web ui using the window parameter.
     */
    pub fn start(&mut self, window: Window) -> Result<()> {
        // Load the pid file (if any)
        Self::load_pid_file();
        Self::emit_agent_endpoint(&window);

        //
        // File system watcher: monitoring the agent.pid file.
        //
        let (mut tx, mut rx) = channel::<Result<Event, notify::Error>>(1);
        let mut watcher = RecommendedWatcher::new(
            move |res| {
                futures::executor::block_on(async {
                    tx.send(res).await.unwrap();
                })
            },
            Config::default(),
        )?;

        // We are watching the app directory for changes.
        // We cannot only watch the file agent.pid because the call watch would fail if the file does not exists yet.
        let app_dir = get_app_dir();
        let pid_file_path = get_pid_file_path(&app_dir);
        watcher.watch(app_dir.as_ref(), RecursiveMode::NonRecursive)?;
        tauri::async_runtime::spawn(async move {
            // Before starting watching the pid file, we are going to run a health check to see if the pid file we've
            // eventually loaded is still valid.
            Self::check_health().await;

            while let Some(res) = rx.next().await {
                match res {
                    Ok(event) => {
                        if event.paths.contains(&pid_file_path) {
                            if event.kind.is_remove() {
                                // The agent.pid file has changed but we cannot use it yet
                                Self::clear_pid_file();
                                Self::emit_agent_endpoint(&window);
                            } else if event.kind.is_modify() || event.kind.is_create() {
                                Self::load_pid_file();
                                Self::emit_agent_endpoint(&window);
                            }
                        }
                    }
                    Err(e) => error!("watch error: {:?}", e),
                }
            }
        });

        self.fs_watcher = Some(watcher);
        Ok(())
    }

    /**
     * Check the health of the agent.
     *
     * If the agent is not running, this method will start it.
     */
    pub async fn check_health() {
        if let Some(pid_file) = Self::get_pid_file() {
            // If there is a pid file, check if the agent is running
            match get_agent_status(&pid_file).await {
                AgentStatus::Running(_) => {
                    // If the agent is running, do nothing
                    return;
                }
                AgentStatus::NotRunning => {
                    // If the agent is not running, start it
                    warn!("The agent with pid={} is no longer running.", pid_file.pid);
                }
                AgentStatus::NotResponding(pid, reason) => {
                    // If the agent is not responding, start it
                    warn!("The agent is not responding (pid={}, reason={}).", pid, reason);
                }
            }
        }
        // If we reach this point, there is no pid file or the agent is not running
        Self::start_agent();
    }

    /**
     * Reset the AGENT_PID_FILE singleton to None.
     */
    fn clear_pid_file() {
        let mut agent_pid_file = AGENT_PID_FILE.lock().unwrap();
        *agent_pid_file = None;
    }

    /**
     * Load the agent.pid file and update the AGENT_PID_FILE singleton.
     */
    fn load_pid_file() {
        let pid_file = load_pid_file(&get_app_dir());
        let mut agent_pid_file = AGENT_PID_FILE.lock().unwrap();
        *agent_pid_file = pid_file;
    }

    /**
     * Emit an event to the web ui notifying the agent endpoint has changed.
     */
    fn emit_agent_endpoint(window: &Window) {
        let agent_pid_file = Self::get_pid_file();
        let agent_endpoint: Option<AgentEndpoint> = agent_pid_file.map(|pid_file| pid_file.into());
        if let Err(e) = window.emit("agent-endpoint-changed", agent_endpoint) {
            error!("Failed to emit agent-endpoint: {:?}", e);
        }
    }

    /**
     * Start the agent.
     *
     * in debug, will start the agent located in the same directory as the client.
     * FIXME: in release, will start the agent embedded as a sidecar.
     * @see {@link https://tauri.app/v1/guides/building/sidecar}
     */
    fn start_agent() {
        info!("Starting agent...");
        let current_exe = std::env::current_exe().unwrap();
        let agent_exe = current_exe.with_file_name("agent");
        if !agent_exe.exists() {
            error!("Agent executable not found: {:?}", agent_exe);
        } else {
            let agent_exe = agent_exe.to_str().unwrap();
            match std::process::Command::new(agent_exe).arg("start").spawn() {
                Ok(child) => {
                    info!("Agent started (pid={})", child.id());
                }
                Err(e) => {
                    error!("Failed to start agent: {:?}", e);
                }
            }
        }
    }
}

impl From<PidFile> for AgentEndpoint {
    fn from(pid_file: PidFile) -> Self {
        Self { url: format!("http://{}:{}", pid_file.address, pid_file.port), api_key: pid_file.api_key }
    }
}
