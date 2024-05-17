import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  view: string;
};

type Actions = {
  setView: (view: string) => void;
};

export const usePreviewsStore = create<State & Actions>()(
  persist(
    (set) => ({
      view: "Alert",

      setView(view: string) {
        set((state) => ({ ...state, view: view }));
      },
    }),
    {
      name: "squill-previews", // name of the item in the local storage (must be unique)
    }
  )
);
