import equal from "deep-equal";
import cx from "classix";
import merge from "lodash/merge";
import { Users } from "@/resources/users";
import { createContext, useState } from "react";
import { DeepPartial, SVGIcon } from "@/utils/types";
import { primary as colors, secondary } from "@/utils/colors";
import { produce } from "immer";
import { NO_ICON } from "@/utils/constants";
import { dispatchCommand } from "@/utils/commands";
import { useUserStore } from "@/stores/UserStore";
import { SettingsPageName, useAppStore } from "@/stores/AppStore";
import { UserSettings } from "@/models/user-settings";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import HistoryIcon from "@/icons/history.svg?react";
import TerminalIcon from "@/icons/terminal.svg?react";
import ConnectionsIcon from "@/icons/plug.svg?react";
import Button from "@/components/core/Button";
import CommandButton from "@/components/core/CommandButton";
import SettingsIcon from "@/icons/settings.svg?react";
import TableIcon from "@/icons/table.svg?react";
import StorageIcon from "@/icons/storage.svg?react";
import PrimarySidebar from "@/components/layout/PrimarySidebar";
import TreeView from "@/components/core/TreeView";
import UserNotificationIconButton from "@/components/user-store/UserNotificationIconButton";
import SettingsPageGeneral from "@/components/spaces/settings/SettingsPageGeneral";
import SettingsPageHistory from "@/components/spaces/settings/SettingsPageHistory";
import SettingsPageTerminal from "@/components/spaces/settings/SettingsPageTerminal";
import SettingsPageTables from "@/components/spaces/settings/SettingsPageTable";
import SettingsPageStorage from "@/components/spaces/settings/SettingsPageStorage";

type UserSettingsContext = {
  userSettings: Readonly<UserSettings>;
  updateUserSettings: (settings: DeepPartial<UserSettings>) => void;
};

export const SettingsContext = createContext<UserSettingsContext>(null);

type SettingsPage = {
  name: SettingsPageName;
  label: string;
  icon: SVGIcon;
  collapsible?: boolean;
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
    if (page === "connections") {
      // TODO: Implement connections settings page.
    } else {
      selectPage(page);
    }
    return true;
  };

  const applySettings = async () => {
    try {
      await Users.saveSettings(userSettings);
      resetSettings();
      dispatchCommand("close");
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
    setUserSettings((userSettings) => {
      const newSettings = produce(userSettings, (draft) => {
        if (settings.nullValues) {
          // Null values display settings is a global setting for now, so we need to update all settings that depend on
          // it.
          settings = {
            tableSettings: { nullValues: settings.nullValues },
            historySettings: { tableSettings: { nullValues: settings.nullValues } },
            ...settings,
          };
        }
        if (settings.tableSettings?.maxLength) {
          // Max length is only accessible from the table settings, so we need to update the history settings as well.
          settings = {
            historySettings: { tableSettings: { maxLength: settings.tableSettings.maxLength } },
            ...settings,
          };
        }
        return merge(draft, settings);
      });
      setModified(!equal(newSettings, Users.current.settings));
      return newSettings;
    });
  };

  const pages: SettingsPage[] = [
    { label: "General", icon: SettingsIcon, name: "general" },
    { label: "Tables", icon: TableIcon, name: "table" },
    { label: "Terminal", icon: TerminalIcon, name: "terminal" },
    { label: "History", icon: HistoryIcon, name: "history" },
    { label: "Connections", icon: ConnectionsIcon, name: "connections", collapsible: true },
    { label: "Storage", icon: StorageIcon, name: "storage" },
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
            <CommandButton command="close" />
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
                    collapsible={page.collapsible}
                  />
                );
              })}
            </TreeView>
          </PrimarySidebar>
          <Main className={colors("background", "text")}>
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-col w-3/4 p-8 min-w-[600px] h-full">
                <div className="w-full flex flex-grow overflow-hidden">
                  {selectedPage === "general" && <SettingsPageGeneral />}
                  {selectedPage === "table" && <SettingsPageTables />}
                  {selectedPage === "history" && <SettingsPageHistory />}
                  {selectedPage === "terminal" && <SettingsPageTerminal />}
                  {selectedPage === "storage" && <SettingsPageStorage />}
                </div>
                <div className={cx("flex flex-row justify-end space-x-1 border-t pt-4", colors("border"))}>
                  <CommandButton text="Cancel" variant="outline" command="close" icon={NO_ICON} />
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
