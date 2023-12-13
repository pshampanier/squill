import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import { Environment } from "@/resources/workspace/environment";
import { CollectionItem } from "@/resources/collection-item";
import { WorkspaceCollectionItemType } from "@/resources/workspace/workspace";

import Sidebar from "@/components/sidebar/Sidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarEnvironmentItem from "@/components/sidebar/workspace/SidebarEnvironmentItem";
import SidebarWorkspaceCollectionItem from "@/components/sidebar/workspace/SidebarWorkspaceCollectionItem";
import Editor from "@/components/Editor";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import PagesTabs from "@/components/titlebar/PagesTabs";

import Page from "@/components/Page";
import PageLinks from "@/components/PageLinks";

export default function WorkspaceSpace() {
  console.debug("Rendering WorkspaceSpace");
  const environments = useWorkspaceStore((state) => state.environments);
  const collections = useWorkspaceStore((state) => state.collections);
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  return (
    <>
      <Titlebar>
        <PagesTabs />
      </Titlebar>
      <Space>
        <Sidebar>
          <SidebarSection label="environments">
            {environments.map((env: Environment) => {
              return <SidebarEnvironmentItem key={env.id} env={env} />;
            })}
          </SidebarSection>
          <SidebarSection label="explorer">
            {collections.map((item: CollectionItem<WorkspaceCollectionItemType>) => {
              return <SidebarWorkspaceCollectionItem key={item.id} item={item} />;
            })}
          </SidebarSection>
        </Sidebar>
        {activePageId ? (
          <Editor />
        ) : (
          <Page>
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h1 className="text-xl font-bold">No selection</h1>
                <PageLinks>
                  <PageLinks.Link shortcuts={["Meta+Q", "Ctrl+Q"]}>Create a new query</PageLinks.Link>
                  <PageLinks.Link shortcuts={["Meta+D", "Ctrl+D"]}>Create a new dashboard</PageLinks.Link>
                  <PageLinks.Link shortcuts={["Meta+Shift+N", "Ctrl+Shift+N"]}>Create a new folder</PageLinks.Link>
                </PageLinks>
              </div>
            </div>
          </Page>
        )}
      </Space>
    </>
  );
}
