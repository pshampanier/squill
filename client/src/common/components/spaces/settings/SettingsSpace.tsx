import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarItem from "@/components/sidebar/SidebarItem";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";

import CloseIcon from "@/icons/close.svg?react";
import SettingsIcon from "@/icons/settings.svg?react";
import EditIcon from "@/icons/edit.svg?react";
import { useState } from "react";
import { SVGIcon } from "@/utils/types";
import Button from "@/components/core/Button";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";

type SettingsPageName = "general" | "text-editor";

type SettingsPage = {
  name: SettingsPageName;
  label: string;
  icon: SVGIcon;
};

export default function SettingsSpace() {
  console.debug("Rendering SettingsSpace");

  const [selectedPage, selectPage] = useState<SettingsPageName>("general");

  const handleClose = () => {};
  const handleSelectPage = (page: SettingsPageName) => {
    selectPage(page);
    return true;
  };

  const pages: SettingsPage[] = [
    { label: "General", icon: SettingsIcon, name: "general" },
    { label: "Text editor", icon: EditIcon, name: "text-editor" },
  ];

  return (
    <>
      <Space>
        <Titlebar>
          <Toolbar>
            <CommandButton command="sidebar.toggle" />
          </Toolbar>
          <Toolbar>
            <Button icon={CloseIcon} onClick={handleClose} tooltip="Close the settings" />
          </Toolbar>
        </Titlebar>
        <div className="flex flex-row h-[calc(100%-2.75rem)]">
          <SpaceSidebar>
            <SidebarSection label="Settings">
              {pages.map((page) => {
                return (
                  <SidebarItem
                    key={page.name}
                    label={page.label}
                    icon={page.icon}
                    onClick={() => handleSelectPage(page.name)}
                    selected={selectedPage === page.name}
                  />
                );
              })}
            </SidebarSection>
          </SpaceSidebar>
          <Main>
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h1 className="text-xl font-bold">No selection</h1>
              </div>
            </div>
          </Main>
        </div>
      </Space>
    </>
  );
}
