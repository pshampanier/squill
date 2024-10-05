import TreeView, { TreeViewStatus } from "@/components/core/TreeView";
import { ROOT_CATALOG_ID } from "@/resources/users";
import { CatalogItem, CatalogItemLoadingStatus, useUserStore } from "@/stores/UserStore";
import { secondary as colors } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import ServerIcon from "@/icons/server.svg?react";
import StarIcon from "@/icons/star.svg?react";
import PlugIcon from "@/icons/plug.svg?react";
import FolderIcon from "@/icons/folder.svg?react";
import { METADATA_CONTENT_TYPE } from "@/utils/constants";
import { create, StoreApi, UseBoundStore } from "zustand";
import { useCallback, useEffect, useRef } from "react";
import LoadingContainer from "@/components/core/LoadingContainer";
import cx from "classix";

type CatalogViewStoreState = {
  openItems: Set<string>;
};

type CatalogViewStoreActions = {
  /**
   * Get the status of an item in the view.
   *
   * This status is a combination of the catalog status and the state of the item in the view (open or closed).
   * This method return a {@link TreeViewStatus} value.
   */
  getViewStatus: (catalogId: string, catalogStatus: CatalogItemLoadingStatus) => TreeViewStatus;

  /**
   * Open/Close an item in the view.
   */
  toggleItem: (catalogId: string) => void;
};

type CatalogViewStore = UseBoundStore<StoreApi<CatalogViewStoreState & CatalogViewStoreActions>>;

type CommonCatalogViewProps = {
  /**
   * The identifier of the catalog to display.
   */
  catalogId?: string;

  /**
   * Access to the store.
   */
  useViewStore: CatalogViewStore;
};

type CatalogViewProps = {
  /**
   * The identifier of the catalog to display (default: ROOT_CATALOG_ID).
   */
  catalogId?: string;

  /**
   * Some classes to apply to the top element in the DOM.
   */
  className?: string;
};

export default function CatalogView({ className, catalogId = ROOT_CATALOG_ID }: CatalogViewProps) {
  const catalogItem = useUserStore((state) => state.catalog.get(catalogId));

  const store = useRef(
    create<CatalogViewStoreState & CatalogViewStoreActions>((set, get) => {
      return {
        /**
         * The initial state of the open items.
         */
        openItems: new Set([catalogId]),

        /**
         * Get the status of an item in the view.
         */
        getViewStatus: (catalogId: string, catalogStatus: CatalogItemLoadingStatus) => {
          return catalogStatus === "error" || catalogStatus === "loading"
            ? catalogStatus
            : get().openItems.has(catalogId)
              ? "open"
              : "closed";
        },

        /**
         * Open/Close an item in the view.
         */
        toggleItem: (catalogId: string) => {
          set((prev) => {
            const next = {
              ...prev,
              openItems: new Set(prev.openItems),
            };
            if (prev.openItems.has(catalogId)) {
              //
              // Closing
              //
              next.openItems.delete(catalogId);
              console.debug("Closing catalog item", { catalogId, state: next });
              return next;
            } else {
              //
              // Opening
              //
              useUserStore.getState().loadCatalogChildren(catalogId);
              next.openItems.add(catalogId);
              console.debug("Opening catalog item", { catalogId, state: next });
              return next;
            }
          });
        },
      };
    }),
  );

  useEffect(() => {
    // When the component is mounted, we need to load the children of all the folders in the catalog which are
    // in the 'open' state.
    store.current?.getState().openItems.forEach((catalogId) => {
      useUserStore.getState().loadCatalogChildren(catalogId);
    });
  }, []);

  if (!catalogItem) {
    // TODO: Handle the case where the catalog item is not found.
    return null;
  } else if (!catalogItem.status || catalogItem.status === "loading" || catalogItem.status === "error") {
    return (
      <LoadingContainer
        size="md"
        message="Loading..."
        status={catalogItem.status === "error" ? "error" : "pending"}
        errorFallback="Oops, it failed..."
        onRetry={() => useUserStore.getState().loadCatalogChildren(catalogId)}
      />
    );
  } else {
    return (
      <TreeView className={cx(className, "select-none")} colors={colors}>
        <CatalogViewFolder catalogId={catalogId} useViewStore={store.current} root />
      </TreeView>
    );
  }
}

type CatalogViewFolderProps = CommonCatalogViewProps & {
  /**
   * True if the item is the root of the view (default: false).
   * The root of the view is a special item that is not displayed in the view, only its children are displayed.
   */
  root?: boolean;
};

const FOLDER_ICONS: Record<string, SVGIcon> = {
  connections: ServerIcon,
  favorites: StarIcon,
  environments: ServerIcon,
};

/**
 * A Folder in the catalog view.
 */
function CatalogViewFolder({ catalogId, useViewStore, root }: CatalogViewFolderProps) {
  //
  // States & Refs
  //

  const catalogItem = useUserStore((state) => state.catalog.get(catalogId));
  const viewStatus = useViewStore((state) => state.getViewStatus(catalogId, catalogItem?.status));

  //
  // Logic
  //

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    // The tree view is used here as a controlled component, we need to prevent the default behavior.
    useViewStore.getState().toggleItem(catalogId);
    event.stopPropagation();
    event.preventDefault();
  }, []);

  //
  // Rendering
  //
  console.debug("Rendering CatalogViewFolder", { catalogId, name: catalogItem?.name, viewStatus });
  const children = (catalogItem?.children || []).map((child: CatalogItem) => {
    switch (child.type) {
      case "folder":
        return <CatalogViewFolder key={child.id} catalogId={child.id} useViewStore={useViewStore} />;
      case "connection":
        return <ConnectionViewItem key={child.id} catalogId={child.id} useViewStore={useViewStore} />;
      default:
        return null;
    }
  });

  // The icon associated to the folder depends on the content type of the folder.
  const icon: SVGIcon = FOLDER_ICONS[catalogItem?.metadata?.[METADATA_CONTENT_TYPE]] || FolderIcon;

  if (root) {
    return <>{children}</>;
  } else {
    return (
      <TreeView.Item
        key={catalogId}
        label={catalogItem?.name}
        icon={icon}
        status={viewStatus}
        onClick={handleClick}
        collapsible
      >
        {children}
      </TreeView.Item>
    );
  }
}

type ConnectionViewItemProps = CommonCatalogViewProps;

function ConnectionViewItem({ catalogId: connId, useViewStore }: ConnectionViewItemProps) {
  //
  // States & Refs
  //
  const catalogItem = useUserStore((state) => state.catalog.get(connId));
  const viewStatus = useViewStore.getState().getViewStatus(connId, catalogItem?.status);

  //
  // Rendering
  //
  console.debug("Rendering CatalogViewFolder", { connId, name: catalogItem?.name, viewStatus });
  return (
    <TreeView.Item
      key={connId}
      label={catalogItem?.name}
      icon={PlugIcon}
      status={viewStatus}
      collapsible
    ></TreeView.Item>
  );
}
