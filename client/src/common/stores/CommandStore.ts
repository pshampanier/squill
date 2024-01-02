import { create } from "zustand";
import { Command } from "@/utils/commands";

type State = {
  sidebarCommands: Command[];
  titlebarCommands: Command[];
};

type Actions = {
  registerCommand: (command: Command) => void;
};

export const useCommandStore = create<State & Actions>((set) => {
  return {
    sidebarCommands: [],
    titlebarCommands: [],

    registerCommand(command: Command) {
      set((state) => ({
        ...state,
        sidebarCommands: [...state.sidebarCommands, command],
        titlebarCommands: [...state.titlebarCommands, command],
      }));
    },
  };
});
