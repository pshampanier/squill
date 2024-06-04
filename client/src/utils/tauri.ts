import { invoke } from "@tauri-apps/api/tauri";
import { AgentEndpoint } from "@/models/agent";
import { deserialize } from "./serializable";
import { listen, Event } from "@tauri-apps/api/event";

/**
 * The Tauri utility class.
 *
 * This class provides utility methods to interact with the Tauri API.
 * When object are returned from the Tauri API, they are deserialized using `serializable`, this
 * allows to use the class directly in the TypeScript code (instead of using a plain object) and also take care of the
 * conversion between the snake_case and camelCase properties.
 */
export class Tauri {
  /**
   * Get the agent endpoint.
   *
   * @returns The agent endpoint connection parameters if an agent is running, otherwise returns `null`.
   */
  static async getAgentEndpoint(): Promise<AgentEndpoint> {
    return invoke<object>("get_agent_endpoint").then((payload: object) => {
      return deserialize<AgentEndpoint>(payload, AgentEndpoint);
    });
  }

  /**
   * Listen to the agent endpoint changes.
   *
   * @param callback The callback function to be called when the agent endpoint changes.
   */
  static async listenAgentEndpoint(callback: (endpoint: AgentEndpoint) => void): Promise<void> {
    listen("agent-endpoint-changed", (event: Event<object>) => {
      callback(deserialize<AgentEndpoint>(event.payload, AgentEndpoint));
    });
  }
}
