import { ReactNode } from "react";

type Props = {
  text: string;
  position: "top" | "bottom" | "left" | "right";
  align: "start" | "center" | "end";
  theme: "tooltip" | "error";
  children?: ReactNode;
};

const defaultProps: Props = {
  position: "top",
  align: "center",
  theme: "tooltip",
  text: "",
};

export default function Tooltip({ text, position, align, theme, children }: Props) {
  let className =
    "absolute pointer-events-none overflow-visible w-max rounded px-2 py-1 text-sm font-medium text-gray-50 opacity-0 shadow transition-opacity group-hover:opacity-100";
  className += " " + { tooltip: "bg-gray-900", error: "bg-red-500" }[theme];
  className +=
    " " +
    {
      top: "-top-10",
      bottom: "-bottom-10",
      left: "right-5 top-1/2 transform -translate-y-1/2 -translate-x-1",
      right: "left-5 top-1/2 transform -translate-y-1/2",
    }[position];
  if (position === "top" || position === "bottom") {
    className += " " + { start: "left-0", center: "left-1/2 transform -translate-x-1/2", end: "right-0" }[align];
  }
  return (
    <div className="group relative w-max">
      {children}
      <span className={className}>{text}</span>
    </div>
  );
}

Tooltip.defaultProps = defaultProps;
