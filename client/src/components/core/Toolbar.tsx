import { ColorsContext } from "@/stores/ColorsContext";
import { primary, ColorsFunction } from "@/utils/colors";
import { cx } from "classix";
import { ReactNode, useContext } from "react";

type ToolbarProps = {
  size?: "xs" | "sm" | "md" | "lg";
  colors?: ColorsFunction;
  className?: string;
  children?: ReactNode;
};

export default function Toolbar({ size = "lg", colors: defaultColor, className, children }: ToolbarProps) {
  const colors = defaultColor || useContext(ColorsContext) || primary;
  const classes = cx(
    "flex flex-row items-center space-x-0.5",
    size === "xs" && "h-[22px]",
    size === "sm" && "h-6",
    size === "md" && "h-7",
    size === "lg" && "h-9",
    colors("background", "text"),
    className,
  );
  return (
    <div data-component="toolbar" className={classes}>
      {children}
    </div>
  );
}
