import equal from "deep-equal";
import cx from "classix";
import merge from "lodash/merge";
import { Users } from "@/resources/users";
import { createContext, useState } from "react";
import { DeepPartial, SVGIcon } from "@/utils/types";
import { primary as colors, secondary } from "@/utils/colors";
import { produce } from "immer";
import { UserSettings } from "@/models/users";
import { NO_ICON } from "@/utils/constants";
import { dispatchCommand } from "@/utils/commands";
import { useUserStore } from "@/stores/UserStore";
import { SettingsPageName, useAppStore } from "@/stores/AppStore";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import EditIcon from "@/icons/edit.svg?react";
import TableIcon from "@/icons/table.svg?react";
import Button from "@/components/core/Button";
import CommandButton from "@/components/core/CommandButton";
import SettingsPageGeneral from "@/components/spaces/settings/SettingsPageGeneral";
import SettingsPageEditor from "@/components/spaces/settings/SettingsPageEditor";
import SettingsPageTableView from "@/components/spaces/settings/SettingsPageTableView";
import SettingsIcon from "@/icons/settings.svg?react";
import PrimarySidebar from "@/components/sidebar/PrimarySidebar";
import TreeView from "@/components/core/TreeView";
import UserNotificationIconButton from "@/components/user-store/UserNotificationIconButton";

type UserSettingsContext = {
  userSettings: Readonly<UserSettings>;
  updateUserSettings: (settings: DeepPartial<UserSettings>) => void;
};

export const SettingsContext = createContext<UserSettingsContext>(null);

type SettingsPage = {
  name: SettingsPageName;
  label: string;
  icon: SVGIcon;
};

export default function SettingsSpace() {
  console.debug("Rendering SettingsSpace");

  const selectedPage = useAppStore((state) => state.settings.selectedPage);
  const selectPage = useAppStore((state) => state.selectSettingsPage);

  const [userSettings, setUserSettings] = useState<UserSettings>(produce(Users.current.settings, () => {}));
  const [modified, setModified] = useState<boolean>(false);
  const resetSettings = useUserStore((state) => state.resetSettings);
  const addNotification = useUserStore((state) => state.addNotification);

  const handleSelectPage = (page: SettingsPageName) => {
    selectPage(page);
    return true;
  };

  const applySettings = async () => {
    try {
      await Users.saveSettings(userSettings);
      resetSettings();
      dispatchCommand("settings.close");
    } catch (error: unknown) {
      addNotification({
        id: crypto.randomUUID(),
        variant: "error",
        message: "Failed to save settings",
        description: error,
        autoDismiss: true,
      });
    }
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
            <CommandButton command="sidebar.primary.toggle" />
          </Toolbar>
          <Titlebar.AppName className="grow" />
          <Toolbar className="flex-none">
            <UserNotificationIconButton />
            <CommandButton command="settings.close" />
          </Toolbar>
        </Titlebar>
        <div className="flex flex-row h-[calc(100%-2.75rem)]">
          <PrimarySidebar>
            <TreeView colors={secondary}>
              {pages.map((page) => {
                return (
                  <TreeView.Item
                    key={page.name}
                    label={page.label}
                    icon={page.icon}
                    onClick={() => handleSelectPage(page.name)}
                    selected={selectedPage === page.name}
                  />
                );
              })}
            </TreeView>
          </PrimarySidebar>
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
