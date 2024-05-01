import { cx } from "classix";
import { ReactNode } from "react";

type Props = {
  text: string;
  position: "top" | "bottom" | "left" | "right";
  align: "start" | "center" | "end";
  theme: "tooltip" | "error";
  children?: ReactNode;
};

export default function Tooltip({ text, position = "top", align = "center", theme = "tooltip", children }: Props) {
  const classes = cx(
    "absolute pointer-events-none shadow z-50",
    "w-max rounded px-2 py-1 text-sm font-medium text-gray-50",
    "opacity-0 group-hover:opacity-100 transition-opacity",
    { tooltip: "bg-gray-900", error: "bg-red-500" }[theme],
    {
      top: "-top-10",
      bottom: "-bottom-10",
      left: "right-5 top-1/2 transform -translate-y-1/2 -translate-x-1",
      right: "left-5 top-1/2 transform -translate-y-1/2",
    }[position],
    position === "top" || position === "bottom"
      ? { start: "left-0", center: "left-1/2 transform -translate-x-1/2", end: "right-0" }[align]
      : undefined
  );
  return (
    <div className="group relative w-max">
      {children}
      <span className={classes}>{text}</span>
    </div>
  );
}
