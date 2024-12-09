import Titlebar from "@/components/titlebar/Titlebar";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import PrimarySidebar from "@/components/layout/PrimarySidebar";
import CommandButton from "@/components/core/CommandButton";
import PagesTabs from "@/components/titlebar/PagesTabs";
import Editor from "@/components/Editor";
import UserNotificationIconButton from "@/components/user-store/UserNotificationIconButton";
import CatalogView from "@/components/views/catalog/CatalogView";
import NewConnectionDialog from "@/components/dialogs/NewConnectionDialog";
import { useCallback, useRef, useState } from "react";
import { useCommand } from "@/hooks/use-commands";
import { CommandEvent, registerCommand } from "@/utils/commands";
import { useUserStore } from "@/stores/UserStore";
import { Connection } from "@/models/connections";
import { useAppStore } from "@/stores/AppStore";
import { BLANK_PAGE_ITEM_ID } from "@/utils/constants";

registerCommand(
  {
    name: "connection.new",
    description: "New Connection",
    shortcut: "Ctrl+Alt+C",
  },
  {
    name: "environment.new",
    description: "New Environment",
    shortcut: "Ctrl+Alt+E",
  },
  {
    name: "tab.new",
    description: "New Tab",
    shortcut: [
      ["Meta+N", "Ctrl+N"], // Desktop
      ["Alt+Meta+N", "Ctrl+Alt+N"], // Web
    ],
  },
  {
    name: "tab.close",
    description: "Close Tab",
    shortcut: [
      ["Meta+W", "Ctrl+W"], // Desktop
      ["Alt+Shift+Meta+N", "Ctrl+Alt+N"], // Web
    ],
  },
);

export default function UserSpace(props: SpaceProps) {
  const refSpace = useRef<HTMLDivElement>(null);
  const [Dialog, setDialog] = useState<React.ReactNode>(null);
  const getDefaultCatalogCollection = useUserStore((state) => state.getDefaultCatalogCollection);
  const addPage = useAppStore((state) => state.addPage);
  const closePage = useAppStore((state) => state.closePage);

  const handleCommand = useCallback((event: CommandEvent) => {
    switch (event.detail.name) {
      /**
       * Opening the dialog to create a new connection.
       */
      case "connection.new": {
        /**
         * The dialog is closed using the cancel button.
         */
        const handleCancel = () => {
          setDialog(null);
        };

        /**
         * The dialog is closed using the close button.
         */
        const handleClose = (connection: Connection) => {
          console.log("New connection", connection);
          setDialog(null);
        };

        // FIXME: This should be the current active item in the sidebar if compatible with the resource type.
        const parentId = getDefaultCatalogCollection("connection")?.id;
        setDialog(<NewConnectionDialog parentId={parentId} onCancel={handleCancel} onClose={handleClose} />);
        break;
      }

      /**
       * Opening a new tab.
       */
      case "tab.new": {
        addPage(BLANK_PAGE_ITEM_ID);
        break;
      }

      /**
       * Closing the active tab.
       */
      case "tab.close": {
        closePage(useAppStore.getState().activePageId);
        break;
      }

      default:
        return;
    }
    event.stopPropagation(); // The command event has been handled
  }, []);

  useCommand({ ref: refSpace, onCommand: handleCommand });

  console.debug("Rendering UserSpace");
  return (
    <>
      <Space {...props} forwardRef={refSpace}>
        <Titlebar>
          <Toolbar>
            <CommandButton command="sidebar.primary.toggle" />
          </Toolbar>
          <Titlebar.AppName />
          <PagesTabs />
          <Toolbar>
            <UserNotificationIconButton />
            <CommandButton command="settings.open" />
          </Toolbar>
        </Titlebar>
        <div className="flex flex-row h-[calc(100%-2.75rem)]">
          <PrimarySidebar>
            <CatalogView />
          </PrimarySidebar>
          <Main>
            <Editor />
          </Main>
        </div>
      </Space>
      {Dialog}
    </>
  );
}
