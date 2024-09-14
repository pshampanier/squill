use crate::tasks::Task;
use crate::Result;
use crate::{models::QueryExecution, server::state::ServerState};
use futures::future::BoxFuture;

pub struct QueryTask {
    pub state: ServerState,
    pub session_id: uuid::Uuid,
    pub connection_id: uuid::Uuid,
    pub query_executions: Vec<QueryExecution>,
}

impl Task for QueryTask {
    fn execute(&self) -> BoxFuture<'_, Result<()>> {
        Box::pin(async move { todo!() })
    }
}
