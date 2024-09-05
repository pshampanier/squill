import { Connection } from "@/models/connections";
import { QueryExecution } from "@/models/query-execution";
import { agent } from "@/resources/agent";

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

  async execute(id: string, buffer: string): Promise<QueryExecution[]> {
    return (await agent().post<string, QueryExecution>(`/connections/${id}/execute`, buffer)).asArray(QueryExecution);
  },
};

export default Connections;
