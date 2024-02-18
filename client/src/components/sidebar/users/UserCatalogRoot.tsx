import { CatalogRoot, useUserStore } from "@/stores/UserStore";
import SidebarItem from "@/components/sidebar/SidebarItem";
import UserCatalogItem from "@/components/sidebar/users/UserCatalogItem";
import { SVGIcon } from "@/utils/types";

type Props = {
  label: string;
  icon: SVGIcon;
  path: CatalogRoot;
};

export default function UserCatalogRoot({ label, icon, path }: Props) {
  const catalogSection = useUserStore((state) => state[path]);
  const loadCatalog = useUserStore((state) => state.loadCatalog);

  const handleClick = () => {
    return catalogSection.length > 0;
  };

  const handleLoad = async () => {
    return loadCatalog(path);
  };

  return (
    <SidebarItem label={label} icon={icon} collapsible loaderfn={handleLoad} onClick={handleClick}>
      {catalogSection?.map((entryId) => {
        return <UserCatalogItem key={entryId} id={entryId} parentPath={path} />;
      })}
    </SidebarItem>
  );
}
