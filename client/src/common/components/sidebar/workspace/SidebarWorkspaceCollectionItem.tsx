import { Workspace, WorkspaceCollectionItem } from "@/resources/workspace/workspace";
import { editors } from "@/resources/editors";
import { useWorkspaceStore } from "@/stores/WorkspaceStore";

import SidebarItem from "../SidebarItem";
import FolderIcon from "@/icons/folder.svg?react";

type SidebarWorkspaceCollectionItemProps = {
  itemId: string;
};

export default function SidebarWorkspaceCollectionItem({ itemId }: SidebarWorkspaceCollectionItemProps) {
  const { item } = useWorkspaceStore((state) => state.getCollectionItemById(itemId));
  const setCollections = useWorkspaceStore((state) => state.setCollections);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const setActiveId = useWorkspaceStore((state) => state.setActiveId);
  const addPage = useWorkspaceStore((state) => state.addPage);
  const activeId = useWorkspaceStore((state) => state.activeId);
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  const replaceActivePage = useWorkspaceStore((state) => state.replaceActivePage);
  const page = useWorkspaceStore((state) => state.pages.find((page) => page.itemId === itemId));
  const activePage = useWorkspaceStore((state) => state.pages.find((page) => page.id === activePageId));

  const openFolder = async (): Promise<void> => {
    const workspace = Workspace.current;
    await workspace.loadFolder(itemId);
    setCollections(workspace.collections);
    setActiveId(itemId);
  };

  const openFile = async (): Promise<void> => {
    if (activeId !== itemId) {
      if (page) {
        // Already opened, we just need to activate it
        setActivePage(page.id);
      } else {
        const editor = editors.getEditor(item.name);
        // Not opened, we can replace the active page if it's not modified, otherwise we need to create a new page
        if (activePage && !activePage.modified) {
          replaceActivePage(item.id, item.name, editor);
        } else {
          // We need to create a new page
          addPage(item.id, item.name, editor);
        }
      }
    }
  };

  const handleOnClick = () => {
    if (item.type === "folder" && item.children?.length > 0) {
      setActiveId(item.id);
      return true;
    } else if (item.type === "file" && page) {
      setActivePage(page.id);
      return true;
    }
    return false;
  };

  const itemProps = {
    onClick: handleOnClick,
    label: item.name,
    selected: activeId === item.id,
  };

  if (item.type === "folder") {
    return (
      <SidebarItem {...itemProps} loaderfn={openFolder} icon={FolderIcon} collapsible>
        {item.children?.map((child: WorkspaceCollectionItem) => {
          return <SidebarWorkspaceCollectionItem key={child.id} itemId={child.id} />;
        })}
      </SidebarItem>
    );
  } else if (item.type === "file") {
    const editor = editors.getEditor(item.name);
    if (editor) {
      return <SidebarItem {...itemProps} icon={editor.icon} loaderfn={openFile} />;
    }
  }
}
