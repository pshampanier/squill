import cx from "classix";
import { useAppStore } from "@/stores/AppStore";
import { MAX_PRIMARY_SIDEBAR_WIDTH, MIN_PRIMARY_SIDEBAR_WIDTH } from "@/utils/constants";
import { ReactNode, useCallback } from "react";
import { registerCommand } from "@/utils/commands";
import { secondary as colors } from "@/utils/colors";
import SidebarIcon from "@/icons/sidebar.svg?react";
import SidePanel from "@/components/core/SidePanel";

registerCommand({
  name: "sidebar.primary.toggle",
  description: "Toggle the sidebar",
  icon: SidebarIcon,
  shortcut: ["Meta+B", "Ctrl+B"],
});

type PrimarySidebarProps = {
  /**
   * The content of the sidebar.
   */
  children: ReactNode;
};

/**
 * The primary sidebar of the application.
 *
 * Linked to the AppStore to manage the sidebar width and visibility.
 */
export default function PrimarySidebar({ children }: PrimarySidebarProps) {
  const visible = useAppStore((state) => state.sidebarVisibility);
  const width = useAppStore((state) => state.sidebarWidth);
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);

  const handleOnResize = useCallback((event: React.PointerEvent<HTMLDivElement>, size: number) => {
    setSidebarWidth(size);
  }, []);

  const classes = cx(
    "flex flex-col flex-none h-full space-y-1 p-4 overflow-y-scroll border-r",
    colors("background", "border"),
  );

  console.debug("Rendering PrimarySidebar", { visible, width });
  return (
    <SidePanel
      className={classes}
      visible={visible}
      variant="left"
      minSize={MIN_PRIMARY_SIDEBAR_WIDTH}
      maxSize={MAX_PRIMARY_SIDEBAR_WIDTH}
      size={width}
      onResize={handleOnResize}
      resizable
    >
      {children}
    </SidePanel>
  );
}
