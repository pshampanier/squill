import { ColorsContext } from "@/stores/ColorsContext";
import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import { cx } from "classix";
import { useContext } from "react";

export type ButtonVariant = "solid" | "outline" | "ghost";

type ButtonProps = {
  variant?: ButtonVariant;
  icon?: SVGIcon;
  text?: string;
  tooltip?: string;
  onClick?: () => void;
  onBlur?: () => void;
  className?: string;
  colors?: ColorsFunction;
  disabled?: boolean;
  children?: React.ReactNode;
  tabIndex?: number;
};

Button.defaultProps = {
  variant: "ghost",
};

export default function Button({
  variant,
  className,
  icon,
  text,
  tooltip,
  onClick,
  onBlur,
  colors,
  disabled,
  children,
  tabIndex,
}: ButtonProps) {
  colors = colors || useContext(ColorsContext) || primary;
  const classes = cx(
    "flex flex-row h-9 items-center p-2 rounded box-border border-2 text-sm",
    colors("text"),
    (variant === "solid" || variant === "ghost") && "border-transparent",
    variant === "solid" && colors("selected:background", "selected:text", "hover:background", "hover:text"),
    variant === "outline" && "",
    variant === "outline" && colors("border", "hover:border"),
    variant === "ghost" && colors("hover:ghost-background", "hover:ghost-text"),
    disabled && "disabled:opacity-50 disabled:pointer-events-none",
    className
  );
  const Icon = icon;

  const handleOnBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <button
      className={classes}
      onClick={onClick}
      onBlur={handleOnBlur}
      title={tooltip}
      disabled={disabled}
      role="button"
      tabIndex={tabIndex}
    >
      {icon && <Icon className="w-5 h-5" />}
      {text && <span className={icon && "ml-1"}>{text}</span>}
      {children}
    </button>
  );
}
