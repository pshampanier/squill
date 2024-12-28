import TreeView, { TreeViewStatus } from "@/components/core/TreeView";
import { ROOT_CATALOG_ID } from "@/resources/users";
import { CatalogItem, useUserStore } from "@/stores/UserStore";
import { secondary as colors } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import ServerIcon from "@/icons/server.svg?react";
import StarIcon from "@/icons/star.svg?react";
import PlugIcon from "@/icons/plug.svg?react";
import FolderIcon from "@/icons/folder.svg?react";
import { create, StoreApi, UseBoundStore } from "zustand";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingContainer from "@/components/core/LoadingContainer";
import cx from "classix";
import { METADATA_DRIVER, METADATA_RESOURCES_TYPE, METADATA_SPECIAL } from "@/utils/constants";
import { ResourceType } from "@/models/resources";
import { SpecialCollection } from "@/models/collections";
import CommandLink from "@/components/core/CommandLink";
import { CommandEvent, registerCommand } from "@/utils/commands";
import { useCommand } from "@/hooks/use-commands";
import { useAppStore } from "@/stores/AppStore";
import { agent } from "@/resources/agent";

/**
 * A Regular expression to check the validity of a catalog item name.
 *
 * The name cannot contain any of the following characters: '< > : " / \ ? *' or '.'.
 *
 * Those are the only checks performed by this method, more extensive checks will be performed by the server when the
 * new name is submitted to the agent.
 */
const CATALOG_ITEM_NAME_PATTERN = '^(?!.*\\.{2})(?!.*[<>:"\\/\\\\?*]).*$';

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
  getViewStatus: (catalogId: string, catalogItem: CatalogItem, editing?: boolean) => TreeViewStatus;

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
        getViewStatus: (catalogId: string, catalogItem: CatalogItem, editing?: boolean) => {
          if (editing) {
            return "editing";
          } else if (catalogItem.status === "fetching") {
            return "loading";
          } else if (catalogItem.status === "error") {
            return "error";
          } else {
            return get().openItems.has(catalogId) ? "open" : "closed";
          }
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
    // When the component is mounted, we need to load the children of all the items which are
    // in the 'open' state.
    store.current?.getState().openItems.forEach((catalogId) => {
      useUserStore.getState().loadCatalogChildren(catalogId);
    });

    const unregisterCommand = registerCommand({
      name: "catalog.view.rename",
      description: "Rename...",
      shortcut: "Enter",
    });

    return () => {
      unregisterCommand();
    };
  }, []);

  if (!catalogItem) {
    // TODO: Handle the case where the catalog item is not found.
    return null;
  } else if (catalogItem.status !== "ready") {
    return (
      <LoadingContainer
        size="md"
        message="Loading..."
        status={catalogItem.status === "error" ? "error" : "running"}
        errorFallback="Oops, it failed..."
        onRetry={() => useUserStore.getState().loadCatalogChildren(catalogId)}
      />
    );
  } else {
    return (
      <TreeView className={cx(className, "select-none")} colors={colors}>
        <CatalogViewCollection catalogId={catalogId} useViewStore={store.current} root />
      </TreeView>
    );
  }
}

type CatalogViewCollectionProps = CommonCatalogViewProps & {
  /**
   * True if the item is the root of the view (default: false).
   * The root of the view is a special item that is not displayed in the view, only its children are displayed.
   */
  root?: boolean;
};

const RESOURCE_TYPE_ICONS: Record<ResourceType, SVGIcon> = {
  connection: ServerIcon,
  environment: ServerIcon,
  collection: FolderIcon,
  user: undefined,
};

const SPECIAL_COLLECTION_ICONS: Record<SpecialCollection, SVGIcon> = {
  favorites: StarIcon,
  trash: undefined,
};

/**
 * A Collection of resources in the catalog view.
 */
function CatalogViewCollection({ catalogId, useViewStore, root }: CatalogViewCollectionProps) {
  //
  // States & Refs
  //

  const catalogItem = useUserStore((state) => state.getCatalogItem(catalogId));
  const viewStatus = useViewStore((state) => state.getViewStatus(catalogId, catalogItem));

  //
  // Logic
  //

  const handleToggle = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
    // The tree view is used here as a controlled component, we need to prevent the default behavior.
    useViewStore.getState().toggleItem(catalogId);
    event.preventDefault();
  }, []);

  //
  // Rendering
  //
  console.debug("Rendering CatalogViewCollection", { catalogId, name: catalogItem.name, viewStatus });
  const children = ((): React.ReactNode => {
    if (viewStatus === "open" && catalogItem.children?.length) {
      return catalogItem.children.map((childId: string) => {
        const child = useUserStore.getState().getCatalogItem(childId);
        switch (child.type) {
          case "collection":
            return <CatalogViewCollection key={child.id} catalogId={child.id} useViewStore={useViewStore} />;
          case "connection":
            return <ConnectionViewItem key={child.id} catalogId={child.id} useViewStore={useViewStore} />;
          default:
            return null;
        }
      });
    } else if (viewStatus === "open") {
      return <EmptyCollection catalogItem={catalogItem} />;
    } else {
      return null;
    }
  })();

  // The icon associated to the collection depends on the type of resource .
  const icon: SVGIcon =
    SPECIAL_COLLECTION_ICONS[catalogItem.metadata?.[METADATA_SPECIAL] as SpecialCollection] ||
    RESOURCE_TYPE_ICONS[catalogItem.metadata?.[METADATA_RESOURCES_TYPE] as ResourceType] ||
    FolderIcon;

  if (root) {
    return <>{children}</>;
  } else {
    return (
      <TreeView.Item
        key={catalogId}
        label={catalogItem.name}
        icon={icon}
        status={viewStatus}
        onToggle={handleToggle}
        collapsible
      >
        {children}
      </TreeView.Item>
    );
  }
}

/**
 * A component to display a message when a collection is empty.
 */
function EmptyCollection({ catalogItem }: { catalogItem: CatalogItem }) {
  let message: string;
  let command: string;
  if (catalogItem.metadata?.[METADATA_SPECIAL] === "favorites") {
    message = "No favorites yet...";
  } else {
    message = "This collection is empty.";
    if (catalogItem.metadata?.[METADATA_RESOURCES_TYPE] === "connection") {
      command = "connection.new";
    } else if (catalogItem.metadata?.[METADATA_RESOURCES_TYPE] === "environment") {
      command = "environment.new";
    }
  }

  return (
    <div className="inline-block text-xs opacity-60 pt-2 pb-2 pl-5">
      {message}
      {command && (
        <>
          <br />
          Add a <CommandLink command={command} /> to start.
        </>
      )}
    </div>
  );
}

type ConnectionViewItemProps = CommonCatalogViewProps;

function ConnectionViewItem({ catalogId: connId, useViewStore }: ConnectionViewItemProps) {
  //
  // States & Refs
  //
  const [editing, setEditing] = useState(false);
  const catalogItem = useUserStore((state) => state.getCatalogItem(connId));
  const getViewStatus = useViewStore((state) => state.getViewStatus);
  const selected = useAppStore((state) => state.activeId === connId);
  const refUserTipDisplayed = useRef<boolean>(false);
  const refItem = useRef<HTMLElement>(null);

  //
  // Logic
  //
  const viewStatus = getViewStatus(connId, catalogItem, editing);

  const handleOnCommand = useCallback((event: CommandEvent) => {
    switch (event.detail.name) {
      case "catalog.view.rename": {
        console.log("Renaming connection", catalogItem);
        setEditing(true);
        event.preventDefault();
        event.stopPropagation();
        break;
      }
    }
  }, []);

  const Icon = useMemo(() => {
    const driverName = catalogItem.metadata?.[METADATA_DRIVER];
    const driver = driverName ? agent().drivers.find((d) => d.name === driverName) : undefined;
    if (driver?.icon) {
      return <img src={`/icons/drivers/${driver.icon}`} alt={driver.name} className="aspect-square w-5 object-cover" />;
    } else {
      return PlugIcon;
    }
  }, [catalogItem]);

  const handleEditingBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    if (event.target.checkValidity()) {
      setEditing(false);
    } else {
      // If the input is invalid, focus it again
      event.target.focus();
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  // Check the validity of the name when the user is editing it.
  const handleEditingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.checkValidity();
    if (!refUserTipDisplayed.current && event.target.validity.patternMismatch) {
      useUserStore.getState().addNotification({
        id: "catalog.view.invalid-name",
        variant: "error",
        message: "The name cannot contain any of the following characters: '< > : \" / \\ ? *' or '..'.",
        autoDismiss: true,
      });
      refUserTipDisplayed.current = true;
    }
  }, []);

  const handleOnEditingKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (event.target instanceof HTMLInputElement && event.target.validity.valid) {
        useUserStore.getState().renameCatalogItem(connId, event.currentTarget.value);
        setEditing(false);
      } else {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, []);

  // On click we prevent the default behavior which is to toggle the item regardless of the click target.
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    useAppStore.getState().setActiveItem(connId);
    event.preventDefault();
  }, []);

  const handleToggle = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
    useViewStore.getState().toggleItem(connId);
    event.preventDefault();
  }, []);

  useCommand({
    ref: refItem,
    onCommand: handleOnCommand,
  });

  //
  // Rendering
  //
  console.debug("Rendering CatalogViewCollection", { connId, name: catalogItem.name, viewStatus });
  return (
    <TreeView.Item
      ref={refItem}
      key={connId}
      label={catalogItem.name}
      icon={Icon}
      status={viewStatus}
      onClick={handleClick}
      onToggle={handleToggle}
      onEditingBlur={handleEditingBlur}
      onEditingChange={handleEditingChange}
      onEditingKeyDown={handleOnEditingKeyDown}
      selected={selected}
      required
      pattern={CATALOG_ITEM_NAME_PATTERN}
      collapsible
    ></TreeView.Item>
  );
}
