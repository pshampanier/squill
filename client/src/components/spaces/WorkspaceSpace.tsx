import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarEnvironmentItem from "@/components/sidebar/workspace/SidebarEnvironmentItem";
import SidebarWorkspaceCollectionItem from "@/components/sidebar/workspace/SidebarWorkspaceCollectionItem";
import Editor from "@/components/Editor";
import Titlebar from "@/components/titlebar/Titlebar";
import Space, { SpaceProps } from "@/components/spaces/Space";
import PagesTabs from "@/components/titlebar/PagesTabs";
import Main from "@/components/Main";
import Toolbar from "@/components/core/Toolbar";
import CommandButton from "@/components/core/CommandButton";
import SpaceSidebar from "@/components/spaces/SpaceSidebar";
import { Environment } from "@/models/environments";
import { WorkspaceItem } from "@/resources/workspaces";

export default function WorkspaceSpace(props: SpaceProps) {
  console.debug("Rendering WorkspaceSpace");
  const environments = useWorkspaceStore((state) => state.environments);
  const items = useWorkspaceStore((state) => state.rootItemIds.map((id) => state.items.get(id)));
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  return (
    <>
      <Space {...props}>
        <Titlebar>
          <Toolbar>
            <CommandButton command="sidebar.toggle" />
          </Toolbar>
          <PagesTabs />
          <Toolbar>
            <CommandButton command="settings.open" />
          </Toolbar>
        </Titlebar>
        <div className="flex flex-row h-[calc(100%-2.75rem)]">
          <SpaceSidebar>
            <SidebarSection label="environments">
              {environments.map((env: Environment) => {
                return <SidebarEnvironmentItem key={env.id} env={env} />;
              })}
            </SidebarSection>
            <SidebarSection label="explorer">
              {items.map((item: WorkspaceItem) => {
                return <SidebarWorkspaceCollectionItem key={item.id} itemId={item.id} />;
              })}
            </SidebarSection>
          </SpaceSidebar>
          <Main>
            {activePageId ? (
              <Editor />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <h1 className="text-xl font-bold">No selection</h1>
                </div>
              </div>
            )}
          </Main>
        </div>
      </Space>
    </>
  );
}
