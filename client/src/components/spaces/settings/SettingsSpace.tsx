import { createContext, useState } from "react";
import { DeepPartial, SVGIcon } from "@/utils/types";
import { primary as colors } from "@/utils/colors";
import equal from "deep-equal";
import cx from "classix";
import { produce } from "immer";
import merge from "lodash/merge";
import { UserSettings } from "@/models/users";
import Users from "@/resources/users";
import { NO_ICON } from "@/utils/constants";
import { executeCommand } from "@/utils/commands";
import { useUserStore } from "@/stores/UserStore";

import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarItem from "@/components/sidebar/SidebarItem";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import EditIcon from "@/icons/edit.svg?react";
import TableIcon from "@/icons/table.svg?react";
import Button from "@/components/core/Button";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";
import SettingsPageGeneral from "@/components/spaces/settings/SettingsPageGeneral";
import SettingsPageEditor from "@/components/spaces/settings/SettingsPageEditor";
import SettingsPageTableView from "@/components/spaces/settings/SettingsPageTableView";
import SettingsIcon from "@/icons/settings.svg?react";

type UserSettingsContext = {
  userSettings: Readonly<UserSettings>;
  updateUserSettings: (settings: DeepPartial<UserSettings>) => void;
};

export const SettingsContext = createContext<UserSettingsContext>(null);

type SettingsPageName = "general" | "text-editor" | "table-view";

type SettingsPage = {
  name: SettingsPageName;
  label: string;
  icon: SVGIcon;
};

export default function SettingsSpace() {
  console.debug("Rendering SettingsSpace");

  const [selectedPage, selectPage] = useState<SettingsPageName>("general");
  const [userSettings, setUserSettings] = useState<UserSettings>(produce(Users.current.settings, () => {}));
  const [modified, setModified] = useState<boolean>(false);
  const resetSettings = useUserStore((state) => state.resetSettings);

  const handleSelectPage = (page: SettingsPageName) => {
    selectPage(page);
    return true;
  };

  const applySettings = async () => {
    await Users.saveSettings(userSettings);
    resetSettings();
    executeCommand("settings.close");
  };

  const updateUserSettings = (settings: DeepPartial<UserSettings>) => {
    const newSettings = produce(userSettings, (draft) => {
      return merge(draft, settings);
    });
    setModified(!equal(newSettings, Users.current.settings));
    setUserSettings(newSettings);
  };

  const pages: SettingsPage[] = [
    { label: "General", icon: SettingsIcon, name: "general" },
    { label: "Text editor", icon: EditIcon, name: "text-editor" },
    { label: "Tables", icon: TableIcon, name: "table-view" },
  ];

  return (
    <SettingsContext.Provider value={{ userSettings, updateUserSettings }}>
      <Space>
        <Titlebar>
          <Toolbar className="flex-none">
            <CommandButton command="sidebar.toggle" />
          </Toolbar>
          <Titlebar.AppName className="grow" />
          <Toolbar className="flex-none">
            <CommandButton command="settings.close" />
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
                {selectedPage === "table-view" && <SettingsPageTableView />}
                <div className={cx("flex flex-row justify-end space-x-1 border-t pt-4", colors("border"))}>
                  <CommandButton text="Cancel" variant="outline" command="settings.close" icon={NO_ICON} />
                  <Button text="Apply" variant="solid" disabled={!modified} onClick={applySettings} />
                </div>
              </div>
            </div>
          </Main>
        </div>
      </Space>
    </SettingsContext.Provider>
  );
}
