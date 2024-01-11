import { createContext, useState } from "react";
import { SVGIcon } from "@/utils/types";
import { UserSettings } from "@/resources/user/user-settings";
import { primary as colors } from "@/utils/colors";
import equal from "deep-equal";
import cx from "classix";

import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarItem from "@/components/sidebar/SidebarItem";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import EditIcon from "@/icons/edit.svg?react";
import Button from "@/components/core/Button";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";
import SettingsPageGeneral from "@/components/spaces/settings/SettingsPageGeneral";
import SettingsPageEditor from "@/components/spaces/settings/SettingsPageEditor";

import CloseIcon from "@/icons/close.svg?react";
import SettingsIcon from "@/icons/settings.svg?react";
import { User } from "@/resources/user/user";

type UserSettingsContext = {
  userSettings: Readonly<UserSettings>;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
};

export const SettingsContext = createContext<UserSettingsContext>(null);

type SettingsPageName = "general" | "text-editor";

type SettingsPage = {
  name: SettingsPageName;
  label: string;
  icon: SVGIcon;
};

export default function SettingsSpace() {
  console.debug("Rendering SettingsSpace");

  const [selectedPage, selectPage] = useState<SettingsPageName>("general");
  const [userSettings, setUserSettings] = useState<Readonly<UserSettings>>(User.current.settings.clone());
  const [modified, setModified] = useState<boolean>(false);

  const handleClose = () => {};
  const handleSelectPage = (page: SettingsPageName) => {
    selectPage(page);
    return true;
  };

  const updateUserSettings = (settings: Partial<UserSettings>) => {
    const newSettings = { ...userSettings, ...settings };
    setModified(!equal(newSettings, User.current.settings));

    if (settings.colorScheme) {
      // FIXME: change the color scheme immediately...
    }
    setUserSettings(newSettings);
  };

  const pages: SettingsPage[] = [
    { label: "General", icon: SettingsIcon, name: "general" },
    { label: "Text editor", icon: EditIcon, name: "text-editor" },
  ];

  return (
    <SettingsContext.Provider value={{ userSettings, updateUserSettings }}>
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
          <Main className={colors("background", "text")}>
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-col w-3/4 p-8 min-w-[600px] h-full">
                {selectedPage === "general" && <SettingsPageGeneral />}
                {selectedPage === "text-editor" && <SettingsPageEditor />}
                <div className={cx("flex flex-row justify-end space-x-1 border-t pt-4", colors("border"))}>
                  <Button text="Cancel" type="outline" onClick={handleClose} />
                  <Button text="Apply" type="solid" disabled={!modified} />
                </div>
              </div>
            </div>
          </Main>
        </div>
      </Space>
    </SettingsContext.Provider>
  );
}
