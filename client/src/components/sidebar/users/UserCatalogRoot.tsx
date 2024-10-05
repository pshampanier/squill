import { useUserStore } from "@/stores/UserStore";
import SidebarItem from "@/components/sidebar/SidebarItem";
import UserCatalogItem from "@/components/sidebar/users/UserCatalogItem";
import { SVGIcon } from "@/utils/types";
import ServerIcon from "@/icons/server.svg?react";
import StarIcon from "@/icons/star.svg?react";
import { METADATA_CONTENT_TYPE } from "@/utils/constants";

const FOLDER_ICONS: Record<string, SVGIcon> = {
  connections: ServerIcon,
  favorites: StarIcon,
  environments: ServerIcon,
};

type Props = {
  catalogId: string;
};

export default function UserCatalogRoot({ catalogId }: Props) {
  const resourceRef = useUserStore((state) => state.catalog.get(catalogId));
  const loadCatalogChildren = useUserStore((state) => state.loadCatalogChildren);

  const label = resourceRef.name;
  const icon: SVGIcon = FOLDER_ICONS[resourceRef.metadata?.[METADATA_CONTENT_TYPE]];

  const handleClick = () => {
    return resourceRef?.children?.length > 0;
  };

  const handleLoad = async () => {
    return loadCatalogChildren(catalogId);
  };

  return (
    <SidebarItem label={label} icon={icon} collapsible loaderfn={handleLoad} onClick={handleClick}>
      {resourceRef.children?.map((child) => {
        return <UserCatalogItem key={child.id} id={child.id} />;
      })}
    </SidebarItem>
  );
}
