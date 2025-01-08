import { create } from "zustand";
import { calculateColorScheme } from "@/utils/colors";
import { BLANK_PAGE_ITEM_ID, DEFAULT_PRIMARY_SIDEBAR_WIDTH } from "@/utils/constants";
import { ApplicationSpace } from "@/utils/types";
import { AnyResource } from "@/resources/handlers";

/**
 * A name of a pages/sections in the settings.
 */
export type SettingsPageName = "general" | "table" | "history" | "terminal" | "connections" | "storage" | string;

export type Page = {
  id: string;
  itemId: string;
};

/**
 * A helper function to create a new blank page.
 */
function createBlankPage(): Page {
  return {
    id: crypto.randomUUID(),
    itemId: BLANK_PAGE_ITEM_ID,
  };
}

type State = {
  /**
   * The current color scheme of the application.
   * This value is calculated based on the user settings & the system preferences. It's not the same as the state
   * settings.colorScheme which can also be "auto". Any component that need to explicitly use the color scheme rather
   * than relying on the CSS classes should use this value.
   */
  colorScheme: "light" | "dark";

  /**
   * The size of the primary sidebar in pixels.
   */
  sidebarWidth: number;

  /**
   * The visibility state of the primary sidebar (default: `true`).
   */
  sidebarVisibility: boolean;

  /**
   * State of the settings .
   */
  settings: {
    /**
     * Whether the settings are open or not.
     */
    open: boolean;

    /**
     * The last active page in the settings.
     */
    selectedPage: SettingsPageName;

    /**
     * Any resources that are currently edited in the settings.
     */
    resources: AnyResource[];
  };

  /**
   * The current active space.
   */
  activeSpace: ApplicationSpace;

  /**
   * The id of the selected item in the sidebar.
   *
   * - This is the item that is currently selected in the sidebar, multiple pages can be open for the same item so it's
   *   important to track the active item separately from the active page.
   * - This id does not necessarily correspond to the id of the active page.
   */
  activeId?: string;

  /**
   * The id of the active page.
   */
  activePageId?: string;

  /**
   * The pages that are currently open.
   */
  pages: Page[];
};

type Actions = {
  /**
   * Set the primary sidebar width.
   */
  setSidebarWidth: (width: number) => void;

  /**
   * Change the visibility of the primary sidebar.
   */
  toggleSidebarVisibility: () => void;

  setColorScheme: (colorScheme: "light" | "dark") => void;

  /**
   * Show the settings.
   */
  openSettings: () => void;

  /**
   * Close the settings.
   */
  closeSettings: () => void;

  /**
   * Edit the settings of the given resource.
   */
  changeResourceSettings: (resource: AnyResource) => void;

  /**
   * Select a page in the settings.
   */
  selectSettingsPage: (page: SettingsPageName) => void;

  setActiveSpace: (activeSpace: ApplicationSpace) => void;

  /**
   * Change the current active item.
   */
  setActiveItem: (id: string) => void;

  /**
   * Make the given page the active one.
   */
  setActivePage: (pageId: string) => void;

  /**
   * Change the item of the given page.
   */
  replacePage: (pageId: string, itemId: string) => void;

  /**
   * Add a new page for the given item and make it the active one.
   */
  addPage: (itemId: string) => void;

  /**
   * Close the page with the given id.
   *
   * The new active page will be the one before the closed page.
   * When closing the last remaining page, a new default page is created.
   */
  closePage: (pageId: string) => void;
};

/**
 * The global store of the application.
 */
export const useAppStore = create<State & Actions>((set, _get) => {
  return {
    sidebarWidth: DEFAULT_PRIMARY_SIDEBAR_WIDTH,
    sidebarVisibility: true,
    colorScheme: calculateColorScheme("auto"),
    activeSpace: "logon",
    pages: [],
    activePageId: undefined,

    settings: {
      open: false,
      selectedPage: "general",
      resources: [],
    },

    /**
     * Set the primary sidebar width.
     */
    setSidebarWidth(width: number) {
      set((state) => ({ ...state, sidebarWidth: width }));
    },

    /**
     * Change the visibility of the primary sidebar.
     */
    toggleSidebarVisibility() {
      set((state) => ({ ...state, sidebarVisibility: !state.sidebarVisibility }));
    },

    setActiveSpace(activeSpace: ApplicationSpace) {
      switch (activeSpace) {
        case "user": {
          // TODO: We should load the active items from the local storage.
          const defaultPage = createBlankPage();
          set((state) => ({
            ...state,
            pages: [defaultPage],
            activePageId: defaultPage.id,
            activeId: defaultPage.itemId,
            activeSpace,
          }));
          break;
        }
        case "logon": {
          set((state) => ({ ...state, pages: [], activeId: undefined, activePageId: undefined, activeSpace }));
          break;
        }
      }
    },

    setColorScheme(colorScheme: "light" | "dark") {
      set((state) => ({ ...state, colorScheme: colorScheme }));
    },

    /**
     * Show the settings.
     */
    openSettings() {
      set((state) => ({ ...state, settings: { ...state.settings, open: true } }));
    },

    /**
     * Close the settings.
     */
    closeSettings() {
      set((state) => ({ ...state, settings: { ...state.settings, open: false, resources: [] } }));
    },

    /**
     * Edit the settings of the given resource.
     */
    changeResourceSettings(resource: AnyResource) {
      set((state) => {
        const index = state.settings.resources.findIndex((r) => r.id === resource.id);
        if (index !== -1) {
          const resources = [...state.settings.resources];
          resources[index] = resource;
          return {
            ...state,
            settings: {
              ...state.settings,
              resources,
            },
          };
        }
        return {
          ...state,
          settings: {
            ...state.settings,
            resources: [...state.settings.resources, resource],
          },
        };
      });
    },

    /**
     * Select a page in the settings.
     */
    selectSettingsPage(page: SettingsPageName) {
      set((state) => ({ ...state, settings: { ...state.settings, selectedPage: page } }));
    },

    /**
     * Change the current active item.
     *
     * This will also change the active page to the first page that is open for the item. If there are no pages open for
     * the item, the active page is not changed.
     */
    setActiveItem(id: string) {
      set((state) => ({
        ...state,
        activeId: id,
        activePageId: state.pages.find((p) => p.itemId === id)?.id || state.activePageId,
      }));
    },

    /**
     * Change the current active page.
     */
    setActivePage(pageId: string) {
      set((state) => ({
        ...state,
        activePageId: pageId,
        activeId: state.pages.find((p) => p.id === pageId)?.itemId,
      }));
    },

    /**
     * Add a new empty page for the given item and make it the active one.
     */
    addPage(itemId: string) {
      const newPage: Page = {
        id: crypto.randomUUID(),
        itemId,
      };
      set((state) => ({
        ...state,
        pages: [...state.pages, newPage],
        activePageId: newPage.id,
        activeId: newPage.itemId,
      }));
    },

    /**
     * Change the item of the given page.
     */
    replacePage(pageId: string, itemId: string) {
      set((state) => ({
        ...state,
        pages: state.pages.map((page) => (page.id === pageId ? { ...page, itemId } : page)),
      }));
    },

    /**
     * Close the page with the given id.
     */
    closePage(pageId: string) {
      set((state) => {
        if (state.pages.length > 1) {
          // The new active page will be the one before the closed page.
          const activePageIndex = Math.max(0, state.pages.findIndex((page) => page.id === pageId) - 1);
          const pages = state.pages.filter((page) => page.id !== pageId);
          return {
            ...state,
            pages,
            activePageId: pages[activePageIndex].id,
            activeId: pages[activePageIndex].itemId,
          };
        } else {
          // Closing the last page, create a new blank page for the current active space.
          const blankPage = createBlankPage();
          return {
            ...state,
            pages: [blankPage],
            activePageId: blankPage.id,
            activeId: blankPage.itemId,
          };
        }
      });
    },
  };
});
