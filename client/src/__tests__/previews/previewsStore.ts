import { create } from "zustand";

type State = {
  view: string;
};

type Actions = {
  setView: (view: string) => void;
};

export const usePreviewsStore = create<State & Actions>((set) => {
  return {
    view: "Tooltip",

    setView(view: string) {
      set((state) => ({ ...state, view: view }));
    },
  };
});
