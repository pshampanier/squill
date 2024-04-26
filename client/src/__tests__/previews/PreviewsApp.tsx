import Page from "@/components/Page";
import Sidebar from "@/components/sidebar/Sidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import PreviewSidebarItem from "./PreviewSidebarItem";
import KbdPreview from "./core/Kbd.preview";
import SpacePreview from "./layouts/Space.preview";
import ColorsPreview from "./layouts/Colors.preview";
import SidebarPreview from "./sidebar/Sidebar.preview";
import TooltipPreview from "./core/Tooltip.preview";
import { usePreviewsStore } from "./previewsStore";
import SwitchPreview from "./core/Switch.preview";
import ButtonGroupPreview from "./core/ButtonGroup.preview";
import ButtonsPreview from "./core/Buttons.preview";
import ButtonGroup from "@/components/core/ButtonGroup";

import ThemeLightIcon from "@/icons/theme-light.svg?react";
import ThemeDarkIcon from "@/icons/theme-dark.svg?react";
import MenuPreview from "./core/Menu.preview";
import DropdownPreview from "./core/Dropdown.preview";
import StepperPreview from "./layouts/Stepper.preview";
import InputsPreview from "./core/Inputs.preview";
import RadioPreview from "./core/Radio.preview";
import ModalPreview from "./layouts/Modal.preview";
import AlertPreview from "./core/Alert.preview";

function applyColorScheme(colorScheme: "light" | "dark") {
  document.documentElement.classList.remove(colorScheme === "dark" ? "light" : "dark");
  document.documentElement.classList.add(colorScheme === "dark" ? "dark" : "light");
}

export function PreviewsApp() {
  const defaultColorScheme = "light";
  const view = usePreviewsStore((state) => state.view);

  return (
    <>
      <Sidebar>
        <SidebarSection label="components">
          <PreviewSidebarItem view="Alert" />
          <PreviewSidebarItem view="ButtonGroup" />
          <PreviewSidebarItem view="Buttons" />
          <PreviewSidebarItem view="Dropdown" />
          <PreviewSidebarItem view="Input" />
          <PreviewSidebarItem view="Tooltip" />
          <PreviewSidebarItem view="Kbd" />
          <PreviewSidebarItem view="Menu" />
          <PreviewSidebarItem view="Radio" />
          <PreviewSidebarItem view="Sidebar" />
          <PreviewSidebarItem view="Switch" />
        </SidebarSection>
        <SidebarSection label="layouts">
          <PreviewSidebarItem view="Colors" />
          <PreviewSidebarItem view="Modal" />
          <PreviewSidebarItem view="Space" />
          <PreviewSidebarItem view="Stepper" />
        </SidebarSection>
      </Sidebar>
      <Page className="flex flex-col items-center text-sm text-gray-600 dark:text-gray-400 p-2 overflow-y-scroll">
        <header className="flex grid-flow-row w-full mb-4 justify-end">
          <ButtonGroup defaultValue={defaultColorScheme} size="xs" onChange={applyColorScheme}>
            <ButtonGroup.Item name="light" icon={ThemeLightIcon} />
            <ButtonGroup.Item name="dark" icon={ThemeDarkIcon} />
          </ButtonGroup>
        </header>
        <div className="flex flex-col space-y-10 w-3/4 h-full py-2">
          {view === "Alert" && <AlertPreview />}
          {view === "ButtonGroup" && <ButtonGroupPreview />}
          {view === "Buttons" && <ButtonsPreview />}
          {view === "Dropdown" && <DropdownPreview />}
          {view === "Input" && <InputsPreview />}
          {view === "Colors" && <ColorsPreview />}
          {view === "Kbd" && <KbdPreview />}
          {view === "Menu" && <MenuPreview />}
          {view === "Modal" && <ModalPreview />}
          {view === "Radio" && <RadioPreview />}
          {view === "Sidebar" && <SidebarPreview />}
          {view === "Space" && <SpacePreview />}
          {view === "Stepper" && <StepperPreview />}
          {view === "Switch" && <SwitchPreview />}
          {view === "Tooltip" && <TooltipPreview />}
        </div>
      </Page>
    </>
  );
}
