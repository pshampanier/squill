import { ReactNode, useState } from "react";

import Tooltip from "../core/Tooltip";

import ChevronIcon from "@/icons/chevron-right.svg?react";
import LockClosedIcon from "@/icons/lock-closed.svg?react";
import ErrorIcon from "@/icons/exclamation-triangle.svg?react";
import { Spinner } from "../core/Spinner";
import { useClasses } from "@/utils/classes";

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

  const classes = useClasses([
    // color transition on selected or hover
    "transition-colors duration-300 transform",
    {
      // text color
      light: locked ? "text-gray-400 hover:text-gray-700" : "text-gray-600",
      dark: locked ? "text-gray-200 hover:text-gray-200" : "text-gray-600",
    },
    {
      // background color
      light: selected ? "bg-gray-200" : "hover:bg-gray-200",
      dark: selected ? "bg-gray-100" : "hover:bg-gray-800",
    },
  ]);

  return (
    <div>
      <button className={`flex items-center px-3 py-1 w-full rounded-lg ${classes}`} onClick={handleClick}>
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
