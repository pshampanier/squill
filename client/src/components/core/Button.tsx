import { ColorsContext } from "@/stores/ColorsContext";
import { ColorsFunction, primary } from "@/utils/colors";
import { cx } from "classix";
import { useContext } from "react";

export type ButtonType = "solid" | "outline" | "ghost";

type ButtonProps = {
  type?: ButtonType;
  icon?: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  text?: string;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
  colors?: ColorsFunction;
  disabled?: boolean;
};

Button.defaultProps = {
  type: "ghost",
};

export default function Button({ type, className, icon, text, tooltip, onClick, colors, disabled }: ButtonProps) {
  colors = colors || useContext(ColorsContext) || primary;
  const classes = cx(
    "flex flex-row h-9 items-center space-x-1 p-2 rounded box-border border-2 text-sm",
    colors("text"),
    (type === "solid" || type === "ghost") && "border-transparent",
    type === "solid" && colors("selected:background", "selected:text", "hover:background", "hover:text"),
    type === "outline" && "",
    type === "outline" && colors("border", "hover:border"),
    type === "ghost" && colors("hover:ghost-background", "hover:ghost-text"),
    disabled && "disabled:opacity-50 disabled:pointer-events-none",
    className
  );
  const Icon = icon;
  return (
    <button className={classes} onClick={onClick} title={tooltip} disabled={disabled} role="button">
      {icon && <Icon className="w-5 h-5" />}
      {text && <span>{text}</span>}
    </button>
  );
}
