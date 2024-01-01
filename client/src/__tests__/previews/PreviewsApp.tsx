import Page from "@/components/Page";
import Sidebar from "@/components/sidebar/Sidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import PreviewSidebarItem from "./PreviewSidebarItem";
import KBDPreview from "./core/KBD.preview";
import SpacePreview from "./layouts/Space.preview";
import SidebarPreview from "./sidebar/Sidebar.preview";
import TooltipPreview from "./core/Tooltip.preview";
import { usePreviewsStore } from "./previewsStore";
import SwitchPreview from "./core/Switch.preview";

export function PreviewsApp() {
  const view = usePreviewsStore((state) => state.view);

  return (
    <>
      <Sidebar>
        <SidebarSection label="components">
          <PreviewSidebarItem view="Tooltip" />
          <PreviewSidebarItem view="KBD" />
          <PreviewSidebarItem view="Sidebar" />
          <PreviewSidebarItem view="Switch" />
        </SidebarSection>
        <SidebarSection label="layouts">
          <PreviewSidebarItem view="Space" />
        </SidebarSection>
      </Sidebar>
      <Page className="flex flex-col items-center">
        {view === "KBD" && <KBDPreview />}
        {view === "Sidebar" && <SidebarPreview />}
        {view === "Space" && <SpacePreview />}
        {view === "Switch" && <SwitchPreview />}
        {view === "Tooltip" && <TooltipPreview />}
      </Page>
    </>
  );
}
