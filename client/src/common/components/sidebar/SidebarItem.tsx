import { ReactNode, useState } from "react";

import Tooltip from "../core/Tooltip";

import ChevronIcon from "@/icons/chevron-right.svg?react";
import LockClosedIcon from "@/icons/lock-closed.svg?react";
import ErrorIcon from "@/icons/exclamation-triangle.svg?react";
import { Spinner } from "../core/Spinner";

type SidebarItemProps = {
  label: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  collapsible?: boolean;
  selected?: boolean;
  locked?: boolean;
  loaderfn?: () => Promise<void>;
  children?: ReactNode;
};

export default function SidebarItem({ children, label, collapsible, icon, locked, loaderfn }: SidebarItemProps) {
  const Icon = icon;
  const [collapsed, setCollapsed] = useState(true);
  const [loadingState, setLoadingState] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [loadingError, setLoadingError] = useState<Error | null>(null);

  function toggleCollapse() {
    if (collapsible) {
      setCollapsed(!collapsed);
      if (collapsed && (loadingState === "pending" || loadingState === "error") && typeof loaderfn === "function") {
        setLoadingState("loading");
        loaderfn()
          .then(() => {
            setLoadingState("success");
          })
          .catch((e) => {
            setLoadingState("error");
            setCollapsed(collapsed);
            setLoadingError(e);
          });
      }
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (collapsible) {
      toggleCollapse();
    } else if (typeof loaderfn === "function") {
      setLoadingState("loading");
      loaderfn()
        .then(() => {
          setLoadingState("success");
        })
        .catch((e) => {
          setLoadingState("error");
          setLoadingError(e);
        });
    }
  }

  const textColor = locked ? "text-gray-400" : "text-gray-600";

  return (
    <div>
      <a
        className={`flex items-center px-3 py-1 ${textColor} transition-colors duration-300 transform rounded-lg dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:text-gray-700`}
        href="#"
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
      </a>
      {!collapsed && <div className="ml-6">{children}</div>}
    </div>
  );
}
