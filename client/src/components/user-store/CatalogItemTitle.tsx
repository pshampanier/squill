import { useUserStore } from "@/stores/UserStore";

type CatalogItemTitleProps = {
  /**
   * The catalog item to display.
   */
  id: string;
};

export default function CatalogItemTitle({ id }: CatalogItemTitleProps) {
  const title = useUserStore((state) => state.getCatalogItem(id)?.title);
  return <>{title}</>;
}
