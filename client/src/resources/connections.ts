import { Connection } from "@/models/connections";
import { agent } from "@/resources/agent";

const Connections = {
  async defaults(): Promise<Connection> {
    return (await agent().get<Connection>(`/connections/defaults`)).as(Connection);
  },
  async test(connection: Connection): Promise<void> {
    await agent().post(`/connections/test`, connection);
  },
};

export default Connections;
