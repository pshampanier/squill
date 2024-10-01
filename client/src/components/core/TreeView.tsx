import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import cx from "classix";
import React, { useCallback } from "react";
import Spinner from "@/components/core/Spinner";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import ErrorIcon from "@/icons/exclamation-triangle.svg?react";

// The color palette is set at the TreeView level and shared with the children items using a React context.
const ColorsContext = React.createContext<ColorsFunction>(null);

export type TreeViewProps = {
  className?: string;
  children: React.ReactNode;
  colors?: ColorsFunction;
};

/**
 * A Component letting users to navigate a hierarchical lists with nested levels that can be expanded and collapsed.
 *
 * ```
 *  ⛁ Databases     ⏷
 *    ⛀ MySQL
 *    ⛀ PostgreSQL
 *    ⛀ DuckDB
 *  ⛁ Others        ⏵
 * ```
 */
function TreeView({ className, children, colors = primary }: TreeViewProps) {
  return (
    <ColorsContext.Provider value={colors}>
      <nav data-type="tree-view" className={cx("flex flex-col flex-grow space-y-1.5 overflow-y-scroll", className)}>
        {children}
      </nav>
    </ColorsContext.Provider>
  );
}

export type TreeViewStatus = "open" | "closed" | "loading" | "error" | "editing";

type TreeViewItemProps = {
  /**
   * The text to display for the item.
   */
  label: string;

  /**
   * The icon to display for the item.
   */
  icon?: SVGIcon;

  /**
   * Additional classes to apply to the top level element of the component.
   */
  className?: string;

  /**
   * If true, the item can be opened or closed.
   * This will add a chevron icon to the item.
   */
  collapsible?: boolean;

  /**
   * The selection status of the item (default is false).
   */
  selected?: boolean;

  /**
   * The initial status of the item (default is "closed").
   */
  defaultStatus?: TreeViewStatus;

  /**
   * A callback function that is called when the item is clicked.
   */
  onClick?: (
    event: React.MouseEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => void;

  /**
   * A callback function that is called when a key is pressed while the item is focused.
   */
  onKeyDown?: (
    event: React.KeyboardEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => void;

  /**
   * The content of the item.
   * Will be displayed when the item is open.
   */
  children?: React.ReactNode;
};

/**
 * A hierarchical item in a TreeView.
 *
 * ```
 * Icon
 * │ Label         Status
 * │ │             │
 * ▼ ▼             ▼
 * ⛁ Databases     ⏷
 * ```
 */
TreeView.Item = function TreeViewItem({
  className,
  label,
  icon: Icon,
  collapsible = false,
  defaultStatus = "closed",
  selected = false,
  onClick,
  onKeyDown,
  children,
}: TreeViewItemProps) {
  const [status, setStatus] = React.useState<TreeViewStatus>(defaultStatus);
  const colors = React.useContext(ColorsContext);

  const classes = {
    self: cx(
      "flex flex-row space-x-2 h-9 px-2 w-full rounded",
      "font-medium items-center justify-center",
      "transition-colors duration-300 transform",
      colors("hover:ghost-background", "hover:ghost-text"),
      selected && colors("selected:ghost-background"),
      className,
    ),
    icon: "flex-none w-5 h-5",
    label: "flex-grow text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis text-left",
    status: "flex-none ml-auto gap-x-1 items-center",
    chevron: cx("flex-none w-4 h-4 transition-all", status === "open" && "rotate-90"),
  };

  // When a collapsible item is clicked, the default behavior is to toggle the status of the item.
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    onClick?.(event, setStatus);
    if (!event.defaultPrevented && collapsible) {
      event.preventDefault();
      setStatus((prev) => (prev === "open" ? "closed" : "open"));
    }
    // We need to stop the propagation otherwise the click event can be caught by the parent item which will trigger the
    // parent item to open/close.
    event.stopPropagation();
  }, []);

  // When a collapsible item is focused, the default behavior is to toggle the status of the item if the user presses Space
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event, setStatus);
  }, []);

  return (
    <div data-type="tree-view-item" onKeyDown={handleKeyDown} onClick={handleClick}>
      <button className={classes.self}>
        {Icon && <Icon className={classes.icon} />}
        <span className={classes.label}>{label}</span>
        <span className={classes.status}>
          {status === "loading" && <Spinner size="sm" />}
          {status === "error" && <ErrorIcon className="text-red-400 w-4 h-4" />}
          {collapsible && (status === "open" || status === "closed") && <ChevronIcon className={classes.chevron} />}
        </span>
      </button>
      {status === "open" && <div className="ml-3">{children}</div>}
    </div>
  );
};

export default TreeView;
