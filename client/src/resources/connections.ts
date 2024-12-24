import { Connection, RunRequest } from "@/models/connections";
import { QueryExecution, QueryHistoryPage } from "@/models/queries";
import { agent } from "@/resources/agent";
import { Table } from "apache-arrow";

export const Connections = {
  async get(id: string): Promise<Connection> {
    return (await agent().get<Connection>(`/connections/${id}`)).as(Connection);
  },

  async defaults(): Promise<Connection> {
    return (await agent().get<Connection>(`/connections/defaults`)).as(Connection);
  },

  /**
   * POST /connections/validate
   *
   * Check the validity of a connection definition.
   *
   * The connection definition is validate by the agent to ensure that the connection can be established.
   * If the connection can be established the agent will return the connection information including the default
   * datasource and all other datasources available for the connection.
   */
  async validate(connection: Connection): Promise<Connection> {
    return (await agent().post<Connection, Connection>(`/connections/validate`, connection)).as(Connection);
  },

  /**
   * Run a buffer of queries thought the connection.
   *
   * The buffer is may contain 0 or more queries. For each query, a query execution is created and added to the history
   * and the the identifier of each query execution is returned.
   *
   * @param connId The identifier of the connection to execute the buffer on.
   * @param datasource The name of the datasource to use for the execution.
   * @param origin The origin of the buffer (e.g. `terminal`, `worksheet`, ...).
   * @param buffer A text containing 0 or more statements to execute.
   * @returns A Promise that will resolve with a list of query executions.
   */
  async run(connId: string, datasource: string, origin: string, buffer: string): Promise<QueryExecution[]> {
    return (
      await agent().post<RunRequest, QueryExecution>(`/connections/${connId}/run`, {
        datasource,
        buffer,
        origin,
      })
    ).asArray(QueryExecution);
  },

  /**
   * Get the history of query executions for the given connection and origin.
   *
   * API: `GET /connections/:connId/history`
   *
   * @param connId The identifier of the connection to get the history from.
   * @param origin The origin of the history (e.g. `terminal`, `worksheet`, ...).
   */
  async listHistory(connId: string, origin: string, datasource: string, offset: number = 0): Promise<QueryHistoryPage> {
    return (
      await agent().get<QueryHistoryPage>(`/connections/${connId}/history`, {
        query: { origin, datasource, offset: offset.toString() },
      })
    ).as(QueryHistoryPage);
  },

  /**
   * Remove a query from the history.
   *
   * API: `DELETE /connections/:connId/history/:queryId`
   */
  async removeFromHistory(connId: string, queryId: string) {
    await agent().del(`/connections/${connId}/history/${queryId}`);
  },

  async getHistoryPreview(connId: string, queryId: string): Promise<Table> {
    return (await agent().get<QueryExecution>(`/connections/${connId}/history/${queryId}/preview`)).asTable();
  },

  /**
   * Get the data of a query execution.
   *
   * API: `GET /connections/{id}/history/{query_id}/data?offset={offset}&limit={limit}`
   */
  async getQueryExecutionData(connId: string, queryId: string, offset: number, limit: number): Promise<Table> {
    return (
      await agent().get<QueryExecution>(
        `/connections/${connId}/history/${queryId}/data?offset=${offset}&limit=${limit}`,
      )
    ).asTable();
  },
};
