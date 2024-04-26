use std::pin::Pin;
use anyhow::Result;
use futures::{ future::BoxFuture, Stream, TryStreamExt };
use crate::value::DriverValue;

pub trait DriverConnection {
    /// Connect to the dataset.
    fn connect(&mut self) -> BoxFuture<'_, Result<()>>;

    /// Close the connection to the dataset.
    fn close(&mut self) -> BoxFuture<'_, Result<()>>;
}

pub trait DriverStream: Stream<Item = Result<DriverValue>> + std::marker::Send {
    fn affected_rows(&self) -> Option<u64>;
}

pub trait DriverExecutor {
    /// Execute a query and return the stream of the result.
    fn query<'e>(&'e mut self, query: &'e str) -> BoxFuture<'e, Result<Pin<Box<dyn DriverStream + 'e>>>>;
}

pub async fn execute_query<'e>(executor: &'e mut dyn DriverExecutor, query: &'e str) -> Result<u64> {
    let mut stream = executor.query(query).await?;
    let value = stream.try_next().await?;
    match value {
        Some(_) => Err(anyhow::anyhow!("Expecting the affected rows count, but nothing data instead.")),
        None => Ok(stream.affected_rows().unwrap_or(0)),
    }
}

pub async fn get_query<'e>(executor: &'e mut dyn DriverExecutor, query: &'e str) -> Result<Option<DriverValue>> {
    let mut stream = executor.query(query).await?;
    let value = stream.try_next().await?;
    Ok(value)
}

pub trait Driver: DriverConnection + DriverExecutor + Send {}
