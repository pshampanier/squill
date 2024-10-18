import { Connection } from "@/models/connections";
import { QueryExecution } from "@/models/queries";
import { agent } from "@/resources/agent";
import { HTTP_HEADER_X_ORIGIN } from "@/utils/constants";

const Connections = {
  async get(id: string): Promise<Connection> {
    return (await agent().get<Connection>(`/connections/${id}`)).as(Connection);
  },

  async defaults(): Promise<Connection> {
    return (await agent().get<Connection>(`/connections/defaults`)).as(Connection);
  },

  async test(connection: Connection): Promise<void> {
    await agent().post(`/connections/test`, connection);
  },

  /**
   * Execute a buffer of queries thought the connection.
   *
   * The buffer is may contain 0 or more queries. For each query, a query execution is created and added to the history
   * and the the identifier of each query execution is returned.
   *
   * @param connId The identifier of the connection to execute the buffer on.
   * @param origin The origin of the buffer (e.g. `terminal`, `worksheet`, ...).
   * @param buffer A text containing 0 or more statements to execute.
   * @returns A Promise that will resolve with a list of query executions.
   */
  async execute(connId: string, origin: string, buffer: string): Promise<QueryExecution[]> {
    return (
      await agent().post<string, QueryExecution>(`/connections/${connId}/execute`, buffer, {
        headers: {
          [HTTP_HEADER_X_ORIGIN]: origin,
        },
      })
    ).asArray(QueryExecution);
  },
};

export default Connections;
