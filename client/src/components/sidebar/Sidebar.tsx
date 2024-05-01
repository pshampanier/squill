import { cx } from "classix";
import { registerCommand, registerAction, unregisterAction } from "@/utils/commands";
import { ReactNode, useEffect, useRef, useState } from "react";

import ResizePanel from "@/components/core/ResizePanel";
import SidebarIcon from "@/icons/sidebar.svg?react";
import { secondary as colors } from "@/utils/colors";

// Default values for the sidebar width (in pixels)
export const DEFAULT_WIDTH = 256;
export const DEFAULT_MIN_WIDTH = 200;
export const DEFAULT_MAX_WIDTH = 400;

registerCommand(
  {
    name: "sidebar.toggle",
    description: "Toggle the sidebar",
    icon: SidebarIcon,
    shortcut: ["Meta+B", "Ctrl+B"],
  },
  {
    name: "sidebar.rename",
    description: "Rename the selection",
    shortcut: "Enter",
  }
);

type SidebarProps = {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
  children: ReactNode;
};

export default function Sidebar({
  width = DEFAULT_WIDTH,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH,
  className,
  onResize,
  onVisibilityChange,
  children,
}: SidebarProps) {
  const [visible, setVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(width ?? DEFAULT_WIDTH);
  const sidebarRef = useRef(null);

  const handleResize = (width: number) => {
    setSidebarWidth(width);
  };

  const toggleSidebar = () => {
    setVisible(!visible);
    onVisibilityChange && onVisibilityChange(!visible);
  };

  // To have a transition when hiding the sidebar we can use translate-x-0 but the issue is that the sidebar is
  // being translated out of view, but it still occupies space in the document flow, which is why the element to the
  // right of the sidebar is not moving. As a workaround we are also moving the next sibling element of the sidebar
  // changing their margin-left property. Also we need to set the width of the moved sibling element to it's current
  // width (before the translation) otherwise some children element such as the monaco editor will not be resized
  // properly when the sidebar is coming back.
  if (sidebarRef && sidebarRef.current) {
    let nextSibling = sidebarRef.current.nextSibling;
    while (nextSibling) {
      if (nextSibling.nodeType === Node.ELEMENT_NODE) {
        if (!visible) {
          nextSibling.style.width = `${nextSibling.offsetWidth}px`;
        }
        nextSibling.style.marginLeft = visible ? 0 : `-${sidebarWidth}px`;
      }
      nextSibling = nextSibling.nextSibling;
    }
  }

  useEffect(() => {
    registerAction("sidebar.toggle", toggleSidebar);
    return () => {
      unregisterAction("sidebar.toggle", toggleSidebar);
    };
  }, [visible]);

  const asideClasses = cx(
    "flex flex-row flex-none overflow-y-hidden overflow-x-hidden",
    "text-sm",
    "transition-transform duration-500 transform-gpu",
    colors("background", "text"),
    visible ? "translate-x-0" : "-translate-x-full",
    className
  );
  const resizePanelClasses = cx(visible ? "block" : "hidden");

  return (
    <>
      <aside ref={sidebarRef} className={asideClasses} style={{ width: `${sidebarWidth}px` }}>
        <nav className="flex flex-col flex-grow space-y-1.5 mt-4 mb-4 px-5 overflow-y-scroll">{children}</nav>
        <ResizePanel
          className={resizePanelClasses}
          width={sidebarWidth}
          minWidth={minWidth}
          maxWidth={maxWidth}
          onResize={handleResize}
          onResizeEnd={onResize}
        />
      </aside>
    </>
  );
}
