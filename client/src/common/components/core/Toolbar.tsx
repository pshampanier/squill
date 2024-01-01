import { useClasses } from "@/utils/classes";
import { ReactNode } from "react";

import CommandButton from "@/components/core/CommandButton";
import IconButton from "@/components/core/IconButton";

type ToolbarProps = {
  className?: string;
  children?: ReactNode;
};

function Toolbar({ className, children }: ToolbarProps) {
  const classes = useClasses(["flex flex-row items-center h-full space-x-1", className]);
  return <div className={classes}>{children}</div>;
}

type ToolbarCommandButtonProps = {
  command: string;
};

function ToolbarCommandButton({ command }: ToolbarCommandButtonProps) {
  const classes = "w-8 h-8 p-1 rounded hover:bg-blue-600 text-white";
  return CommandButton({ command, className: classes });
}

type ToolbarIconButtonProps = {
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
};

function ToolbarIconButton({ icon, onClick }: ToolbarIconButtonProps) {
  const classes = "w-8 h-8 p-1 rounded hover:bg-blue-600 text-white";
  return IconButton({ icon, onClick, className: classes });
}

Toolbar.CommandButton = ToolbarCommandButton;
Toolbar.IconButton = ToolbarIconButton;
export default Toolbar;
