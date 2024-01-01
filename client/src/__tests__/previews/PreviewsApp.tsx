import Page from "@/components/Page";
import Sidebar from "@/components/sidebar/Sidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import PreviewSidebarItem from "./PreviewSidebarItem";
import KBDPreview from "./core/KBD.preview";
import SpacePreview from "./layouts/Space.preview";
import SidebarPreview from "./sidebar/Sidebar.preview";
import TooltipPreview from "./core/Tooltip.preview";
import { usePreviewsStore } from "./previewsStore";

export function PreviewsApp() {
  const view = usePreviewsStore((state) => state.view);

  return (
    <>
      <Sidebar>
        <SidebarSection label="components">
          <PreviewSidebarItem view="Tooltip" />
          <PreviewSidebarItem view="KBD" />
          <PreviewSidebarItem view="Sidebar" />
        </SidebarSection>
        <SidebarSection label="layouts">
          <PreviewSidebarItem view="Space" />
        </SidebarSection>
      </Sidebar>
      <Page className="items-center">
        {view === "KBD" && <KBDPreview />}
        {view === "Space" && <SpacePreview />}
        {view === "Sidebar" && <SidebarPreview />}
        {view === "Tooltip" && <TooltipPreview />}
      </Page>
    </>
  );
}
