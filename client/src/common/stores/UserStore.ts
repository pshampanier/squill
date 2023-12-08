import { User, UserApplicationSpace, UserCollectionItem, UserCollectionLink } from "@/resources/user/user";
import { create } from "zustand";

type UserStoreApplicationSpace = "connection" | "logon" | UserApplicationSpace;

// We can directly use the type UserCollectionLink because because all its properties are readonly.
export type UserStoreCollectionLink = UserCollectionLink;

type State = {
  activeSpace: UserStoreApplicationSpace;
  userCollections: Readonly<UserCollectionItem>[];
  recentlyOpened: UserStoreCollectionLink[];
};

type Actions = {
  reset: () => void;
  setActiveSpace: (activeSpace: UserStoreApplicationSpace) => void;
  setUserCollectionItems: (userCollections: UserCollectionItem[]) => void;
};

export const useUserStore = create<State & Actions>((set) => {
  // User is a mutable object so we are keeping it out of the store.

  return {
    activeSpace: "connection",
    userCollections: [],
    recentlyOpened: [],

    reset() {
      const user = User.current;
      set((state) => ({
        ...state,
        activeSpace: "user",
        userCollections: user.collections.map((c) => c.clone()),
      }));
    },

    setActiveSpace(activeSpace: UserStoreApplicationSpace) {
      set((state) => ({ ...state, activeSpace: activeSpace }));
    },

    setUserCollectionItems(userCollections: UserCollectionItem[]) {
      set((state) => ({ ...state, userCollections: userCollections.map((c) => c.clone()) }));
    },
  };
});
