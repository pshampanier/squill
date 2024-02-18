import { CollectionItem } from "@/resources/collection-item";
import { raise } from "@/utils/telemetry";
import { agent } from "@/resources/agent";
import { Workspace } from "@/models/workspaces";
import { User } from "@/models/users";

export type WorkspaceItemType = "folder" | "file" | "environment";
export type WorkspaceItem = CollectionItem<WorkspaceItemType>;

/**
 * Workspaces resource
 *
 * This resource is used to interact with the workspaces of the application.
 */
const Workspaces = {
  _current: Workspace,

  get current(): Workspace {
    if (!this._current) {
      raise("No workspace loaded");
    }
    return this._current;
  },

  async list(user: User, workspace: string, path: string): Promise<WorkspaceItem[]> {
    const encodedUser = encodeURIComponent(user.username);
    const encodedPath = encodeURIComponent(`${workspace}/${path}`);
    return (await agent().get<WorkspaceItem>(`/users/${encodedUser}/catalog/workspaces?path=${encodedPath}`)).asArray(
      CollectionItem<WorkspaceItemType>
    );
  },
};

export { Workspaces };
