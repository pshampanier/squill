import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import cx from "classix";
import React, { useCallback } from "react";
import Spinner from "@/components/core/Spinner";
import Input from "@/components/core/Input";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import ErrorIcon from "@/icons/exclamation-triangle.svg?react";
import TransparentIcon from "@/icons/transparent.svg?react";

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
   * A callback function that is called when the item is focused.
   *
   * @param event The focus event.
   * @param setStatus A React dispatch function to set the status of the item.
   * @returns
   */
  onEditBlur?: (
    event: React.FocusEvent<HTMLInputElement>,
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
 * An item can have a label, an icon, a status, and can be collapsible.
 * The visual representation of an item is as follows:
 *
 * ```
 *                Icon
 *                │ Label         Status
 *                │ │             │
 *                ▼ ▼             ▼
 *                ⛁ Databases     ⏷
 * ```
 *
 * The item can be collapsible, meaning that it can be opened or closed which will be indicated by a chevron icon in the
 * status section. Other status can be displayed in the status section such as "loading" or "error".
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
  onEditBlur,
  children,
}: TreeViewItemProps) {
  const colors = React.useContext(ColorsContext);

  // The current status of the item.
  const [status, setStatus] = React.useState<TreeViewStatus>(defaultStatus);

  // The status of the item when it is being edited.
  const editStatus = React.useRef<TreeViewStatus>(null);

  // A reference to the button element of the item.
  // This is used to give back the focus to the button when the input editing the item loses focus.
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Keep the edit status in sync with the status.
  // While we are editing, we want to keep the edit status unchanged.
  if (status !== "editing") {
    editStatus.current = status;
  }

  // When a collapsible item is clicked, the default behavior is to toggle the status of the item.
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    // First let's try to set the focus on the button, if for any reason are are prevented to do so we'll not process
    // this event.
    buttonRef.current?.focus();
    if (document.activeElement === buttonRef.current) {
      onClick?.(event, setStatus);
      if (!event.defaultPrevented && collapsible) {
        event.preventDefault();
        setStatus((prev) => (prev === "open" ? "closed" : "open"));
      }
      // We need to stop the propagation otherwise the click event can be caught by the parent item which will trigger the
      // parent item to open/close.
      event.stopPropagation();
    }
  }, []);

  // When a collapsible item is focused, the default behavior is to toggle the status of the item if the user presses Space
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event, setStatus);
  }, []);

  // Called when the input editing the item loses focus.
  // The default behavior is to restore the status of the item to the one before editing.
  const handleEditBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    onEditBlur?.(event, setStatus);
    if (!event.defaultPrevented) {
      setStatus(editStatus.current);
    }
  }, []);

  const handleEditKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event, setStatus);
    if (!event.defaultPrevented) {
      if (event.key === "Enter") {
        // Try to put the focus back on the button, it will trigger the onEditBlur callback.
        buttonRef.current?.focus();
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === "Escape") {
        // The default behavior is to restore the status of the item to the one before editing and to give back the
        // focus to the button.
        // The onEditBlur callback will be called and it's implementation should leverage the status to not validate
        // the input when the status is no longer `editing`.
        setStatus(editStatus.current);
        buttonRef.current?.focus();
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, []);

  const classes = {
    self: "flex flex-col w-full",
    button: cx(
      "flex flex-row space-x-2 px-2 w-full  h-9 rounded",
      "font-medium items-center justify-center",
      status !== "editing" && "transition-colors duration-300 transform",
      status !== "editing" && colors("hover:ghost-background", "hover:ghost-text"),
      selected && status !== "editing" && colors("selected:ghost-background"),
      className,
    ),
    icon: "flex-none w-5 h-5",
    label: "flex-grow text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis text-left",
    status: "flex-none ml-auto gap-x-1 items-center",
    chevron: cx("flex-none w-4 h-4 transition-all", status === "open" && "rotate-90"),
    children: "flex flex-row w-full",
  };

  return (
    <nav data-type="tree-view-item" className={classes.self} onKeyDown={handleKeyDown} onClick={handleClick}>
      <div className="relative h-9 w-full">
        <button ref={buttonRef} className={classes.button}>
          {Icon && <Icon className={classes.icon} data-type="icon" />}
          <span className={classes.label} data-type="label">
            {status !== "editing" && label}
          </span>
          <span className={classes.status} data-type="status">
            {status === "loading" && <Spinner size="sm" />}
            {status === "error" && <ErrorIcon className="text-red-400 w-4 h-4" />}
            {collapsible && (status === "open" || status === "closed") && <ChevronIcon className={classes.chevron} />}
          </span>
        </button>
        {
          /*
           * If the status is "editing", we display an input to edit the label of the item.
           * The input is displayed on top of the button rather than replacing it because we need to be able to give back
           * the focus to the button when the input is blurred.
           */
          status === "editing" && (
            <TreeViewInput label={label} icon={!!Icon} onBlur={handleEditBlur} onKeyDown={handleEditKeyDown} />
          )
        }
      </div>
      {status === "open" && (
        <nav data-type="tree-view-children" className={classes.children}>
          <div className="flex-grow-0 w-3"></div>
          <div className="flex-grow flex-col">{children}</div>
        </nav>
      )}
    </nav>
  );
};

type TreeViewInputProps = {
  /**
   * The value to be edited.
   */
  label: string;

  /**
   * If true, a transparent icon will be given to the input as a prefix, letting the icon of the treeview item visible
   * behind the input.
   */
  icon: boolean;

  /**
   * A callback function that is called when the input loses focus.
   */
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * A callback function that is called when a key is pressed while the input is focused.
   */
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * The input used to edit the label of a TreeViewItem.
 */
function TreeViewInput({ label, icon, onBlur, onKeyDown }: TreeViewInputProps) {
  return (
    <Input
      className="fixed z-10 -top-9 left-0 ml-1 mr-1 mt-1.5 h-9"
      density="compact"
      required
      autoFocus
      defaultValue={label}
      type="text"
      prefix={icon && <TransparentIcon className="w-5 h-5" />}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}

export default TreeView;
