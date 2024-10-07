import SidebarItem, { SidebarItemProps } from "@/components/sidebar/SidebarItem";
import ConnectionSidebarItem from "@/components/sidebar/ConnectionSidebarItem";
import FolderIcon from "@/icons/folder.svg?react";
import ServerIcon from "@/icons/server.svg?react";
import { CatalogItem, useUserStore } from "@/stores/UserStore";
import { useAppStore } from "@/stores/AppStore";

type Props = {
  // Id of the catalog item to render.
  id: string;
};

export default function UserCatalogItem({ id }: Props) {
  /// Get the catalog entry from the store.
  const entry = useUserStore((state) => state.catalog.get(id));
  const renameCatalogItem = useUserStore((state) => state.renameCatalogItem);
  const loadCatalogChildren = useUserStore((state) => state.loadCatalogChildren);
  const selected = useAppStore((state) => state.activeId === id);

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
      return renameCatalogItem(id, value);
    }
  };

  const handleLoadFolder = async () => {
    return loadCatalogChildren(id);
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
      return <ConnectionSidebarItem {...props} id={id} />;
    case "environment":
      return <SidebarItem {...props} icon={ServerIcon} editable />;
    case "collection": {
      return (
        <SidebarItem {...props} loaderfn={handleLoadFolder} icon={FolderIcon} collapsible editable>
          {entry.children?.map((child: CatalogItem) => {
            return <UserCatalogItem key={child.id} id={child.id} />;
          })}
        </SidebarItem>
      );
    }
  }
}
