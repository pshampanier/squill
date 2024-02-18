import { cx } from "classix";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useFloating, offset, autoUpdate, FloatingPortal } from "@floating-ui/react";

import { Spinner } from "@/components/core/Spinner";
import Tooltip from "@/components/core/Tooltip";

import ChevronIcon from "@/icons/chevron-right.svg?react";
import LockClosedIcon from "@/icons/lock-closed.svg?react";
import ErrorIcon from "@/icons/exclamation-triangle.svg?react";
import { secondary as colors } from "@/utils/colors";
import { registerActionIfNeeded, unregisterAction } from "@/utils/commands";

type SidebarEditProps = {
  defaultValue: string;
  onCancelled: () => void;
  onCompleted: (value: string) => Promise<void>;
  onChange?: (value: string) => void;
};

function SidebarEdit({ defaultValue, onChange, onCancelled, onCompleted }: SidebarEditProps) {
  /// The helper text will be displayed when the user's input is invalid.
  const [helper, setHelper] = useState<string>("");

  /// Floating UI setup for the helper text.
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(4)],
    placement: "bottom-start",
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancelled();
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.stopPropagation();
      if (helper.length === 0) {
        // The user's input has no issue detected so far, we can try to validate it.
        const target = event.target as HTMLInputElement;
        if (target.value === defaultValue) {
          // No change, cancel the editing
          onCancelled();
        } else {
          // There is a change, we can try to validate it calling the onCompleted async function.
          target.readOnly = true;
          onCompleted(target.value).catch((err) => {
            setHelper(err.message);
            target.readOnly = false;
          });
        }
      }
    }
  };

  const handleBlur = () => {
    onCancelled();
  };

  /// Validation of user's input when editing the name of a catalog entry.
  /// The helper text will be updated with the error message if the name is invalid, otherwise it will be hidden
  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      try {
        onChange(event.target.value);
        setHelper("");
      } catch (err) {
        setHelper(err.message);
      }
    }
  };

  /// Focus the input and select its content when the component is mounted.
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current.focus();
    inputRef.current.select();
    inputRef;
  }, []);

  return (
    <>
      <div ref={refs.setReference} className="relative flex flex-row flex-1">
        <input
          ref={inputRef}
          type="text"
          defaultValue={defaultValue}
          className="flex-1 min-w-0 text-xs font-medium rounded h-6 px-2 focus:outline-none"
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onChange={handleOnChange}
        />
        {helper.length > 0 && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="w-80 p-2 bg-red-600 text-white text-sm rounded"
            >
              {helper}
            </div>
          </FloatingPortal>
        )}
      </div>
    </>
  );
}

/**
 * @property label - the text to display for the item.
 * @property onClick - if provided, will be called when the item is clicked. That function can return true to notify the
 *                     SidebarItem that the click was handled and that it should not try to load the content, other if
 *                     the click was not handled, the SidebarItem will try to load the content.
 */
export type SidebarItemProps = {
  label: string;
  icon?: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  collapsible?: boolean;
  editable?: boolean;
  selected?: boolean;
  locked?: boolean;
  loaderfn?: () => Promise<void>;
  onClick?: () => boolean;
  children?: ReactNode;
  onChange?: (newLabel: string) => void;
  onEditingCompleted?: (newLabel: string) => Promise<void>;
};

export default function SidebarItem({
  children,
  label,
  collapsible,
  editable,
  icon,
  locked,
  loaderfn,
  selected,
  onClick,
  onChange,
  onEditingCompleted,
}: SidebarItemProps) {
  const Icon = icon;
  const [editMode, setEditMode] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [loadingState, setLoadingState] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [loadingError, setLoadingError] = useState<Error | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    const handled = onClick && onClick();
    if (collapsible) {
      setCollapsed(!collapsed);
    }

    if (!collapsed || handled || !loaderfn) {
      // we are done
      return;
    }

    // loading the content for the first time or reloading after an error
    setLoadingState("loading");
    loaderfn()
      .then(() => {
        setLoadingState("success");
      })
      .catch((e) => {
        setLoadingState("error");
        setCollapsed(true);
        setLoadingError(e);
      });
  };

  // We need to use a ref to store the function because we need to register it as a command action, and we would be able
  // unregister it later if the component was re-rendered (renamed would be a different function instance)
  const rename = useRef(() => {
    setEditMode(true);
  });

  const handleFocus = () => {
    if (editable && registerActionIfNeeded("sidebar.rename", rename.current)) {
      console.log("sidebar.rename registered");
    }
  };

  const handleBlur = () => {
    if (editable) {
      console.log("unregister sidebar.rename");
      unregisterAction("sidebar.rename", rename.current);
    }
  };

  const handleEditingCancelled = () => {
    setEditMode(false);
  };

  const handleEditingCompleted = async (value: string) => {
    if (onEditingCompleted) {
      await onEditingCompleted(value);
      setEditMode(false);
    } else {
      return;
    }
  };

  const classes = cx(
    "flex flex-row items-center gap-x-2 h-9 px-2 w-full rounded",
    "font-medium items-center",
    "transition-colors duration-300 transform",
    colors("hover:ghost-background", "hover:ghost-text"),
    locked && "opacity-50",
    selected && colors("selected:ghost-background")
  );

  return (
    <div>
      <button className={classes} onClick={handleClick} onFocus={handleFocus} onBlur={handleBlur}>
        {Icon && <Icon className="flex-none w-5 h-5" />}
        {!editMode ? (
          <>
            <span className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
            <span className="flex ml-auto gap-x-1 items-center">
              {loadingState === "loading" && <Spinner size="sm" />}
              {loadingState === "error" && (
                <Tooltip position="left" align="end" theme="error" text={loadingError?.message}>
                  <ErrorIcon className="text-red-400 w-4 h-4" />
                </Tooltip>
              )}
              {locked && <LockClosedIcon className="w-4 h-4" />}
              {collapsible && <ChevronIcon className={`w-4 h-4 transition-all ${!collapsed && "rotate-90"}`} />}
            </span>
          </>
        ) : (
          <SidebarEdit
            defaultValue={label}
            onCancelled={handleEditingCancelled}
            onCompleted={handleEditingCompleted}
            onChange={onChange}
          />
        )}
      </button>
      {!collapsed && <div className="ml-3">{children}</div>}
    </div>
  );
}
