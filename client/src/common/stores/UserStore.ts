import { User, UserApplicationSpace, UserCollectionItem, UserCollectionLink } from "@/resources/user/user";
import { UserSettings } from "@/resources/user/user-settings";
import { create } from "zustand";

type UserStoreApplicationSpace = "connection" | "logon" | UserApplicationSpace;

// We can directly use the type UserCollectionLink because because all its properties are readonly.
export type UserStoreCollectionLink = UserCollectionLink;

type State = {
  /**
   * The current color scheme of the application.
   * This value is calculated based on the user settings & the system preferences. It's not the same as the state
   * settings.colorScheme which can also be "auto". Any component that need to explicitly use the color scheme rather
   * than relying on the CSS classes should use this value.
   */
  colorScheme: "light" | "dark";
  activeSpace: UserStoreApplicationSpace;

  settings: Readonly<UserSettings>;
  collections: Readonly<UserCollectionItem>[];
  recentlyOpened: UserStoreCollectionLink[];
};

type Actions = {
  reset: () => void;
  setActiveSpace: (activeSpace: UserStoreApplicationSpace) => void;
  setCollectionItems: (collections: UserCollectionItem[]) => void;
  setColorScheme: (colorScheme: "light" | "dark") => void;
};

export const useUserStore = create<State & Actions>((set) => {
  // User is a mutable object so we are keeping it out of the store.

  return {
    colorScheme: UserSettings.calculateColorScheme("auto"),
    activeSpace: "connection",
    settings: null,
    collections: [],
    recentlyOpened: [],

    reset() {
      const user = User.current;
      set((state) => ({
        ...state,
        colorScheme: UserSettings.calculateColorScheme(user.settings.colorScheme),
        activeSpace: "user",
        settings: user.settings.clone(),
        collections: user.collections.map((c) => c.clone()),
      }));
    },

    setActiveSpace(activeSpace: UserStoreApplicationSpace) {
      set((state) => ({ ...state, activeSpace: activeSpace }));
    },

    setCollectionItems(collections: UserCollectionItem[]) {
      set((state) => ({ ...state, collections: collections.map((c) => c.clone()) }));
    },

    setColorScheme(colorScheme: "light" | "dark") {
      set((state) => ({ ...state, colorScheme: colorScheme }));
    },
  };
});
