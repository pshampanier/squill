///
/// A collection of types used throughout the agent.
///

/// A function that can be called to check if the agent is shutting down.
pub type IsShuttingDownFn = Box<dyn Fn() -> bool + Send + Sync>;
