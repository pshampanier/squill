import { CatalogEntry } from "@/resources/users";
import SidebarItem, { SidebarItemProps } from "@/components/sidebar/SidebarItem";
import ConnectionSidebarItem from "@/components/sidebar/ConnectionSidebarItem";
import FolderIcon from "@/icons/folder.svg?react";
import WorkspaceIcon from "@/icons/workspace.svg?react";
import ServerIcon from "@/icons/server.svg?react";
import { useUserStore } from "@/stores/UserStore";
import { useAppStore } from "@/stores/AppStore";

type Props = {
  parentPath: string;
  id: string;
};

export default function UserCatalogItem({ parentPath, id }: Props) {
  /// Get the catalog entry from the store.
  const entry = useUserStore((state) => state.catalog.get(id));
  const renameCatalogEntry = useUserStore((state) => state.renameCatalogEntry);
  const loadCatalog = useUserStore((state) => state.loadCatalog);
  const selected = useAppStore((state) => state.activeId === id);

  // The path of the catalog entry.
  const path = `${parentPath}/${entry.name}`;

  /// Check if the new name for the catalog entry is valid while the user is editing it.
  ///
  /// The name cannot contain any of the following characters: '< > : " / \ ? *' or '.'. Those are the only checks
  /// performed by this method, more extensive checks will be performed by the server when the new name is submitted.
  const handleChange = (newLabel: string) => {
    for (const c of newLabel) {
      if ('<>:"/\\?*.'.includes(c)) {
        throw new Error("The name cannot contain any of the following characters: '< > : \" / \\ ? * .'.");
      }
    }
    if (newLabel.includes("..")) {
      throw new Error("The name cannot contain '..'.");
    }
  };

  const handleOnClick = () => {
    useAppStore.setState({ activeId: id });
    return false;
  };

  const handleEditingCompleted = async (newLabel: string) => {
    const value = newLabel.trim();
    if (value.length === 0) {
      throw new Error("The name cannot be empty.");
    } else {
      return renameCatalogEntry(id, path, value);
    }
  };

  const handleLoadFolder = async () => {
    return loadCatalog(path, id);
  };

  const props: SidebarItemProps = {
    selected,
    label: entry.name,
    onClick: handleOnClick,
    onChange: handleChange,
    onEditingCompleted: handleEditingCompleted,
  };

  switch (entry.type) {
    case "connection":
      return <ConnectionSidebarItem {...props} id={id} parentPath={path} />;
    case "environment":
      return <SidebarItem {...props} icon={ServerIcon} editable />;
    case "workspace":
      return <SidebarItem {...props} icon={WorkspaceIcon} editable />;
    case "folder": {
      return (
        <SidebarItem {...props} loaderfn={handleLoadFolder} icon={FolderIcon} collapsible editable>
          {entry.children?.map((child: CatalogEntry) => {
            return <UserCatalogItem key={child.id} id={child.id} parentPath={path} />;
          })}
        </SidebarItem>
      );
    }
  }
}
