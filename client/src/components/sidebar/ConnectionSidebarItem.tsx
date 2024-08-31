import { editors } from "@/resources/editors";
import { useAppStore } from "@/stores/AppStore";
import SidebarItem, { SidebarItemProps } from "@/components/sidebar/SidebarItem";
import ConnectIcon from "@/icons/plug.svg?react";
import { EDITOR_CONNECTION } from "@/utils/constants";

type ConnectionSidebarItemProps = {
  id: string;
} & SidebarItemProps;

/**
 * A sidebar item for a connection.
 */
export default function ConnectionSidebarItem(props: ConnectionSidebarItemProps) {
  const setActiveItem = useAppStore((state) => state.setActiveItem);

  const handleClick = () => {
    setActiveItem(props.id, props.label, editors.getEditorByName(EDITOR_CONNECTION));
    return false;
  };

  return <SidebarItem {...props} icon={ConnectIcon} onClick={handleClick} editable />;
}
