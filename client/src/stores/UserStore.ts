import Users from "@/resources/users";
import { UserSettings } from "@/models/users";
import { CatalogEntry } from "@/resources/users";
import { produce } from "immer";
import { create } from "zustand";

export type CatalogRoot = "environments" | "workspaces" | "favorites";

type State = {
  settings: UserSettings | null;

  environments: string[];
  workspaces: string[];
  favorites: string[];

  catalog: Map<string, CatalogEntry>;

  /**
   * The id of the active catalog entry.
   */
  activeId: string | null;
};

type Actions = {
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
   * Set the active catalog entry.
   */
  setActiveId: (id: string | null) => void;
};

export const useUserStore = create<State & Actions>((set) => {
  return {
    settings: null,

    environments: [],
    workspaces: [],
    favorites: [],

    catalog: new Map<string, CatalogEntry>(),

    activeId: null,

    /**
     * Reset the store when a new user is logged in.
     */
    reset() {
      const user = Users.current;
      set((state) => ({
        ...state,
        settings: produce(user.settings, () => {}),
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
     * Set the active catalog entry.
     */
    setActiveId(id: string | null) {
      set((state) => ({
        ...state,
        activeId: id,
      }));
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
  const newCatalog = new Map<string, CatalogEntry>();
  for (const [key, entry] of catalog) {
    if (key === id) {
      newCatalog.set(key, mutator(entry));
    } else {
      newCatalog.set(key, entry);
    }
  }
  return newCatalog;
}

function mergeAndMutateCatalog(
  catalog: Map<string, CatalogEntry>,
  entries: CatalogEntry[],
  id: string,
  mutator: (entry: CatalogEntry) => CatalogEntry
) {
  const newCatalog = new Map(catalog);
  for (const entry of entries) {
    newCatalog.set(entry.id, mutator(entry));
  }
  newCatalog.set(id, mutator(newCatalog.get(id)!));
  return newCatalog;
}
