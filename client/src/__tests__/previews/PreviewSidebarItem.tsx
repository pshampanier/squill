import SidebarItem from "@/components/sidebar/SidebarItem";
import { usePreviewsStore } from "./previewsStore";

type PreviewSidebarItemProps = {
  view: string;
};

export default function PreviewSidebarItem({ view }: PreviewSidebarItemProps) {
  const currentView = usePreviewsStore((state) => state.view);
  const setView = usePreviewsStore((state) => state.setView);

  const handleOnClick = () => {
    setView(view);
    return true;
  };

  return (
    <SidebarItem
      onClick={() => {
        handleOnClick();
        return true;
      }}
      label={view}
      selected={currentView === view}
    />
  );
}
