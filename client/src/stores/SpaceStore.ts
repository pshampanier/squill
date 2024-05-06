import { create } from "zustand";

export type State = {
  /**
   * The id of the active item.
   *
   * - This is the item that is currently selected in the tree, multiple pages can be open for the same item so it's
   *   important to track the active item separately from the active page.
   * - This id does not necessarily correspond to the id of the active page, for example if a folder or an environment
   *   is selected in the sidebar, the active id will be id of the folder or the environment.
   */
  activeId?: string;
};

export type Actions = {
  /**
   * Reset the store to its initial state.
   */
  reset: () => void;
};

const initialState: State = {
  activeId: undefined,
};

export const useSpaceStore = create<State & Actions>((set) => {
  return {
    ...initialState,
    reset() {
      set(() => ({
        ...initialState,
      }));
    },
  };
});
