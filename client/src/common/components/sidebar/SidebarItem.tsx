import { ReactNode, useState } from "react";

import Tooltip from "../core/Tooltip";

import ChevronIcon from "@/icons/chevron-right.svg?react";
import LockClosedIcon from "@/icons/lock-closed.svg?react";
import ErrorIcon from "@/icons/exclamation-triangle.svg?react";
import { Spinner } from "../core/Spinner";

/**
 * @property label - the text to display for the item.
 * @property onClick - if provided, will be called when the item is clicked. That function can return true to notify the
 *                     SidebarItem that the click was handled and that it should not try to load the content, other if
 *                     the click was not handled, the SidebarItem will try to load the content.
 */
type SidebarItemProps = {
  label: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  collapsible?: boolean;
  selected?: boolean;
  locked?: boolean;
  loaderfn?: () => Promise<void>;
  onClick?: () => boolean;
  children?: ReactNode;
};

export default function SidebarItem({
  children,
  label,
  collapsible,
  icon,
  locked,
  loaderfn,
  selected,
  onClick,
}: SidebarItemProps) {
  const Icon = icon;
  const [collapsed, setCollapsed] = useState(true);
  const [loadingState, setLoadingState] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [loadingError, setLoadingError] = useState<Error | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    const handled = onClick && onClick();
    if (collapsible) {
      setCollapsed(!collapsed);
    }

    if (handled || !loaderfn) {
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

  const textColor = locked ? "text-gray-400" : "text-gray-600";
  const backgroundColor = selected ? "bg-blue-100 dark:bg-gray-800" : "hover:bg-gray-200 dark:hover:bg-gray-800";

  return (
    <div>
      <button
        className={`flex items-center px-3 py-1 w-full ${textColor} ${backgroundColor} transition-colors duration-300 transform rounded-lg dark:text-gray-200  dark:hover:text-gray-200 hover:text-gray-700`}
        onClick={handleClick}
      >
        <Icon className="w-5 h-5" />
        <span className="mx-2 text-xs font-medium">{label}</span>
        <span className="flex ml-auto">
          {loadingState === "loading" && <Spinner />}
          {loadingState === "error" && (
            <Tooltip position="bottom" align="end" theme="error" text={loadingError?.message}>
              <ErrorIcon className="w-3 h-3 mr-1 text-red-400" />
            </Tooltip>
          )}
          {locked && <LockClosedIcon className="w-3 h-3 mr-1" />}
          {collapsible && <ChevronIcon className={`w-3 h-3 transition-all ${!collapsed && "rotate-90"}`} />}
        </span>
      </button>
      {!collapsed && <div className="ml-6">{children}</div>}
    </div>
  );
}
