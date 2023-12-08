import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import { Environment } from "@/resources/workspace/environment";
import { CollectionItem } from "@/resources/collection-item";
import { WorkspaceCollectionItemType } from "@/resources/workspace/workspace";

import Sidebar from "../sidebar/Sidebar";
import SidebarSection from "../sidebar/SidebarSection";
import SidebarEnvironmentItem from "../sidebar/workspace/SidebarEnvironmentItem";
import SidebarWorkspaceCollectionItem from "../sidebar/workspace/SidebarWorkspaceCollectionItem";
import ResizePanel from "../core/ResizePanel";
import Editor from "../Editor";

export default function WorkspaceSpace() {
  console.debug("Rendering WorkspaceSpace");
  const { environments, collections } = useWorkspaceStore();
  return (
    <>
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
    </>
  );
}
