import { useUserStore } from "@/stores/UserStore";
import Sidebar from "../sidebar/Sidebar";

type SpaceSidebarProps = {
  children?: React.ReactNode;
};

/**
 * A sidebar for a space that store its size in the UserStore.
 */
export default function SpaceSidebar({ children }: SpaceSidebarProps) {
  const { sidebarWidth, setSidebarWidth } = useUserStore();

  const handleResize = (width: number) => {
    setSidebarWidth(width);
  };

  return (
    <Sidebar width={sidebarWidth} onResize={handleResize}>
      {children}
    </Sidebar>
  );
}
