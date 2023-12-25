import Page from "@/components/Page";
import Sidebar from "@/components/sidebar/Sidebar";
import PreviewSidebarItem from "./PreviewSidebarItem";
import { useContext, useState } from "react";
import KeyboardShortcutPreview from "./core/KeyboardShortcut.preview";
import SidebarSection from "@/components/sidebar/SidebarSection";
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
          <PreviewSidebarItem view="KeyboardShortcut" />
          <PreviewSidebarItem view="Sidebar" />
        </SidebarSection>
        <SidebarSection label="layouts">
          <PreviewSidebarItem view="Space" />
        </SidebarSection>
      </Sidebar>
      <Page className="items-center">
        {view === "KeyboardShortcut" && <KeyboardShortcutPreview />}
        {view === "Space" && <SpacePreview />}
        {view === "Sidebar" && <SidebarPreview />}
        {view === "Tooltip" && <TooltipPreview />}
      </Page>
    </>
  );
}
