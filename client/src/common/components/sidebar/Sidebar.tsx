import { useUserStore } from "@/stores/UserStore";
import { ReactNode, useRef, useState } from "react";
import ResizePanel from "@/components/core/ResizePanel";
import { useClasses } from "@/utils/classes";

type SidebarProps = {
  size?: number;
  className?: string;
  children: ReactNode;
};

export default function Sidebar({ size, className, children }: SidebarProps) {
  // const sidebarSize = useUserStore((state) => state.sidebarSize);
  const resizeSidebar = useUserStore((state) => state.resizeSidebar);

  const [sidebarSize, setSidebarSize] = useState(size ?? 256);
  const asideElement = useRef(null);

  function handleResize(width: number) {
    // asideElement.current.style.width = `${width}px`;
    setSidebarSize(width);
    // resizeSidebar(width);
  }

  const classes = useClasses([
    "flex flex-col flex-none px-5 overflow-y-visible overflow-x-scroll bg-gray-100",
    className,
  ]);
  return (
    <>
      <aside ref={asideElement} className={classes} style={{ width: `${sidebarSize}px` }}>
        <nav className="flex flex-col w-full justify-between space-y-1.5 mt-4 mb-4">{children}</nav>
      </aside>
      <ResizePanel width={sidebarSize} minWidth={200} maxWidth={400} onResize={handleResize} />
    </>
  );
}
