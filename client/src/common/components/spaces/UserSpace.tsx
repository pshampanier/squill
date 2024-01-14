import { useUserStore } from "@/stores/UserStore";
import { UserCollectionItem } from "@/resources/user/user";

import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarUserCollectionItem from "@/components/sidebar/user/SidebarUserCollectionItem";
import PageLinks from "@/components/PageLinks";
import Titlebar from "@/components/titlebar/Titlebar";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";

export default function UserSpace(props: SpaceProps) {
  console.debug("Rendering UserSpace");
  const userCollections = useUserStore((state) => state.collections);
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
            <SidebarSection label="Collections">
              {userCollections.map((item: UserCollectionItem) => {
                return <SidebarUserCollectionItem key={item.id} item={item} />;
              })}
            </SidebarSection>
          </SpaceSidebar>
          <Main>
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h1 className="text-xl font-bold">No selection</h1>
                <PageLinks>
                  <PageLinks.Link shortcut={["Meta+N", "Ctrl+N"]}>Create a new workspace</PageLinks.Link>
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
