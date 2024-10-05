import Titlebar from "@/components/titlebar/Titlebar";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import CommandButton from "@/components/core/CommandButton";
import PagesTabs from "@/components/titlebar/PagesTabs";
import Editor from "@/components/Editor";
import UserSpaceCommandManager from "@/components/spaces/UserSpaceCommandManager";
import UserNotificationIconButton from "@/components/user-store/UserNotificationIconButton";
import PrimarySidebar from "@/components/sidebar/PrimarySidebar";
import CatalogView from "@/components/views/catalog/CatalogView";

export default function UserSpace(props: SpaceProps) {
  console.debug("Rendering UserSpace");
  return (
    <>
      <UserSpaceCommandManager />
      <Space {...props}>
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
    </>
  );
}
