import { QueryExecution } from "@/models/queries";
import { agent } from "@/resources/agent";
import { HTTP_HEADER_X_ORIGIN } from "@/utils/constants";
import { Table } from "apache-arrow";

export const Queries = {
  async list_history(connId: string, origin: string): Promise<QueryExecution[]> {
    return (
      await agent().get<QueryExecution>(`/connections/${connId}/history`, {
        headers: {
          [HTTP_HEADER_X_ORIGIN]: origin,
        },
      })
    ).asArray(QueryExecution);
  },

  async getHistoryPreview(connId: string, queryId: string): Promise<Table> {
    return (await agent().get<QueryExecution>(`/connections/${connId}/history/${queryId}/preview`)).asTable();
  },
};
