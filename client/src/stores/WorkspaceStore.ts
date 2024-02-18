import { Editor } from "@/resources/editors";
import { Environment } from "@/models/environments";
import { Workspace } from "@/models/workspaces";
import { create } from "zustand";
import { WorkspaceItem } from "@/resources/workspaces";

export type WorkspacePage = {
  readonly id: string;
  readonly itemId: string;
  readonly title: string;
  readonly editor: Editor;
  readonly modified?: boolean;
};

type State = {
  /** The id of the active page */
  activePageId?: string;
  pages: WorkspacePage[];

  /**
   * The id of the active item.
   *
   * - This is the item that is currently selected in the tree, multiple pages can be open for the same item so it's
   *   important to track the active item separately from the active page.
   * - This id does not necessarily correspond to the id of the active page, for example if a folder or an environment
   *   is selected in the sidebar, the active id will be id of the folder or the environment.
   */
  activeId?: string;
  environments: Environment[];
  items: Map<string, WorkspaceItem>;
  rootItemIds: string[];
};

type Actions = {
  reset: () => void;
  setActivePage: (pageId: string) => void;
  setActiveId: (id: string) => void;
  addPage: (itemId: string, title: string, editor: Editor) => string;
  closePage: (pageId: string) => void;
  setModified: (pageId: string, modified: boolean) => void;
  replaceActivePage: (itemId: string, title: string, editor: Editor) => void;
  findPage(callbackFn: (page: WorkspacePage) => boolean): WorkspacePage | undefined;
};

const initialState: State = {
  activeId: undefined,
  activePageId: undefined,
  pages: [],
  environments: [],
  rootItemIds: [],
  items: new Map<string, WorkspaceItem>(),
};

export const useWorkspaceStore = create<State & Actions>((set, get) => {
  return {
    ...initialState,
    reset() {
      // const workspace = Workspace.current;
      const workspace = new Workspace();
      if (!workspace) {
        set(() => ({
          ...initialState,
        }));
      } else {
        set(() => ({
          activeId: undefined,
          activePageId: undefined,
          pages: [],
          // environments: workspace.environments.map((e) => e.clone()),
          // collections: workspace.collections.map((c) => c.clone()),
        }));
      }
    },

    addPage(itemId: string, title: string, editor: Editor) {
      const page: WorkspacePage = {
        id: crypto.randomUUID(),
        title,
        itemId,
        editor,
      };
      set((state) => ({
        ...state,
        pages: [...state.pages, page],
        activePageId: page.id,
        activeId: page.itemId,
      }));
      return page.id;
    },

    closePage(pageId: string) {
      // TODO: should prompt for save
      // TODO: should select the previous page
      set((state) => {
        const pages = state.pages.filter((page) => page.id !== pageId);
        const activePageId = pages.length > 0 ? pages[0].id : undefined;
        const activeId = pages.length > 0 ? pages[0].itemId : undefined;
        return {
          ...state,
          pages,
          activePageId,
          activeId,
        };
      });
    },

    setActiveId(id: string) {
      const activeId = get().activeId;
      if (id === activeId) {
        // the id is already active, do nothing
        return;
      }
      // checking if there is already a page open for this id, if so we just need to activate it, otherwise we need to
      // only change the active id.
      set((state) => {
        const page = state.pages.find((p) => p.itemId === id);
        return {
          ...state,
          activeId: id,
          activePageId: page?.id ?? state.activePageId,
        };
      });
    },

    setActivePage(pageId: string) {
      set((state) => ({
        ...state,
        activePageId: pageId,
        activeId: state.pages.find((p) => p.id === pageId)?.itemId,
      }));
    },

    setModified(pageId: string, modified: boolean) {
      set((state) => ({
        ...state,
        pages: state.pages.map((page) => {
          if (page.id === pageId) {
            return {
              ...page,
              modified,
            };
          }
          return page;
        }),
      }));
    },

    replaceActivePage(itemId: string, title: string, editor: Editor) {
      set((state) => ({
        ...state,
        activeId: itemId,
        pages: state.pages.map((page) => {
          if (page.id === state.activePageId) {
            return {
              id: page.id,
              itemId,
              title,
              editor,
              modified: false,
            };
          }
          return page;
        }),
      }));
    },

    findPage(predicate: (page: WorkspacePage) => boolean): WorkspacePage | undefined {
      return get().pages.find(predicate);
    },
  };
});
