import { KeyboardShortcut, SVGIcon } from "@/utils/types";
import cx from "classix";
import Kbd from "@/components/core/Kbd";
import { primary as colors } from "@/utils/colors";
import { executeCommand, getCommand } from "@/utils/commands";
import React, { useEffect, useRef } from "react";

type MenuProps = {
  onClose?: (event: React.SyntheticEvent) => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "auto";

  /**
   * The tab index of the menu (default to 0).
   *
   * Allow to make the menu focusable. If set to -1, the menu will not be focused.
   */
  tabIndex?: number;
};

function Menu({ children, size = "auto", className, onClose, tabIndex = 0 }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // TODO: Use a context to implement keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (onClose) {
        onClose(event);
        event.stopPropagation();
      }
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (onClose) {
      const currentTarget = event.currentTarget;
      const relatedTarget = event.relatedTarget as Node;
      if (!currentTarget.contains(relatedTarget)) {
        onClose(event);
      }
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onClose?.(event);
  };

  useEffect(() => {
    if (tabIndex !== -1) {
      menuRef.current?.focus();
    }
  }, [tabIndex]);

  const classes = cx(
    "font-medium select-none",
    size === "sm" && "w-32",
    size === "md" && "w-56",
    size === "lg" && "w-80",
    size === "auto" && "min-w-fit",
    "divide-y z-50",
    "overflow-hidden",
    colors("background", "text", "border", "divide"),
    "rounded-md shadow-lg",
    "border focus:outline-none",
    className,
  );
  return (
    <div
      ref={menuRef}
      className={classes}
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

type MenuItemProps = {
  className?: string;
  icon?: SVGIcon;
  label?: string;
  children?: React.ReactNode;
  disabled?: boolean /** the item is disabled  and cannot be selected */;
  selected?: boolean /** the item is the active/focused item */;
  command?: string;
  shortcut?: KeyboardShortcut;
  id?: string;
  onClick?: (value: string, event: React.SyntheticEvent) => void;
  onSelect?: (value: string, event: React.SyntheticEvent) => void;
};

function MenuItem({ className, icon, label, children, disabled, onClick, command, shortcut, id }: MenuItemProps) {
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (onClick) {
      onClick(command || id, event);
    }
    if (!event.defaultPrevented && command) {
      executeCommand(command);
    }
  };

  const Icon = icon || getCommand(command)?.icon;
  label = label || getCommand(command)?.label;
  shortcut = shortcut || getCommand(command)?.shortcut;

  const classes = cx(
    "text-gray-700 block px-4 py-2 gap-x-2 min-h-9 mx-1 text-sm flex flex-row rounded",
    !disabled && colors("hover:ghost-background", "hover:ghost-text"),
    disabled && "opacity-50 pointer-events-none",
    !(onClick || command) && "pointer-events-none",
    className,
  );
  return (
    <a href="#" className={classes} role="menuitem" tabIndex={-1} onClick={handleClick} draggable="false">
      {Icon && <Icon className="flex-none w-5 h-5" />}
      {children}
      {label && <span className="flex grow whitespace-nowrap overflow-hidden truncate">{label}</span>}
      {shortcut && <Kbd className="ml-auto" shortcut={shortcut} />}
    </a>
  );
}

type MenuGroupProps = {
  children: React.ReactNode;
};

function MenuGroup({ children }: MenuGroupProps) {
  return (
    <div className="flex flex-col py-1" role="none">
      {children}
    </div>
  );
}

Menu.Group = MenuGroup;
Menu.Item = MenuItem;
export default Menu;
