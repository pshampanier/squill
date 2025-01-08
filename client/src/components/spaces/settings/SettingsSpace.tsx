import equal from "deep-equal";
import cx from "classix";
import merge from "lodash/merge";
import { Users } from "@/resources/users";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DeepPartial, SVGIcon } from "@/utils/types";
import { primary as colors, secondary } from "@/utils/colors";
import { produce } from "immer";
import { NO_ICON } from "@/utils/constants";
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
import TreeView, { TreeViewStatus } from "@/components/core/TreeView";
import UserNotificationIconButton from "@/components/user-store/UserNotificationIconButton";
import SettingsPageGeneral from "@/components/spaces/settings/SettingsPageGeneral";
import SettingsPageHistory from "@/components/spaces/settings/SettingsPageHistory";
import SettingsPageTerminal from "@/components/spaces/settings/SettingsPageTerminal";
import SettingsPageTables from "@/components/spaces/settings/SettingsPageTable";
import SettingsPageStorage from "@/components/spaces/settings/SettingsPageStorage";
import SettingsPageCatalogItem from "@/components/spaces/settings/SettingsPageCatalogItem";
import { FormContext, FormProvider } from "@/stores/FormContext";
import Overlay from "@/components/Overlay";
import Spinner from "@/components/core/Spinner";

type UserSettingsContext = {
  userSettings: Readonly<UserSettings>;
  updateUserSettings: (settings: DeepPartial<UserSettings>) => void;
};

export const SettingsContext = createContext<UserSettingsContext>(null);

type SettingsPage = {
  name: SettingsPageName;
  label: string;
  icon: SVGIcon;
  catalogId?: string;
};

export default function SettingsSpace() {
  console.debug("Rendering SettingsSpace");
  return (
    <FormProvider>
      <InnerSettingsSpace />
    </FormProvider>
  );
}

function InnerSettingsSpace() {
  const closeSettings = useAppStore((state) => state.closeSettings);
  const selectedPage = useAppStore((state) => state.settings.selectedPage);
  const selectPage = useAppStore((state) => state.selectSettingsPage);

  const [userSettings, setUserSettings] = useState<UserSettings>(produce(Users.current.settings, () => {}));
  const resetSettings = useUserStore((state) => state.resetSettings);
  const addNotification = useUserStore((state) => state.addNotification);
  const getDefaultCatalogCollection = useUserStore((state) => state.getDefaultCatalogCollection);

  const catalog = useUserStore((state) => state.catalog);
  const settingsResources = useAppStore((state) => state.settings.resources);

  const updateCatalog = useUserStore((state) => state.updateCatalog);

  const { submit, validate, status: status } = useContext(FormContext);

  const applySettings = useCallback(
    () =>
      submit(async () => {
        try {
          await Users.saveSettings(userSettings);
          await Promise.all(
            settingsResources.map(async (resource) => {
              await updateCatalog(resource);
            }),
          );
          resetSettings();
          closeSettings();
        } catch (error: unknown) {
          addNotification({
            id: "apply_settings_error",
            variant: "error",
            message: "Failed to save settings",
            description: error,
          });
        }
      }),
    [userSettings, catalog, settingsResources],
  );

  //
  // Page change handler
  //
  const handleSelectPage = async (page: SettingsPageName) => {
    // We can only change the page if the form is valid.
    (await validate()) && selectPage(page);
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
      return newSettings;
    });
  };

  // Modified state of the settings.
  const modified = useMemo(() => {
    if (!equal(userSettings, Users.current.settings)) {
      // The user settings are modified.
      return true;
    } else if (settingsResources.some((resource) => !equal(resource, catalog.get(resource.id)?.resource))) {
      // The catalog resources are modified
      return true;
    } else {
      return false;
    }
  }, [userSettings, catalog, settingsResources]);

  const pages: SettingsPage[] = [
    { label: "General", icon: SettingsIcon, name: "general" },
    { label: "Tables", icon: TableIcon, name: "table" },
    { label: "Terminal", icon: TerminalIcon, name: "terminal" },
    { label: "History", icon: HistoryIcon, name: "history" },
    {
      label: "Connections",
      icon: ConnectionsIcon,
      name: "connections",
      catalogId: getDefaultCatalogCollection("connection")?.id,
    },
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
                  <>
                    {page.catalogId ? (
                      <CatalogTreeViewItem key={page.name} catalogId={page.catalogId} onSelect={handleSelectPage} />
                    ) : (
                      <TreeView.Item
                        key={page.name}
                        label={page.label}
                        icon={page.icon}
                        onClick={() => handleSelectPage(page.name)}
                        selected={selectedPage === page.name}
                      />
                    )}
                  </>
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
                  {selectedPage.startsWith("catalog:") && <SettingsPageCatalogItem />}
                </div>
                <div className={cx("flex flex-row justify-end space-x-1 border-t pt-4", colors("border"))}>
                  <CommandButton text="Cancel" variant="outline" command="close" icon={NO_ICON} />
                  <Button text="Apply" variant="solid" disabled={!modified} onClick={applySettings} />
                </div>
              </div>
            </div>
          </Main>
        </div>
        {(status === "submitting" || status === "validating") && (
          <Overlay delay={100} position="absolute">
            <Spinner size="lg" />
            <p className="text-xs font-semibold">Operation in progress...</p>
          </Overlay>
        )}
      </Space>
    </SettingsContext.Provider>
  );
}

type CatalogTreeViewItemProps = {
  catalogId: string;
  onSelect?: (pageName: string) => void;
};

function CatalogTreeViewItem({ catalogId, onSelect }: CatalogTreeViewItemProps) {
  // Actions from the user store.
  const getCatalogItem = useUserStore((state) => state.getCatalogItem);
  const loadCatalogChildren = useUserStore((state) => state.loadCatalogChildren);

  // States from the app store.
  const selectedPage = useAppStore((state) => state.settings.selectedPage);

  const [status, setStatus] = useState<TreeViewStatus>("closed");
  const catalogItem = useUserStore((state) => state.getCatalogItem(catalogId));

  // The catalog item currently being displayed (if any).
  const selectedCatalogItem = useUserStore((state) =>
    selectedPage.startsWith("catalog:") ? state.getCatalogItem(selectedPage.substring(8)) : null,
  );

  // If the selected page is a catalog item and the parent of the selected catalog item is the current catalog item,
  // then we need to load the children of the current catalog item and set the status to "open".
  useEffect(() => {
    if (selectedCatalogItem?.parentId === catalogId && catalogItem) {
      loadCatalogChildren(catalogItem?.id);
      setStatus("open");
    }
  }, [catalogId, selectedCatalogItem, catalogItem]);

  // The page name is the catalog item id prefixed with "catalog:".
  const pageName = `catalog:${catalogItem.id}`;

  const handleToggle = useCallback(() => {
    const catalogItem = getCatalogItem(catalogId);
    setStatus((previousStatus) => {
      if (previousStatus === "closed" && !catalogItem.children) {
        // Load the children of the catalog item.
        loadCatalogChildren(catalogItem.id);
        return "open";
      } else if (previousStatus === "closed") {
        return "open";
      } else {
        return "closed";
      }
    });
  }, [catalogId]);

  const handleClick = useCallback(() => {
    if (catalogItem && catalogItem.type !== "collection") {
      onSelect(pageName);
    }
  }, [catalogItem]);

  const viewStatus: TreeViewStatus = useMemo(() => {
    if (status === "closed") {
      return "closed";
    } else if (status === "open" && catalogItem.children) {
      return "open";
    } else if (catalogItem.status === "error") {
      return "error";
    } else {
      return "loading";
    }
  }, [catalogItem, status]);

  return (
    <TreeView.Item
      label={catalogItem.name}
      icon={catalogItem.icon}
      collapsible={catalogItem.type === "collection"}
      status={viewStatus}
      selected={selectedPage === pageName}
      onToggle={handleToggle}
      onClick={handleClick}
    >
      {catalogItem.children?.map((child) => <CatalogTreeViewItem key={child} catalogId={child} onSelect={onSelect} />)}
    </TreeView.Item>
  );
}
