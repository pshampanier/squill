/**
 * The global store of the application.
 */
import { create } from "zustand";
import { DEFAULT_WIDTH as DEFAULT_SIDEBAR_WIDTH } from "@/components/sidebar/Sidebar";
import { calculateColorScheme } from "@/utils/colors";
import { Editor, editors } from "@/resources/editors";
import { EDITOR_USER_BLANK } from "@/utils/constants";
import { raise } from "@/utils/telemetry";

type ApplicationSpace = "connection" | "logon" | "user" | "workspace";

export type Page = {
  id: string;
  itemId: string;
  title: string;
  editor: Editor;
  modified: boolean;
  readOnly: boolean;

  /**
   * Whether the page is a file or not.
   */
  readonly file: boolean;
};

type State = {
  /**
   * The current color scheme of the application.
   * This value is calculated based on the user settings & the system preferences. It's not the same as the state
   * settings.colorScheme which can also be "auto". Any component that need to explicitly use the color scheme rather
   * than relying on the CSS classes should use this value.
   */
  colorScheme: "light" | "dark";

  /**
   * The size of the sidebar in pixels.
   */
  sidebarWidth: number;

  /**
   * The current active space.
   */
  activeSpace: ApplicationSpace;

  /**
   * The id of the selected item in the sidebar.
   *
   * - This is the item that is currently selected in the sidebar, multiple pages can be open for the same item so it's
   *   important to track the active item separately from the active page.
   * - This id does not necessarily correspond to the id of the active page, for example if a folder or an environment
   *   is selected in the sidebar, the active id will be id of the folder or the environment.
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
  setSidebarWidth: (width: number) => void;
  setActiveSpace: (activeSpace: ApplicationSpace) => void;
  setColorScheme: (colorScheme: "light" | "dark") => void;

  /**
   * Change the current active item.
   */
  setActiveItem: (id: string, title: string, editor: Editor) => void;

  /**
   * Select the active page.
   */
  setActivePage: (pageId: string) => void;

  /**
   * Add a new empty page and make it the active one.
   *
   * The new page will depends on the current active space.
   * This method is used to create a new page when the user clicks on a new item in the sidebar.
   *
   * @throws If the active space does not support pages.
   */
  addBlankPage: () => void;

  /**
   * Add a new empty page and make it the active one.
   */
  addPage: (page: Partial<Page>) => void;

  /**
   * Close the page with the given id.
   *
   * The new active page will be the one before the closed page.
   * When closing the last remaining page, a new default page is created.
   */
  closePage: (pageId: string) => void;

  /**
   * Change the title all pages opened for the item with the given id.
   */
  renamePages: (pageId: string, title: string) => void;
};

/**
 * The global store of the application.
 */
export const useAppStore = create<State & Actions>((set, get) => {
  /**
   * An utility function to create a new page with the given defaults.
   */
  const createPage = (defaults: Partial<Page>): Page => {
    const editor = defaults.editor || editors.getEditorByFilename(defaults.title);
    return {
      id: crypto.randomUUID(),
      itemId: crypto.randomUUID(),
      title: "Untitled",
      editor: editor,
      modified: false,
      readOnly: false,
      file: !!editor.selector,
      ...defaults,
    };
  };

  const getDefaultEditor = (appSpace: ApplicationSpace) => {
    switch (appSpace) {
      case "user": {
        return editors.getEditorByName(EDITOR_USER_BLANK);
      }
      default: {
        raise(`No default editor for "${appSpace}".`);
      }
    }
  };

  return {
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    colorScheme: calculateColorScheme("auto"),
    activeSpace: "connection",
    pages: [],
    activePageId: undefined,

    setSidebarWidth(width: number) {
      set((state) => ({ ...state, sidebarWidth: width }));
    },

    setActiveSpace(activeSpace: ApplicationSpace) {
      switch (activeSpace) {
        case "user":
        case "workspace": {
          const defaultPage = createPage({
            editor: getDefaultEditor(activeSpace),
          });
          set((state) => ({
            ...state,
            pages: [defaultPage],
            activePageId: defaultPage.id,
            activeId: defaultPage.itemId,
            activeSpace,
          }));
          break;
        }
        case "logon":
        case "connection": {
          set((state) => ({ ...state, pages: [], activeId: undefined, activePageId: undefined, activeSpace }));
          break;
        }
      }
    },

    setColorScheme(colorScheme: "light" | "dark") {
      set((state) => ({ ...state, colorScheme: colorScheme }));
    },

    /**
     * Change the current active item.
     */
    setActiveItem(id: string, title: string, editor: Editor) {
      // Check if the page is already open on that item, if so just activate it, otherwise open a new page.
      const pageId = get().pages.find((page) => page.itemId === id);
      if (pageId) {
        set((state) => ({ ...state, activePageId: pageId.id }));
      } else {
        const activePageId = get().activePageId;
        const activePage = get().pages.find((page) => page.id === activePageId);
        const newPage = createPage({ itemId: id, title, editor });
        const pages = [...get().pages];
        // If the active page is not modified, replace it with the new page.
        // Otherwise, add the new page.
        if (!activePage.modified) {
          const activePageIndex = get().pages.findIndex((page) => page.id === activePageId);
          pages[activePageIndex] = newPage;
        } else {
          pages.push(newPage);
        }
        set((state) => ({
          ...state,
          pages,
          activePageId: newPage.id,
          activeId: newPage.itemId,
        }));
      }
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
     * Add a new empty page and make it the active one.
     */
    addPage(page: Partial<Page>) {
      const newPage = createPage(page);
      set((state) => ({
        ...state,
        pages: [...state.pages, newPage],
        activePageId: newPage.id,
        activeId: newPage.itemId,
      }));
    },

    /**
     * Add a new empty page and make it the active one.
     */
    addBlankPage() {
      this.addPage({
        editor: getDefaultEditor(get().activeSpace),
      });
    },

    /**
     * Change the title all pages opened for the item with the given id.
     */
    renamePages(itemId: string, title: string) {
      set((state) => ({
        ...state,
        pages: state.pages.map((page) => (page.itemId === itemId ? { ...page, title } : page)),
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
          // Create a new default page for the current active space.
          const defaultPage = createPage({
            editor: getDefaultEditor(state.activeSpace),
          });
          return {
            ...state,
            pages: [defaultPage],
            activePageId: defaultPage.id,
            activeId: defaultPage.itemId,
          };
        }
      });
    },
  };
});
