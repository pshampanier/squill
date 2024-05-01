import { ColorsContext } from "@/stores/ColorsContext";
import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import { twMerge as tw } from "tailwind-merge";
import { SyntheticEvent, useContext } from "react";

export type ButtonVariant = "solid" | "outline" | "ghost";

type ButtonProps = {
  variant?: ButtonVariant;
  icon?: SVGIcon;
  text?: string;
  tooltip?: string;
  onClick?: (event: SyntheticEvent) => void;
  onBlur?: () => void;
  className?: string;
  colors?: ColorsFunction;
  disabled?: boolean;
  children?: React.ReactNode;
  tabIndex?: number;
};

export default function Button({
  variant = "ghost",
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
  const classes = tw(
    "flex flex-row h-9 items-center p-2 rounded box-border border-2 text-sm select-none ripple",
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
