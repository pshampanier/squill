// TODO:
// TODO: NO LONGER BEING USED
// TODO:
import Sidebar from "@/components/sidebar/Sidebar";
import { useAppStore } from "@/stores/AppStore";

type SpaceSidebarProps = {
  children?: React.ReactNode;
};

/**
 * A sidebar for a space that store its size in the AppStore.
 */
export default function SpaceSidebar({ children }: SpaceSidebarProps) {
  const sidebarWidth = useAppStore((state) => state.sidebarWidth);
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);

  const handleResize = (width: number) => {
    setSidebarWidth(width);
  };

  return (
    <Sidebar width={sidebarWidth} onResize={handleResize}>
      {children}
    </Sidebar>
  );
}
