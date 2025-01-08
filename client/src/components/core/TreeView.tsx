import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import cx from "classix";
import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import Spinner from "@/components/core/Spinner";
import Input from "@/components/core/Input";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import ErrorIcon from "@/icons/solid/exclamation-triangle.svg?react";
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
      <nav
        data-type="tree-view"
        className={cx("flex flex-col flex-grow space-y-0.5 overflow-y-scroll px-0.5", className)}
      >
        {children}
      </nav>
    </ColorsContext.Provider>
  );
}

/**
 * The status of an item in the `TreeView`.
 */
export type TreeViewStatus = "open" | "closed" | "loading" | "error" | "editing";

type TreeViewItemProps = {
  /**
   * The text to display for the item.
   */
  label: string;

  /**
   * The icon to display for the item.
   */
  icon?: JSX.Element | SVGIcon;

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
   * The [pattern][MDN Reference] attribute for editing validation.
   *
   * When specified, is a regular expression which the input's value must match for the value to pass
   * [constraint validation][MDN Reference].
   *
   * *Note*: The pattern attribute only used while the status is `editing`.
   *
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern
   */
  pattern?: string;

  /**
   * The [required][MDN Reference] attribute for editing validation.
   *
   * If present, indicates that the user must specify a value for the input before the editing can end.
   *
   * *Note*: The pattern attribute only used while the status is `editing`.
   *
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/required
   */
  required?: boolean;

  /**
   * The status of the item (default is undefined).
   *
   * When you use the `status` prop, you are creating a controlled component. This means that the status of the
   * component is controlled by the parent component. The parent component is responsible for updating the status of the
   * item when the user interacts with it.
   *
   * *Notes*:
   * - If you use the `status` prop, you should also provide an `onClick` or `onKeyDown` callback to handle the user
   *   interactions.
   * - This prop is mutually exclusive with the `defaultStatus` prop.
   * - If you provide neither the `status` nor the `defaultStatus` prop, the component will de facto act as an
   *   uncontrolled component since `defaultStatus` as a default value "closed".
   * - If you provide both the `status` and the `defaultStatus` prop, the `status` prop will take precedence and so
   *   `defaultStatus` will be ignored.
   */
  status?: TreeViewStatus;

  /**
   * The default status of the item (default is "closed").
   *
   * When you use the `defaultStatus` prop, you are creating an uncontrolled component. This means that the status of
   * the component is controlled by component itself. That being said, the parent component still has an option to
   * change the status of the component by providing callbacks such `onClick` or `onKeyDown` props which are given
   * the setState() function as argument.
   */
  defaultStatus?: TreeViewStatus;

  /**
   * A callback fired when the item is clicked.
   *
   * **Default behaviors**:
   * - `uncontrolled component`, if the item is collapsible, the status of the item will be toggled from "open" to
   *   "closed" and vice versa.
   */
  onClick?: (
    event: React.MouseEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => void;

  /**
   * A callback function fired when the user expands or collapses the item.
   *
   * This callback is called before the status of the item is changed. It could be fired when the item is clicked or
   * when the SPACE key is pressed while the item is focused. By default will be called on click whatever if the click
   * originated from the collapse icon or the label, to force the `onToggle` to be called only when a click occurs on
   * the collapse icon, `event.preventDefault()` must be called on the click event, then the onToggle callback will be
   * called only from an explicit click on the collapse icon.
   *
   * **Default behaviors**:
   * - `uncontrolled component`, the status of the item will be toggled from "open" to "closed" and vice versa.
   * - `controlled component`, the next status of the item is expected to be provided by the parent. There is no default
   *  behavior.
   *
   * @param event The event can either originated from a click or a key press.
   */
  onToggle?: (event: React.SyntheticEvent<HTMLElement>) => void;

  /**
   * A callback function that is called when a key is pressed while the item is focused.
   */
  onKeyDown?: (
    event: React.KeyboardEvent<HTMLElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => void;

  /**
   * A callback function when the input used to edit the name loose focus.
   *
   * @param event The focus event.
   * @param setStatus A React dispatch function to set the status of the item.
   * @returns
   */
  onEditingBlur?: (
    event: React.FocusEvent<HTMLInputElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => void;

  /**
   * A callback function when the input used to edit the name changes.
   *
   * @param event The change event.
   * @param setStatus A React dispatch function to set the status of the item.
   * @returns
   */
  onEditingChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    setStatus: React.Dispatch<React.SetStateAction<TreeViewStatus>>,
  ) => void;

  /**
   * A callback function that is called when a key is pressed while the editing is in progress.
   *
   * **Default behaviors**:
   * - `ENTER`: Restore the status of the item before the start of the edition and to give back the focus to the item.
   * - `ESCAPE`: Restore the status of the item before the start of the edition and to give back the focus to the item.
   */
  onEditingKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;

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
 *
 * The item can be "controlled" by the parent component by providing a `defaultStatus` and an `onClick` callback.
 */
TreeView.Item = forwardRef<HTMLElement, TreeViewItemProps>((props, ref) => {
  const {
    className,
    label,
    icon,
    collapsible = false,
    status: controlledStatus,
    defaultStatus = "closed",
    selected = false,
    pattern,
    required,
    onClick,
    onKeyDown,
    onEditingBlur,
    onEditingChange,
    onEditingKeyDown,
    onToggle,
    children,
  } = props;
  const colors = React.useContext(ColorsContext);

  // The current status of the item.
  const [status, setStatus] = React.useState<TreeViewStatus>(controlledStatus || defaultStatus);

  // The status of the item when it is being edited.
  const editStatus = React.useRef<TreeViewStatus>(null);

  // A reference to the button element of the item.
  // This is used to give back the focus to the button when the input editing the item loses focus.
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The component is used as a controlled component. We need to synchronize the status state with the status prop.
    if (controlledStatus) {
      setStatus(controlledStatus);
    }
  }, [controlledStatus]);

  // Keep the edit status in sync with the status.
  // While we are editing, we want to keep the edit status unchanged.
  if (status !== "editing") {
    editStatus.current = status;
  }

  // Toggle the status (open/close) for collapsible items.
  const handleToggle = useCallback(
    (event: React.SyntheticEvent<HTMLElement>) => {
      onToggle?.(event);
      if (!event.defaultPrevented || !controlledStatus) {
        setStatus((prev) => {
          if (prev === "open" || prev === "closed") {
            return prev === "open" ? "closed" : "open";
          } else {
            return prev;
          }
        });
      }
    },
    [controlledStatus],
  );

  // When a collapsible item is clicked, the default behavior is to toggle the status of the item.
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      // First let's try to set the focus on the button, if for any reason are are prevented to do so we'll not process
      // this event.
      buttonRef.current?.focus();
      if (document.activeElement === buttonRef.current) {
        onClick?.(event, setStatus);
        const target = event.target as HTMLElement;
        if (collapsible && (!event.defaultPrevented || target.dataset.component === "tree-view-item-toggle")) {
          handleToggle(event);
        }
        // We need to stop the propagation otherwise the click event can be caught by the parent item which will trigger the
        // parent item to open/close.
        event.stopPropagation();
      }
    },
    [controlledStatus],
  );

  // When a collapsible item is focused, the default behavior is to toggle the status of the item if the user presses Space
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event, setStatus);
  }, []);

  // Called when the input editing the item loses focus.
  // The default behavior is to restore the status of the item to the one before editing.
  const handleInputBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    onEditingBlur?.(event, setStatus);
    if (!event.defaultPrevented) {
      setStatus(editStatus.current);
    }
  }, []);

  // Called when the input editing the item changes.
  // The default behavior is to restore the status of the item to the one before editing.
  const handleInputChange = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    onEditingChange?.(event, setStatus);
  }, []);

  const handleEditingKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    onEditingKeyDown?.(event);
    if (!event.defaultPrevented) {
      if (event.key === "Enter") {
        // Try to put the focus back on the button, it will trigger the onEditBlur callback.
        buttonRef.current?.focus();
        setStatus(editStatus.current);
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
      } else if (event.key === "Space" && collapsible) {
        // The Space key is used to toggle collapsible items.
        handleToggle(event);
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

  const Icon = useMemo(() => {
    if (icon && React.isValidElement(icon)) {
      return icon;
    } else if (icon) {
      const Icon = icon as SVGIcon;
      return <Icon className={classes.icon} data-component="tree-view-item-icon" />;
    }
    return null;
  }, [icon]);

  console.debug("TreeView.Item.render", { label, status, controlledStatus });

  return (
    <nav
      ref={ref}
      data-component="tree-view-item"
      className={classes.self}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <div className="relative h-9 w-full">
        <button ref={buttonRef} className={classes.button}>
          {Icon}
          <span className={classes.label} data-type="label">
            {status !== "editing" && label}
          </span>
          <span className={classes.status} data-component="tree-view-item-status">
            {status === "loading" && <Spinner size="sm" />}
            {status === "error" && <ErrorIcon className="text-red-400 w-4 h-4" />}
            {collapsible && (status === "open" || status === "closed") && (
              <ChevronIcon data-component="tree-view-item-toggle" className={classes.chevron} />
            )}
          </span>
        </button>
        {
          /*
           * If the status is "editing", we display an input to edit the label of the item.
           * The input is displayed on top of the button rather than replacing it because we need to be able to give back
           * the focus to the button when the input is blurred.
           */
          status === "editing" && (
            <TreeViewInput
              label={label}
              icon={!!Icon}
              onBlur={handleInputBlur}
              onChange={handleInputChange}
              onKeyDown={handleEditingKeyDown}
              pattern={pattern}
              required={required}
            />
          )
        }
      </div>
      {status === "open" && (
        <nav data-type="tree-view-children" className={classes.children}>
          <div className="flex-grow-0 flex-shrink-0 w-3"></div>
          <div className="flex-grow flex-col">{children}</div>
        </nav>
      )}
    </nav>
  );
});

TreeView.Item.displayName = "TreeViewItem";

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
   * The pattern attribute for editing validation.
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern
   */
  pattern?: string;

  /**
   * The [required][MDN Reference] attribute for editing validation.
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/required
   */
  required?: boolean;

  /**
   * A callback function that is called when the input loses focus.
   */
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * A callback function that is called when the input change.
   */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * A callback function that is called when a key is pressed while the input is focused.
   */
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * The input used to edit the label of a TreeViewItem.
 */
function TreeViewInput({ label, icon, required, pattern, onBlur, onChange, onKeyDown }: TreeViewInputProps) {
  return (
    <Input
      className="fixed z-10 -top-9 left-0 ml-1 mr-1 mt-1.5 h-9"
      density="compact"
      required={required}
      pattern={pattern}
      autoFocus
      defaultValue={label}
      type="text"
      prefix={icon && <TransparentIcon className="w-5 h-5" />}
      onBlur={onBlur}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}

export default TreeView;
