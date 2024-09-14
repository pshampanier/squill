use crate::tasks::Task;
use crate::Result;
use crate::{models::QueryExecution, server::state::ServerState};
use futures::future::BoxFuture;

pub struct QueryTask {
    pub state: ServerState,
    pub session_id: uuid::Uuid,
    pub queries: Vec<QueryExecution>,
}

impl Task for QueryTask {
    fn execute(&self) -> BoxFuture<'_, Result<()>> {
        Box::pin(async move {
            let agentdb_conn = self.state.get_agentdb_connection().await?;
            for query in &self.queries {}
            Ok(())
        })
    }
}
