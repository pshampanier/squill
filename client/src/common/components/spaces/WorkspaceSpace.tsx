import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import { Environment } from "@/resources/workspace/environment";
import { CollectionItem } from "@/resources/collection-item";
import { WorkspaceCollectionItemType } from "@/resources/workspace/workspace";

import Sidebar from "@/components/sidebar/Sidebar";
import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarEnvironmentItem from "@/components/sidebar/workspace/SidebarEnvironmentItem";
import SidebarWorkspaceCollectionItem from "@/components/sidebar/workspace/SidebarWorkspaceCollectionItem";
import ResizePanel from "@/components/core/ResizePanel";
import Editor from "@/components/Editor";
import Titlebar from "@/components/titlebar/Titlebar";
import Space from "@/components/spaces/Space";
import PagesTabs from "@/components/titlebar/PagesTabs";

import WorkspaceIcon from "@/icons/workspace.svg?react";

export default function WorkspaceSpace() {
  console.debug("Rendering WorkspaceSpace");
  const { environments, collections } = useWorkspaceStore();
  return (
    <>
      <Titlebar>
        <PagesTabs>
          <PagesTabs.Tab icon={WorkspaceIcon} label="Collections" selected />
          <PagesTabs.Tab icon={WorkspaceIcon} label="Environments" modified />
        </PagesTabs>
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
        <ResizePanel />
        <Editor />
      </Space>
    </>
  );
}
