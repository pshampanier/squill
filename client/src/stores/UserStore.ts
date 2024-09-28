import Users from "@/resources/users";
import { UserSettings } from "@/models/users";
import { useAppStore } from "@/stores/AppStore";
import { produce } from "immer";
import { create } from "zustand";
import { ResourceRef, ResourceType } from "@/models/resources";
import { METADATA_CONTENT_TYPE } from "@/utils/constants";
import { ContentType } from "@/models/folders";
import { QueryExecution } from "@/models/queries";
import Connections from "@/resources/connections";

export type CatalogItem = ResourceRef & {
  children?: CatalogItem[];
};

export type State = {
  settings: UserSettings | null;

  /**
   * The ids of all resources located at the root of the catalog.
   * They are all expected to be folders.
   */
  catalogSections: string[];

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
   * Load the children resources from the catalog for the given resource identifier.
   *
   * The resources are added to the store.
   * If the resource identifier is `undefined`, the resources are added to the root of the catalog.
   */
  loadCatalog: (id?: string) => Promise<void>;

  /**
   * Rename an entry in the catalog.
   *
   * The entry is first renamed on the server and then the store is updated if the server operation is successful,
   * otherwise a exception is thrown.
   */
  renameCatalogEntry: (id: string, newName: string) => Promise<void>;

  /**
   * Create a new resource in the catalog.
   */
  createResource: (resourceType: ResourceType, resource: object) => Promise<void>;

  /**
   * The the default resource folder for the given resource type.
   */
  getDefaultResourceFolder: (contentType: ContentType) => ResourceRef;

  /**
   * Execute a buffer on a connection.
   *
   * The buffer is may contain 0 or more queries. For each query, a query execution is created and added to the history
   * and the the identifier of each query execution is returned.
   */
  executeBuffer: (connectionId: string, buffer: string) => Promise<string[]>;
};

const initialState: State = {
  settings: null,
  catalogSections: [],
  catalog: new Map<string, CatalogItem>(),
  history: new Map<string, QueryExecution>(),
};

export const useUserStore = create<State & Actions>((set, get) => {
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
    async loadCatalog(id?: string) {
      const entries = await Users.readCatalog(id);
      entries.sort((a, b) => a.name.localeCompare(b.name));
      if (id === undefined) {
        // This is a root of the catalog.
        // - add the entries's id to the root of the catalog.
        // - add the entries to `catalog`.
        set((state) => ({
          ...state,
          catalogSections: entries.map((entry) => entry.id),
          catalog: mergeCatalog(state.catalog, entries),
        }));
      } else {
        // This is a folder in the catalog.
        // - add the children to the folder's entry identified with `id` in `catalog`.
        // - add the entries to `catalog`
        set((state) => ({
          ...state,
          catalog: mergeAndMutateCatalog(state.catalog, entries, id, (entry) => ({ ...entry, children: entries })),
        }));
      }
    },

    /**
     * Rename an entry in the catalog.
     */
    async renameCatalogEntry(id: string, newName: string) {
      await Users.renameCatalogEntry(id, newName);
      set((state) => ({
        ...state,
        catalog: mutateCatalog(state.catalog, id, (entry) => ({ ...entry, name: newName })),
      }));
      useAppStore.getState().renamePages(id, newName);
    },

    async createResource<T extends object>(resourceType: ResourceType, resource: T) {
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
    getDefaultResourceFolder(contentType: ContentType) {
      const id = get().catalogSections.find((section) => {
        const entry = get().catalog.get(section);
        return entry.metadata?.[METADATA_CONTENT_TYPE] === contentType;
      });
      return get().catalog.get(id);
    },
  };
});

//
function mergeCatalog(catalog: Map<string, ResourceRef>, entries: ResourceRef[]) {
  const newCatalog = new Map(catalog);
  for (const entry of entries) {
    newCatalog.set(entry.id, entry);
  }
  return newCatalog;
}

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
  catalog: Map<string, ResourceRef>,
  items: CatalogItem[],
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
