/**
 * The global store of the application.
 */
import { create } from "zustand";
import { DEFAULT_WIDTH as DEFAULT_SIDEBAR_WIDTH } from "@/components/sidebar/Sidebar";
import { calculateColorScheme } from "@/utils/colors";
import { Editor } from "@/resources/editors";

type ApplicationSpace = "connection" | "logon" | "user" | "workspace";

type Page = {
  readonly id: string;
  readonly itemId: string;
  readonly path: string;
  readonly title: string;
  readonly editor: Editor;
  readonly modified: boolean;
  readonly readOnly: boolean;
};

type State = {
  /**
   * The current color scheme of the application.
   * This value is calculated based on the user settings & the system preferences. It's not the same as the state
   * settings.colorScheme which can also be "auto". Any component that need to explicitly use the color scheme rather
   * than relying on the CSS classes should use this value.
   */
  colorScheme: "light" | "dark";

  /**
   * The size of the sidebar in pixels.
   */
  sidebarWidth: number;

  /**
   * The current active space.
   */
  activeSpace: ApplicationSpace;

  /**
   * The id of the active page.
   */
  activePageId?: string;

  /**
   * The pages that are currently open.
   */
  pages: Page[];
};

type Actions = {
  setSidebarWidth: (width: number) => void;
  setActiveSpace: (activeSpace: ApplicationSpace) => void;
  setColorScheme: (colorScheme: "light" | "dark") => void;
};

/**
 * The global store of the application.
 */
export const useAppStore = create<State & Actions>((set) => {
  return {
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    colorScheme: calculateColorScheme("auto"),
    activeSpace: "connection",
    pages: [],
    activePageId: undefined,

    setSidebarWidth(width: number) {
      set((state) => ({ ...state, sidebarWidth: width }));
    },

    setActiveSpace(activeSpace: ApplicationSpace) {
      set((state) => ({ ...state, activeSpace: activeSpace }));
    },

    setColorScheme(colorScheme: "light" | "dark") {
      set((state) => ({ ...state, colorScheme: colorScheme }));
    },
  };
});
