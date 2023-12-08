import { Variable } from "./variable";
import { Environment } from "./environment";
import { CollectionItem } from "../collection-item";
import { serializable } from "@/utils/serializable";
import { loadCollectionItem } from "@/api/v1/workspace";
import { ResourceRef } from "../resource-ref";
import { Resource } from "../resource";

export type WorkspaceCollectionItemType = "folder" | "file";
export type WorkspaceCollectionItem = CollectionItem<WorkspaceCollectionItemType>;

/**
 * Workspace.
 */
export class Workspace {
  @serializable("string")
  name!: string;

  @serializable("array", { items: { type: "object", options: { factory: Variable } } })
  readonly globals: Variable[] = [];

  @serializable("array", { items: { type: "object", options: { factory: Environment } } })
  readonly environments: Environment[] = [];
  //
  @serializable("string", { name: "activeEnvironment", dependencies: "environments" })
  _activeEnvironment?: Environment;

  @serializable("array", {
    skip: "serialize",
    items: { type: "object", options: { factory: CollectionItem<WorkspaceCollectionItemType> } },
  })
  readonly collections: WorkspaceCollectionItem[] = [];

  private static _current?: Workspace;

  static get current(): Workspace {
    if (!this._current) {
      throw new Error("No workspace loaded");
    }
    return this._current;
  }

  constructor() {
    Workspace._current = this;
  }

  set activeEnvironment(name: string) {
    const activeEnvironment = this.environments.find((env: Environment) => env.name === name);
    if (activeEnvironment) {
      this._activeEnvironment = activeEnvironment;
    } else {
      // If there is already an active environment then keep it as active otherwise we use the first environment
      // as the active one.
      this._activeEnvironment = this._activeEnvironment ?? this.environments[0];
      throw new Error(`Environment ${name} not found`);
    }
  }

  async loadCollectionItem<T extends object>(id: string): Promise<[Resource<T>, WorkspaceCollectionItem]> {
    const found = CollectionItem.find<WorkspaceCollectionItemType>(this.collections, id);
    if (!found) {
      throw new Error("Item not found");
    }
    const link = new ResourceRef(found.path, found.item.name);
    const resource = await loadCollectionItem<T>(this, link);
    resource.ref = link;
    return [resource, found.item];
  }

  async loadFolder(id: string): Promise<void> {
    const [resource, item] = await this.loadCollectionItem<WorkspaceCollectionItem>(id);
    item.children = resource.asArray(CollectionItem<WorkspaceCollectionItemType>);
  }

  async rename(name: string): Promise<void> {
    const rollback = name;
    this.name = name;
    try {
      await this.save();
    } catch (e) {
      // TODO:
      this.name = rollback;
      throw e;
    }
  }

  async save(): Promise<void> {
    // TODO
  }
}
