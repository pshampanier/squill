import { usePreviewsStore } from "./previewsStore";
import { primary as colors } from "@/utils/colors";
import Sidebar from "@/components/sidebar/Sidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import PreviewSidebarItem from "./PreviewSidebarItem";
import KbdPreview from "./core/Kbd.preview";
import SpacePreview from "./layouts/Space.preview";
import ColorsPreview from "./layouts/Colors.preview";
import SidebarPreview from "./sidebar/Sidebar.preview";
import TooltipPreview from "./core/Tooltip.preview";
import QueryInputPreview from "./query/QueryInput.preview";
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
import QueryOutputPreview from "./query/QueryOutput.preview";
import SyntaxHighlightingPreview from "./layouts/SyntaxHighlighting.preview";
import CodePreview from "./core/Code.preview";
import TableViewPreview from "./dataset/table-view.preview";
import TimelinePreview from "./core/Timeline.preview";
import QueryTerminalPreview from "./query/QueryTerminal.preview";
import QueryPromptPreview from "./query/QueryPrompt.preview";
import LoadingContainerPreview from "./core/LoadingContainer.preview";
import FileInputPreview from "./core/FileInput.preview";
import NotificationPreview from "./core/Notifications.preview";
import TreeViewPreview from "./core/TreeView.preview";
import SidePanelPreview from "./core/SidePanel.preview";
import QueryHistoryPreview from "./query/QueryHistoryPreview";
import ToolbarPreview from "./core/Toolbar.preview";
import cx from "classix";
import StackedBarChartPreview from "./core/StackedBarChart.preview";

export function PreviewsApp() {
  const colorScheme = usePreviewsStore((state) => state.colorScheme);
  const view = usePreviewsStore((state) => state.view);
  const setColorScheme = usePreviewsStore((state) => state.setColorScheme);

  return (
    <>
      <Sidebar>
        <SidebarSection label="components">
          <PreviewSidebarItem view="Alert" />
          <PreviewSidebarItem view="ButtonGroup" />
          <PreviewSidebarItem view="Buttons" />
          <PreviewSidebarItem view="Code" />
          <PreviewSidebarItem view="Dropdown" />
          <PreviewSidebarItem view="FileInput" />
          <PreviewSidebarItem view="QueryInput" />
          <PreviewSidebarItem view="QueryOutput" />
          <PreviewSidebarItem view="QueryPrompt" />
          <PreviewSidebarItem view="QueryTerminal" />
          <PreviewSidebarItem view="QueryHistory" />
          <PreviewSidebarItem view="Input" />
          <PreviewSidebarItem view="Tooltip" />
          <PreviewSidebarItem view="Kbd" />
          <PreviewSidebarItem view="LoadingContainer" />
          <PreviewSidebarItem view="Menu" />
          <PreviewSidebarItem view="Radio" />
          <PreviewSidebarItem view="Sidebar" />
          <PreviewSidebarItem view="SidePanel" />
          <PreviewSidebarItem view="TableView" />
          <PreviewSidebarItem view="Timeline" />
          <PreviewSidebarItem view="Toolbar" />
          <PreviewSidebarItem view="TreeView" />
          <PreviewSidebarItem view="Notification" />
          <PreviewSidebarItem view="StackedBarChart" />
          <PreviewSidebarItem view="Switch" />
        </SidebarSection>
        <SidebarSection label="layouts">
          <PreviewSidebarItem view="Colors" />
          <PreviewSidebarItem view="Modal" />
          <PreviewSidebarItem view="Space" />
          <PreviewSidebarItem view="Stepper" />
          <PreviewSidebarItem view="Syntax Highlighting" />
        </SidebarSection>
      </Sidebar>
      <div
        className={cx(
          "flex flex-col items-center text-sm text-gray-600 dark:text-gray-400 p-2 overflow-y-scroll w-full",
          colors("background"),
        )}
      >
        <header className="flex grid-flow-row w-full mb-4 justify-end">
          <ButtonGroup defaultValue={colorScheme} size="xs" onChange={setColorScheme}>
            <ButtonGroup.Item name="light" icon={ThemeLightIcon} />
            <ButtonGroup.Item name="dark" icon={ThemeDarkIcon} />
          </ButtonGroup>
        </header>
        <div className={"flex flex-col space-y-10 w-3/4 h-full py-2"}>
          {view === "Alert" && <AlertPreview />}
          {view === "ButtonGroup" && <ButtonGroupPreview />}
          {view === "Buttons" && <ButtonsPreview />}
          {view === "Code" && <CodePreview />}
          {view === "Dropdown" && <DropdownPreview />}
          {view === "FileInput" && <FileInputPreview />}
          {view === "QueryHistory" && <QueryHistoryPreview />}
          {view === "QueryInput" && <QueryInputPreview />}
          {view === "QueryOutput" && <QueryOutputPreview />}
          {view === "QueryPrompt" && <QueryPromptPreview />}
          {view === "QueryTerminal" && <QueryTerminalPreview />}
          {view === "Input" && <InputsPreview />}
          {view === "Colors" && <ColorsPreview />}
          {view === "Kbd" && <KbdPreview />}
          {view === "LoadingContainer" && <LoadingContainerPreview />}
          {view === "Menu" && <MenuPreview />}
          {view === "Modal" && <ModalPreview />}
          {view === "Radio" && <RadioPreview />}
          {view === "Sidebar" && <SidebarPreview />}
          {view === "SidePanel" && <SidePanelPreview />}
          {view === "Space" && <SpacePreview />}
          {view === "Stepper" && <StepperPreview />}
          {view === "Syntax Highlighting" && <SyntaxHighlightingPreview />}
          {view === "Switch" && <SwitchPreview />}
          {view === "TableView" && <TableViewPreview />}
          {view === "Timeline" && <TimelinePreview />}
          {view === "Toolbar" && <ToolbarPreview />}
          {view === "TreeView" && <TreeViewPreview />}
          {view === "Notification" && <NotificationPreview />}
          {view === "Tooltip" && <TooltipPreview />}
          {view === "StackedBarChart" && <StackedBarChartPreview />}
        </div>
      </div>
    </>
  );
}
