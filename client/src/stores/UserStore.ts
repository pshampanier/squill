import Users from "@/resources/users";
import { UserSettings } from "@/models/users";
import { CatalogEntry } from "@/resources/users";
import { produce } from "immer";
import { create } from "zustand";

export type CatalogRoot = "connections" | "environments" | "workspaces" | "favorites";

export type State = {
  settings: UserSettings | null;

  /**
   * The ids of the connections located at the root of the catalog.
   */
  connections: string[];

  /**
   * The ids of the environments located at the root of the catalog.
   */
  environments: string[];

  /**
   * The ids of the workspaces located at the root of the catalog.
   */
  workspaces: string[];

  /**
   * The ids of the favorites located at the root of the catalog.
   */
  favorites: string[];

  /**
   * A map of catalog entries.
   *
   * The key is the id of the entry ad the value is the entry itself.
   */
  catalog: Map<string, CatalogEntry>;
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
   * Load the catalog for the given path and add it to the store.
   */
  loadCatalog: (path: string, id?: string) => Promise<void>;

  /**
   * Rename an entry in the catalog.
   *
   * The entry is first renamed on the server and then the store is updated if the server operation is successful,
   * otherwise a exception is thrown.
   */
  renameCatalogEntry: (id: string, path: string, newName: string) => Promise<void>;

  /**
   * Create a new catalog entry.
   *
   * The entry is first created on the server and then the store is updated if the server operation is successful,
   * otherwise a exception is thrown.
   *
   * @param path The path of the catalog where the entry should be created (this is the parent of the entry to be created).
   * @param id The id of the folder where the entry should be created (this is the parent of the entry to be created) or
   *        `undefined` if the entry should be created at the root of the catalog.
   * @param item The item to be created.
   */
  createCatalogEntry: (path: string, id: string | undefined, item: object) => Promise<void>;
};

const initialState: State = {
  settings: null,
  connections: [],
  environments: [],
  workspaces: [],
  favorites: [],
  catalog: new Map<string, CatalogEntry>(),
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
    async loadCatalog(path: string, id: string | undefined) {
      const entries = await Users.readCatalog(path);
      entries.sort((a, b) => a.name.localeCompare(b.name));
      if (id === undefined) {
        // This is a root of the catalog.
        // - add the entries's id to the right root of the catalog (environments, workspaces, favorites, etc.)
        // - add the entries to `catalog`
        set((state) => ({
          ...state,
          [path]: entries.map((entry) => entry.id),
          catalog: mergeCatalog(state.catalog, entries),
        }));
      } else {
        // This is a folder in the catalog.
        // - add the children to then folder's entry in `catalog`.
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
    async renameCatalogEntry(id: string, path: string, newName: string) {
      await Users.renameCatalogEntry(path, newName);
      set((state) => ({
        ...state,
        catalog: mutateCatalog(state.catalog, id, (entry) => ({ ...entry, name: newName })),
      }));
    },

    /**
     * Create a new catalog entry.
     */
    async createCatalogEntry(path: string, id: string | undefined, item: object) {
      const entry = await Users.createCatalogEntry(path, item);
      if (id === undefined) {
        // Adding the entry to the root of the catalog.
        // TODO: The store should also take care of the state of the parent folder (open/close).
        const rootPath = path as CatalogRoot;
        const rootCollection = get()[rootPath];
        if (rootCollection.length === 0) {
          // Loading the catalog will take care of adding the newly created entry to the catalog.
          await get().loadCatalog(rootPath);
        } else {
          set((state) => ({
            ...state,
            [path]: [...state[rootPath], entry.id],
            catalog: mergeCatalog(state.catalog, [entry]),
          }));
        }
      } else {
        // Adding an entry to a folder in the catalog.
        // We need to add the entry to the folder's children.
        set((state) => ({
          ...state,
          catalog: mergeAndMutateCatalog(state.catalog, [entry], id, (folder) => ({
            ...folder,
            children: [...folder.children, entry],
          })),
        }));
      }
    },
  };
});

//
function mergeCatalog(catalog: Map<string, CatalogEntry>, entries: CatalogEntry[]) {
  const newCatalog = new Map(catalog);
  for (const entry of entries) {
    newCatalog.set(entry.id, entry);
  }
  return newCatalog;
}

function mutateCatalog(catalog: Map<string, CatalogEntry>, id: string, mutator: (entry: CatalogEntry) => CatalogEntry) {
  const newCatalog = new Map(catalog);
  const entry = newCatalog.get(id);
  if (entry) {
    // replace the entry with id `id` with the mutated entry
    newCatalog.set(id, mutator(entry));
  }
  return newCatalog;
}

/**
 * Merge a catalog with a list of given entries and mutate the entry with id `id` using the given `mutator`.
 *
 * @param catalog The catalog to merge with the entries.
 * @param entries The entries to be added/replaced in the catalog.
 * @param id The id of the entry to be mutated.
 * @param mutator A function that takes an entry and returns that entry after having applied a mutation on it.
 * @returns The new catalog.
 */
function mergeAndMutateCatalog(
  catalog: Map<string, CatalogEntry>,
  entries: CatalogEntry[],
  id: string,
  mutator: (entry: CatalogEntry) => CatalogEntry
) {
  const newCatalog = new Map(catalog);
  // add/replace entries present in `entries`
  for (const entry of entries) {
    newCatalog.set(entry.id, entry);
  }
  // replace the entry with id `id` with the mutated entry
  const entry = newCatalog.get(id);
  if (entry) {
    newCatalog.set(id, mutator(entry));
  }
  return newCatalog;
}
