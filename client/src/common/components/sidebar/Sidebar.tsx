import { useUserStore } from "@/stores/UserStore";
import { ReactNode } from "react";
import ResizePanel from "@/components/core/ResizePanel";

type Props = {
  children: ReactNode;
};

export default function Sidebar({ children }: Props) {
  const sidebarSize = useUserStore((state) => state.sidebarSize);
  const resizeSidebar = useUserStore((state) => state.resizeSidebar);

  function handleResize(width: number) {
    resizeSidebar(width);
  }

  return (
    <>
      <aside className={`flex flex-col h-full px-5 overflow-y-auto bg-gray-100`} style={{ width: `${sidebarSize}px` }}>
        <div className="flex flex-col justify-between flex-1 mt-6">
          <nav className="space-y-3">{children}</nav>
        </div>
      </aside>
      <ResizePanel width={sidebarSize} minWidth={200} maxWidth={400} onResize={handleResize} />
    </>
  );
}
