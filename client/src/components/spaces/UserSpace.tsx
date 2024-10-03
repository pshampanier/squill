import { useUserStore } from "@/stores/UserStore";
import UserCatalogSection from "@/components/sidebar/users/UserCatalogRoot";
import Titlebar from "@/components/titlebar/Titlebar";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import PagesTabs from "@/components/titlebar/PagesTabs";
import Editor from "@/components/Editor";
import UserSpaceCommandManager from "@/components/spaces/UserSpaceCommandManager";
import UserNotificationIconButton from "@/components/user-store/UserNotificationIconButton";

export default function UserSpace(props: SpaceProps) {
  console.debug("Rendering UserSpace");
  const catalogSections = useUserStore((state) => state.catalogSections);
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
          <SpaceSidebar>
            <SidebarSection label="User's Catalog">
              {catalogSections.map((id) => (
                <UserCatalogSection key={id} catalogId={id} />
              ))}
            </SidebarSection>
          </SpaceSidebar>
          <Main>
            <Editor />
          </Main>
        </div>
      </Space>
    </>
  );
}
