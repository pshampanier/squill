import { Editor } from "@/resources/editors";
import { Environment } from "@/resources/workspace/environment";
import { Workspace, WorkspaceCollectionItem } from "@/resources/workspace/workspace";
import { create } from "zustand";

export type WorkspacePage = {
  readonly id: string;
  readonly itemId: string;
  readonly title: string;
  readonly editor: Editor;
  readonly modified?: boolean;
};

type State = {
  activePageId?: string;
  activeItemId?: string;
  environments: Readonly<Environment>[];
  collections: Readonly<WorkspaceCollectionItem>[];
  pages: Readonly<WorkspacePage>[];
};

type Actions = {
  reset: () => void;
  setCollections: (collections: WorkspaceCollectionItem[]) => void;
  setActivePage: (pageId: string) => void;
  addPage: (itemId: string, title: string, editor: Editor) => string;
  closePage: (pageId: string) => void;
  setModified: (pageId: string, modified: boolean) => void;
  replaceActivePage: (itemId: string, title: string, editor: Editor) => void;
};

const initialState: State = {
  activeItemId: undefined,
  activePageId: undefined,
  pages: [],
  environments: [],
  collections: [],
};

export const useWorkspaceStore = create<State & Actions>((set) => {
  return {
    ...initialState,
    reset() {
      const workspace = Workspace.current;
      if (!workspace) {
        set(() => ({
          ...initialState,
        }));
      } else {
        set(() => ({
          activeItemId: undefined,
          activePageId: undefined,
          pages: [],
          environments: workspace.environments.map((e) => e.clone()),
          collections: workspace.collections.map((c) => c.clone()),
        }));
      }
    },

    setCollections(collections: WorkspaceCollectionItem[]) {
      set((state) => ({
        ...state,
        collections: collections.map((c) => c.clone()),
      }));
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
        activeItemId: page.itemId,
      }));
      return page.id;
    },

    closePage(pageId: string) {
      // TODO: should prompt for save
      // TODO: sould select the previous page
      set((state) => {
        const pages = state.pages.filter((page) => page.id !== pageId);
        const activePageId = pages.length > 0 ? pages[0].id : undefined;
        const activeItemId = pages.length > 0 ? pages[0].itemId : undefined;
        return {
          ...state,
          pages,
          activePageId,
          activeItemId,
        };
      });
    },

    setActivePage(pageId: string) {
      set((state) => ({
        ...state,
        activePageId: pageId,
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
        activeItemId: itemId,
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
  };
});
