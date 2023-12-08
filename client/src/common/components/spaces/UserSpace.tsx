import { useUserStore } from "@/stores/UserStore";
import { UserCollectionItem } from "@/resources/user/user";

import Sidebar from "../sidebar/Sidebar";
import SidebarSection from "../sidebar/SidebarSection";
import SidebarUserCollectionItem from "../sidebar/user/SidebarUserCollectionItem";
import ResizePanel from "../core/ResizePanel";
import Page from "../Page";
import PageLinks from "../PageLinks";

export default function UserSpace() {
  console.debug("Rendering UserSpace");
  const { userCollections } = useUserStore();
  return (
    <>
      <Sidebar>
        <SidebarSection label="Collections">
          {userCollections.map((item: UserCollectionItem) => {
            return <SidebarUserCollectionItem key={item.id} item={item} />;
          })}
        </SidebarSection>
      </Sidebar>
      <ResizePanel />
      <Page>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <h1 className="text-xl font-bold">No selection</h1>
            <PageLinks>
              <PageLinks.Link shortcuts={["Meta+N", "Ctrl+N"]}>Create a new workspace</PageLinks.Link>
              <PageLinks.Link shortcuts={["Meta+Shift+N", "Ctrl+Shift+N"]}>Create a new folder</PageLinks.Link>
            </PageLinks>
          </div>
        </div>
      </Page>
    </>
  );
}
