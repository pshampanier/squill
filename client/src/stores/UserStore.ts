import { ROOT_CATALOG_ID, Users } from "@/resources/users";
import { produce } from "immer";
import { create } from "zustand";
import { ResourceRef, ResourceType } from "@/models/resources";
import { QueryExecution } from "@/models/queries";
import { Notification } from "@/components/core/NotificationInbox";
import { BLANK_PAGE_ITEM_ID, METADATA_RESOURCES_TYPE, NOT_FOUND_ITEM_ID } from "@/utils/constants";
import { AnyResource, getResourceHandler, ResourceHandler } from "@/resources/handlers";
import { ApplicationSpace, SVGIcon } from "@/utils/types";
import { UserSettings } from "@/models/user-settings";

/**
 * The status of either the resource or the children.
 *
 * - `fetching`: An operation is in progress.
 * - `ready`: The children of the item have been loaded.
 * - `error`: An error occurred while loading the children of the item.
 */
export type CatalogItemStatus = "fetching" | "ready" | "error";

export class CatalogItem extends ResourceRef {
  /**
   * The resource handler for the item.
   * Will be set at first use.
   */
  private _handler?: ResourceHandler;

  /**
   * Access the resource handler for the item.
   */
  private get handler(): ResourceHandler {
    if (!this._handler) {
      this._handler = getResourceHandler(this);
    }
    return this._handler;
  }

  /**
   * The resource referenced by the catalog item.
 . */
  resource?: AnyResource;

  /**
   * The children's ids of the catalog item (if applicable).
   */
  children?: string[];

  /**
   * The last error that occurred on that item.
   */
  lastError?: Error;

  /**
   * The current status of the item.
   */
  status?: CatalogItemStatus;

  /**
   * Indicate if the resource is modified and need to be saved.
   */
  modified?: boolean;

  /**
   * The title of the item.
   * This is the name of the item by default but can be overridden by the resource handler.
   */
  get title(): string {
    return this.handler?.title(this);
  }

  /**
   * The icon associated to the item.
   */
  get icon(): SVGIcon {
    return this.handler?.icon(this);
  }

  /**
   * Get the editor for the item and the given space.
   */
  editor(space: ApplicationSpace): React.FunctionComponent<{ pageId: string }> {
    return this.handler.editor(this, space);
  }

  /**
   * Get the resource identified by the given reference.
   */
  async get(): Promise<AnyResource> {
    return this.handler.get(this);
  }

  /**
   * List the content of the resource identified by the given reference.
   */
  async list(): Promise<ResourceRef[]> {
    return this.handler.list(this);
  }

  constructor(props: Partial<CatalogItem>) {
    super(undefined);
    Object.assign(this, props);
  }
}

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
   * Change the status of a catalog item.
   */
  setCatalogItemStatus: (id: string, status: CatalogItemStatus, error?: Error) => void;

  /**
   * Get a catalog item by its identifier.
   *
   * This method is guaranteed to return a catalog item, if the requested item is not found, the special `not-found`
   * catalog item is returned.
   */
  getCatalogItem: (id: string) => CatalogItem;

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
   * Load a catalog resource from its identifier.
   *
   * The resource must be known as a catalog item already present in the store.
   *
   * @param id The identifier of the catalog item to load the resource for.
   * @param reload If true, the resource is reloaded even if already loaded (default is `false`).
   *
   */
  loadCatalogResource: (id: string, reload?: boolean) => Promise<void>;

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
   * The the default collection for the given resource type.
   */
  getDefaultCatalogCollection: (resourceType: ResourceType) => CatalogItem | undefined;

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
      ROOT_CATALOG_ID,
      new CatalogItem({
        id: ROOT_CATALOG_ID,
        name: "Catalog",
        type: "collection",
        parentId: null,
        metadata: {},
      }),
    ],
    [
      BLANK_PAGE_ITEM_ID,
      new CatalogItem({
        id: BLANK_PAGE_ITEM_ID,
      }),
    ],
    [
      NOT_FOUND_ITEM_ID,
      new CatalogItem({
        id: NOT_FOUND_ITEM_ID,
      }),
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
     * Get a catalog item by its identifier.
     *
     * This method is guaranteed to return a catalog item, if the requested item is not found, the special `not-found`
     * catalog item is returned.
     */
    getCatalogItem(id: string): CatalogItem {
      return get().catalog.get(id) || get().catalog.get(NOT_FOUND_ITEM_ID);
    },

    /**
     * Load the catalog for the given path and add it to the store.
     */
    async loadCatalogChildren(id: string, reload: boolean = false) {
      const catalogItem = get().catalog.get(id);
      if (!catalogItem) {
        // The item does not exist in the catalog.
        console.error(`Catalog item with id '${id}' not found.`);
      } else if (catalogItem.status === "fetching") {
        // The children of the item are already being loaded.
        console.debug("Catalog item is already processing a request.", { id, name: catalogItem.name });
      } else if (catalogItem.children && !reload) {
        // The children of the item are already loaded and we don't want to reload them.
        console.debug("Catalog item children already loaded.", { id, name: catalogItem.name });
      } else {
        // We can load the children of the item.
        set((state) => ({
          ...state,
          catalog: mutateCatalog(state.catalog, id, (entry) => new CatalogItem({ ...entry, status: "fetching" })),
        }));
        console.debug("Loading catalog item children...", { id, name: catalogItem.name });
        try {
          const entries = await catalogItem.list();
          entries.sort((a, b) => a.name.localeCompare(b.name));
          set((state) => ({
            ...state,
            catalog: mergeAndMutateCatalog(
              state.catalog,
              entries,
              id,
              (entry) =>
                new CatalogItem({
                  ...entry,
                  children: entries.map((ref) => ref.id),
                  status: "ready",
                  lastError: undefined,
                }),
            ),
          }));
          console.debug("Catalog item loaded...", { id, name: catalogItem.name, state: get() });
        } catch (error) {
          get().setCatalogItemStatus(id, "error", error);
        }
      }
    },

    /**
     * Load a catalog resource from its identifier.
     *
     * The resource must be known as a catalog item already present in the store.
     */
    async loadCatalogResource(id: string, reload: boolean = false): Promise<void> {
      const catalogItem = get().catalog.get(id);
      if (!catalogItem) {
        // The item does not exist in the catalog.
        console.error(`Catalog item with id '${id}' not found.`);
      } else if (catalogItem.resource && !reload) {
        // The resource is already loaded and we don't want to reload it.
        console.debug("Catalog item resource already loaded.", { id, name: catalogItem.name });
      } else {
        // We can load the children of the item.
        set((state) => ({
          ...state,
          catalog: mutateCatalog(state.catalog, id, (entry) => new CatalogItem({ ...entry, status: "fetching" })),
        }));
        console.debug("Loading catalog item resource...", { id, name: catalogItem.name });
        try {
          const resource = await catalogItem.get();
          set((state) => ({
            ...state,
            catalog: mutateCatalog(
              state.catalog,
              id,
              (entry) => new CatalogItem({ ...entry, resource, status: "ready", lastError: undefined }),
            ),
          }));
          console.debug("Catalog item resource loaded...", { id, name: catalogItem.name, resource });
        } catch (error) {
          get().setCatalogItemStatus(id, "error", error);
        }
      }
    },

    /**
     * Change the status of a catalog item.
     */
    setCatalogItemStatus(id: string, status: CatalogItemStatus, error?: Error) {
      set((state) => {
        if (error) {
          state.addNotification({
            id: crypto.randomUUID(),
            variant: "error",
            message: error?.message,
            autoDismiss: true,
            description: error,
          });
        }
        return {
          ...state,
          catalog: mutateCatalog(
            state.catalog,
            id,
            (entry) =>
              new CatalogItem({
                ...entry,
                status,
                lastError: error,
              }),
          ),
        };
      });
    },

    /**
     * Rename an item in the catalog.
     */
    async renameCatalogItem(id: string, newName: string) {
      get().setCatalogItemStatus(id, "fetching");
      try {
        await Users.renameCatalogItem(id, newName);
        set((state) => ({
          ...state,
          catalog: mutateCatalog(
            state.catalog,
            id,
            (entry) =>
              new CatalogItem({
                ...entry,
                name: newName,
                lastError: undefined,
                status: entry.resource ? "ready" : undefined,
              }),
          ),
        }));
      } catch (error) {
        get().setCatalogItemStatus(id, "error", error);
      }
    },

    async createCatalogResource<T extends object>(resourceType: ResourceType, resource: T) {
      const resourceRef = await Users.createCatalogResource<T>(resourceType, resource);
      set((state) => ({
        ...state,
        catalog: mergeAndMutateCatalog(
          state.catalog,
          [resourceRef],
          resourceRef.parentId,
          (parent) =>
            new CatalogItem({
              ...parent,
              children: [...(parent.children || []), resourceRef.id],
            }),
        ),
      }));
    },

    /**
     * The the default collection for the given resource type.
     *
     * The default collection is expected to be the first collection of the given resource type at the root of
     * the catalog.
     */
    getDefaultCatalogCollection(resourceType: ResourceType): CatalogItem | undefined {
      const state = get();
      for (const childId of state.catalog.get(ROOT_CATALOG_ID)?.children || []) {
        const child = state.catalog.get(childId);
        if (child?.metadata?.[METADATA_RESOURCES_TYPE] === resourceType) {
          return child;
        }
      }
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
): Map<string, CatalogItem> {
  const newCatalog = new Map(catalog);
  // add/replace items present in `items`
  for (const item of items) {
    newCatalog.set(item.id, new CatalogItem(item));
  }
  // replace the item with id `id` with the mutated item
  const item = newCatalog.get(id);
  if (item) {
    newCatalog.set(id, mutator(item));
  }
  return newCatalog;
}
