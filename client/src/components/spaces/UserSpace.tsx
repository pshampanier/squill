import { useUserStore } from "@/stores/UserStore";
import UserCatalogSection from "@/components/sidebar/users/UserCatalogRoot";
import PageLinks from "@/components/PageLinks";
import Titlebar from "@/components/titlebar/Titlebar";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import ServerIcon from "@/icons/server.svg?react";
import StarIcon from "@/icons/star.svg?react";
import WorkspacesIcon from "@/icons/workspaces.svg?react";

export default function UserSpace(props: SpaceProps) {
  console.debug("Rendering UserSpace");
  const showFavorites = useUserStore((state) => state.settings?.showFavorites);
  const showRecentlyOpened = useUserStore((state) => state.settings?.showRecentlyOpened);
  return (
    <>
      <Space {...props}>
        <Titlebar>
          <Toolbar>
            <CommandButton command="sidebar.toggle" />
          </Toolbar>
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
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h1 className="text-xl font-bold">No selection</h1>
                <PageLinks>
                  <PageLinks.Link shortcut={"Ctrl+Alt+C"}>Create a new connection</PageLinks.Link>
                  <PageLinks.Link shortcut={["Meta+Shift+N", "Ctrl+Shift+N"]}>Create a new folder</PageLinks.Link>
                </PageLinks>
              </div>
            </div>
          </Main>
        </div>
      </Space>
    </>
  );
}
