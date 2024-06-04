import { serializable } from "@/utils/serializable";

export class AgentEndpoint {
  /// The URL of the agent
  @serializable("string")
  url: string;

  /// The API key used to authenticate the client applications.
  @serializable("string", { snakeCase: "property" })
  apiKey: string;

  constructor(object: Partial<AgentEndpoint>) {
    Object.assign(this, object);
  }
}
