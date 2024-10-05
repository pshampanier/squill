import { ROOT_CATALOG_ID, Users } from "@/resources/users";
import { UserSettings } from "@/models/users";
import { useAppStore } from "@/stores/AppStore";
import { produce } from "immer";
import { create } from "zustand";
import { ResourceRef, ResourceType } from "@/models/resources";
import { METADATA_CONTENT_TYPE } from "@/utils/constants";
import { ContentType } from "@/models/folders";
import { QueryExecution } from "@/models/queries";
import Connections from "@/resources/connections";
import { Notification } from "@/components/core/NotificationInbox";

/**
 * The loading status of a catalog's item children.
 *
 * - `pending`: No attempt has been made to load the children of the item.
 * - `loading`: An attempt is being made to load the children of the item.
 * - `ready`: The children of the item have been loaded.
 * - `error`: An error occurred while loading the children of the item.
 */
export type CatalogItemLoadingStatus = "loading" | "ready" | "error";

export type CatalogItem = ResourceRef & {
  /**
   * The children of the catalog item (if applicable).
   */
  children?: CatalogItem[];

  /**
   * The loading status of the children (if applicable).
   */
  status?: CatalogItemLoadingStatus;
};

export type State = {
  settings: UserSettings | null;

  /**
   * A map of catalog entries.
   *
   * The key is the id of the entry ad the value is the entry itself.
   */
  catalog: Map<string, CatalogItem>;

  /**
   * The history of query executions.
   *
   * The key is the id of the query execution and the value is the query execution itself.
   * All query executions are stored in the history, regardless of the component that initiated the query.
   */
  history: Map<string, QueryExecution>;

  /**
   * A list of notifications to be displayed to the user.
   *
   * FIXME: Notifications should be stored in the local storage to be persistent until the user dismisses them.
   */
  notifications: Notification[];
};

export type Actions = {
  /**
   * Reset the store when a new user is logged in.
   */
  reset: () => void;

  /**
   * Reset the store when user settings have been modified.
   */
  resetSettings: () => void;

  /**
   * Load the children item from the catalog for the given catalog item identifier.
   *
   * The children catalog items are not return by this function but added to the store when they become
   * available.
   *
   * @param id The identifier of the catalog item to load the children for.
   * @param reload If true, the children are reloaded even if they are already loaded (default is `false`).
   */
  loadCatalogChildren: (id: string, reload?: boolean) => Promise<void>;

  /**
   * Rename an item in the catalog.
   *
   * The entry is first renamed on the server and then the store is updated if the server operation is successful,
   * otherwise a exception is thrown.
   */
  renameCatalogItem: (id: string, newName: string) => Promise<void>;

  /**
   * Create a new resource in the catalog.
   */
  createCatalogResource: (resourceType: ResourceType, resource: object) => Promise<void>;

  /**
   * The the default folder for the given resource type.
   */
  getDefaultCatalogFolder: (contentType: ContentType) => CatalogItem | undefined;

  /**
   * Execute a buffer on a connection.
   *
   * The buffer is may contain 0 or more queries. For each query, a query execution is created and added to the history
   * and the the identifier of each query execution is returned.
   */
  executeBuffer: (connectionId: string, buffer: string) => Promise<string[]>;

  /**
   * Add a notification.
   */
  addNotification: (notification: Notification) => void;

  /**
   * Remove a notification.
   * Typically called when the user dismisses a notification.
   */
  removeNotification: (id: string) => void;
};

const initialState: State = {
  settings: null,
  catalog: new Map<string, CatalogItem>([
    [
      "root-catalog-id",
      {
        id: "root-catalog-id",
        name: "Catalog",
        type: "folder",
        parentId: null,
        metadata: {},
      },
    ],
  ]),
  history: new Map<string, QueryExecution>(),
  notifications: [],
};

type UserStore = State & Actions;

export const useUserStore = create<UserStore>((set, get) => {
  return {
    ...initialState,

    /**
     * Reset the store when a new user is logged in.
     */
    reset() {
      const user = Users.current;
      set(() => ({
        ...initialState,
        settings: produce(user?.settings, () => {}),
      }));
    },

    /**
     * Reset the store when user settings have been modified.
     */
    resetSettings() {
      const user = Users.current;
      set((state) => ({
        ...state,
        settings: produce(user.settings, () => {}),
      }));
    },

    /**
     * Load the catalog for the given path and add it to the store.
     */
    async loadCatalogChildren(id: string, reload: boolean = false) {
      const catalogItem = get().catalog.get(id);
      if (!catalogItem) {
        // The item does not exist in the catalog.
        console.error(`Catalog item with id '${id}' not found.`);
        return;
      } else if (catalogItem.status === "loading") {
        // The children of the item are already being loaded.
        console.debug("Catalog item is already loading.", { id, name: catalogItem.name });
        return;
      } else if (catalogItem.status === "ready" && !reload) {
        // The children of the item are already loaded and we don't want to reload them.
        console.debug("Catalog item already loaded.", { id, name: catalogItem.name });
        return;
      } else {
        set((state) => ({
          ...state,
          catalog: mutateCatalog(state.catalog, id, (entry) => ({ ...entry, status: "loading" })),
        }));
        console.debug("Loading catalog item...", { id, name: catalogItem.name, state: get() });
        try {
          const entries = await Users.readCatalog(id);
          entries.sort((a, b) => a.name.localeCompare(b.name));
          set((state) => ({
            ...state,
            catalog: mergeAndMutateCatalog(state.catalog, entries, id, (entry) => ({
              ...entry,
              children: entries,
              status: "ready",
            })),
          }));
          console.debug("Catalog item loaded...", { id, name: catalogItem.name, state: get() });
        } catch (error) {
          set((state) => ({
            ...state,
            catalog: mutateCatalog(state.catalog, id, (entry) => ({ ...entry, status: "error" })),
          }));
          get().addNotification({
            id: crypto.randomUUID(),
            variant: "error",
            message: `Failed to load '${catalogItem.name}'`,
            description: error,
          });
        }
      }
    },

    /**
     * Rename an item in the catalog.
     */
    async renameCatalogItem(id: string, newName: string) {
      await Users.renameCatalogItem(id, newName);
      set((state) => ({
        ...state,
        catalog: mutateCatalog(state.catalog, id, (entry) => ({ ...entry, name: newName })),
      }));
      useAppStore.getState().renamePages(id, newName);
    },

    async createCatalogResource<T extends object>(resourceType: ResourceType, resource: T) {
      const resourceRef = await Users.createCatalogResource<T>(resourceType, resource);
      // Adding an entry to a folder in the catalog.
      // We need to add the entry to the folder's children.
      set((state) => ({
        ...state,
        catalog: mergeAndMutateCatalog(state.catalog, [resourceRef], resourceRef.parentId, (parent) => ({
          ...parent,
          children: [...(parent.children || []), resourceRef],
        })),
      }));
    },

    /**
     * Execute a buffer on a connection.
     *
     * The buffer is may contain 0 or more queries. For each query, a query execution is created and added to the history
     * and the the identifier of each query execution is returned.
     */
    async executeBuffer(connectionId: string, buffer: string) {
      const queryExecutions = await Connections.execute(connectionId, buffer);
      const additionalItems = queryExecutions.reduce((map, qe) => {
        map.set(qe.id, qe);
        return map;
      }, new Map<string, QueryExecution>());
      set((state) => ({
        ...state,
        history: new Map([...state.history, ...additionalItems]),
      }));
      return queryExecutions.map((qe) => qe.id);
    },

    /**
     * The the default resource folder for the given resource type.
     *
     * The default resource folder is expected to be the first folder of the given resource type at the root of
     * the catalog.
     */
    getDefaultCatalogFolder(contentType: ContentType): CatalogItem | undefined {
      return get()
        .catalog.get(ROOT_CATALOG_ID)
        ?.children.find((catalogItem) => {
          return catalogItem.metadata?.[METADATA_CONTENT_TYPE] === contentType;
        });
    },

    /**
     * Add a notification.
     */
    addNotification(notification: Notification) {
      set((state) => ({
        ...state,
        notifications: [...state.notifications, notification],
      }));
    },

    /**
     * Remove a notification.
     */
    removeNotification(id: string) {
      set((state) => ({
        ...state,
        notifications: state.notifications.filter((notification) => notification.id !== id),
      }));
    },
  };
});

function mutateCatalog(catalog: Map<string, CatalogItem>, id: string, mutator: (entry: CatalogItem) => CatalogItem) {
  const newCatalog = new Map(catalog);
  const item = newCatalog.get(id);
  if (item) {
    // replace the item with id `id` with the mutated entry
    newCatalog.set(id, mutator(item));
  }
  return newCatalog;
}

/**
 * Merge a catalog with a list of given items and mutate the entry with id `id` using the given `mutator`.
 *
 * @param catalog The catalog to merge with the items.
 * @param items The items to be added/replaced in the catalog.
 * @param id The id of the entry to be mutated.
 * @param mutator A function that takes an entry and returns that entry after having applied a mutation on it.
 * @returns The new catalog.
 */
function mergeAndMutateCatalog(
  catalog: Map<string, CatalogItem>,
  items: ResourceRef[],
  id: string,
  mutator: (entry: CatalogItem) => CatalogItem,
) {
  const newCatalog = new Map(catalog);
  // add/replace items present in `items`
  for (const item of items) {
    newCatalog.set(item.id, item);
  }
  // replace the item with id `id` with the mutated item
  const item = newCatalog.get(id);
  if (item) {
    newCatalog.set(id, mutator(item));
  }
  return newCatalog;
}
