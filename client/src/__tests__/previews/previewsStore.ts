import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  view: string;
  colorScheme: "light" | "dark";
};

type Actions = {
  setView: (view: string) => void;
  setColorScheme: (colorScheme: "light" | "dark") => void;
};

export const usePreviewsStore = create<State & Actions>()(
  persist(
    (set) => ({
      view: "Alert",
      colorScheme: "light",

      setView(view: string) {
        set((state) => ({ ...state, view: view }));
      },

      setColorScheme(colorScheme: "light" | "dark") {
        set((state) => ({ ...state, colorScheme }));
        applyColorScheme(colorScheme);
      },
    }),
    {
      name: "squill-previews", // name of the item in the local storage (must be unique)
      onRehydrateStorage: () => (state) => applyColorScheme(state.colorScheme),
    }
  )
);

function applyColorScheme(colorScheme: "light" | "dark") {
  document.documentElement.classList.remove(colorScheme === "dark" ? "light" : "dark");
  document.documentElement.classList.add(colorScheme === "dark" ? "dark" : "light");
}
