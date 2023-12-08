import { Workspace, WorkspaceCollectionItem } from "@/resources/workspace/workspace";
import { Editor, editors } from "@/resources/editors";

import { useWorkspaceStore } from "@/stores/WorkspaceStore";

import SidebarItem from "../SidebarItem";
import FolderIcon from "@/icons/folder.svg?react";

type SidebarWorkspaceCollectionItem = {
  item: Readonly<WorkspaceCollectionItem>;
};

export default function SidebarWorkspaceCollectionItem({ item }: SidebarWorkspaceCollectionItem) {
  const { setCollections, pages, setActivePage, addPage, activeItemId, activePageId, replaceActivePage } =
    useWorkspaceStore();

  function openFolder(): Promise<void> {
    const workspace = Workspace.current;
    return workspace.loadFolder(item.id).then(() => {
      setCollections(workspace.collections);
    });
  }

  function openFile(editor: Editor): Promise<void> {
    if (activeItemId !== item.id) {
      const page = pages.find((page) => page.itemId === item.id);
      if (page) {
        // Already opened, we just need to activate it
        setActivePage(page.id);
      } else {
        // Not opened, we can replace the active page if it's not modified, otherwise we need to create a new page
        const activePage = pages.find((page) => page.id === activePageId);
        if (activePage && !activePage.modified) {
          replaceActivePage(item.id, item.name, editor);
        } else {
          // We need to create a new page
          addPage(item.id, item.name, editor);
        }
      }
    }
    return Promise.resolve();
  }

  if (item.type === "folder") {
    return (
      <SidebarItem label={item.name} loaderfn={openFolder} icon={FolderIcon} collapsible>
        {item.children?.map((child: WorkspaceCollectionItem) => {
          return <SidebarWorkspaceCollectionItem key={child.id} item={child} />;
        })}
      </SidebarItem>
    );
  } else if (item.type === "file") {
    const editor = editors.getEditor(item.name);
    if (editor) {
      return (
        <SidebarItem
          label={item.name}
          icon={editor.icon}
          selected={activeItemId === item.id}
          loaderfn={() => {
            return openFile(editor);
          }}
        />
      );
    }
  }
}
