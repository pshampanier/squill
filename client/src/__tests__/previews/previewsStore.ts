import { create } from "zustand";

type State = {
  view: string;
};

type Actions = {
  setView: (view: string) => void;
};

export const usePreviewsStore = create<State & Actions>((set) => {
  return {
    view: "Switch",

    setView(view: string) {
      set((state) => ({ ...state, view: view }));
    },
  };
});
