use crate::Result;
use crate::{models::QueryExecution, server::state::ServerState};
use futures::future::BoxFuture;

pub fn execute_queries_task(
    state: ServerState,
    _session_id: uuid::Uuid,
    queries: Vec<QueryExecution>,
) -> BoxFuture<'static, Result<()>> {
    Box::pin(async move {
        let _agentdb_conn = state.get_agentdb_connection().await?;
        for _query in &queries {}
        Ok(())
    })
}
