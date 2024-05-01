import { Connection } from "@/models/connections";
import { agent } from "@/resources/agent";

const Connections = {
  async create(): Promise<Connection> {
    return (await agent().get<Connection>(`/connections/new`)).as(Connection);
  },
  async test(connection: Connection): Promise<void> {
    await agent().post(`/connections/test`, connection);
  },
};

export default Connections;
