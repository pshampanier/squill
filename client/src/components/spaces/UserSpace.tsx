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
import ServerIcon from "@/icons/server.svg?react";
import StarIcon from "@/icons/star.svg?react";
import WorkspacesIcon from "@/icons/workspaces.svg?react";
import UserSpaceCommandManager from "@/components/spaces/UserSpaceCommandManager";

export default function UserSpace(props: SpaceProps) {
  console.debug("Rendering UserSpace");
  const showFavorites = useUserStore((state) => state.settings?.showFavorites);
  const showRecentlyOpened = useUserStore((state) => state.settings?.showRecentlyOpened);
  return (
    <>
      <UserSpaceCommandManager />
      <Space {...props}>
        <Titlebar>
          <Toolbar>
            <CommandButton command="sidebar.toggle" />
          </Toolbar>
          <Titlebar.AppName />
          <PagesTabs />
          <Toolbar>
            <CommandButton command="settings.open" />
          </Toolbar>
        </Titlebar>
        <div className="flex flex-row h-[calc(100%-2.75rem)]">
          <SpaceSidebar>
            <SidebarSection label="User's Catalog">
              <UserCatalogSection label="CONNECTIONS" path="connections" icon={ServerIcon}></UserCatalogSection>
              <UserCatalogSection label="ENVIRONMENTS" path="environments" icon={ServerIcon}></UserCatalogSection>
              <UserCatalogSection label="WORKSPACES" path="workspaces" icon={WorkspacesIcon}></UserCatalogSection>
              {showFavorites && (
                <UserCatalogSection label="FAVORITES" path="favorites" icon={StarIcon}></UserCatalogSection>
              )}
            </SidebarSection>
            {showRecentlyOpened && <SidebarSection label="Recently Opened" />}
          </SpaceSidebar>
          <Main>
            <Editor />
          </Main>
        </div>
      </Space>
    </>
  );
}
