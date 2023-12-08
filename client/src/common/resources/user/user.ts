import { listCollectionFolder, getWorkspace } from "@/api/v1/user";
import { serializable } from "@/utils/serializable";
import { CollectionItem, CollectionItemLink } from "../collection-item";
import { ResourceRef } from "../resource-ref";
import { UserSettings } from "./user-settings";
import { agent } from "../agent";
import { AuthRequest } from "@/utils/auth";

export type UserApplicationSpace = "user" | "workspace";

export type UserCollectionItemType = "folder" | "workspace";
export type UserCollectionItem = CollectionItem<UserCollectionItemType>;
export type UserCollectionLink = CollectionItemLink<UserCollectionItemType>;

export class User {
  @serializable("string", { format: "identifier", required: true })
  username!: string;

  @serializable("object", { factory: UserSettings })
  readonly settings: UserSettings = new UserSettings();

  @serializable("array", {
    items: { type: "object", options: { factory: CollectionItem<UserCollectionItemType>, skip: "serialize" } },
  })
  readonly collections: UserCollectionItem[] = [];

  @serializable("array", { items: { type: "string", options: { trim: true } } })
  favorites: UserCollectionLink[] = [];

  /**
   * The user currently logged in.
   */
  private static _current?: User;

  constructor();
  constructor(username: string);
  constructor(...args: unknown[]) {
    if (args.length && typeof args[0] === "string") {
      const [username] = args as [string];
      this.username = username;
    }
  }

  /**
   * Get the user currently logged in.
   */
  static get current(): User {
    if (!this._current) {
      throw new Error("No user logged in");
    }
    return this._current;
  }

  static async logon(auth: AuthRequest): Promise<User> {
    User._current = await agent().logon(auth);
    return User._current;
  }

  async loadCollectionItem<T>(id: string): Promise<T> {
    const found = CollectionItem.find<UserCollectionItemType>(this.collections, id);
    if (!found) {
      throw new Error("Collection item not found");
    }
    if (found.item.type === "folder") {
      const children = await listCollectionFolder(this, new ResourceRef(found.path, found.item.name));
      found.item.children = children;
      return children as unknown as T;
    } else if (found.item.type === "workspace") {
      const workspace = await getWorkspace(this, new ResourceRef(found.path, found.item.name));
      // this.recentlyOpened = [link, ...this.recentlyOpened.filter((item) => item.id !== id)];
      return workspace as unknown as T;
    } else {
      throw new Error(`'${found.item.type}' is not a valid collection item type`);
    }
  }
}
