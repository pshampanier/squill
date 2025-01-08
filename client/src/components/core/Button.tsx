import { ColorsContext } from "@/stores/ColorsContext";
import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import { twMerge as tw } from "tailwind-merge";
import { SyntheticEvent, useContext } from "react";

export type ButtonVariant = "solid" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  size = "lg",
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
    "flex flex-row items-center rounded box-border border-2 text-sm select-none ripple",
    colors("text"),
    (variant === "solid" || variant === "ghost") && "border-transparent",
    variant === "solid" && colors("solid:background", "solid:text", "hover:background", "hover:text"),
    variant === "danger" &&
      colors(
        "danger-background",
        "danger-border",
        "solid:text",
        "hover:background",
        "hover:text",
        "hover:danger-background",
        "hover:danger-border",
      ),
    variant === "outline" && "",
    variant === "outline" && colors("border", "hover:border"),
    variant === "ghost" && colors("hover:ghost-background", "hover:ghost-text"),
    size === "xs" && "h-[22px] p-0.5",
    size === "sm" && "h-6 p-0.5",
    size === "md" && "h-7 p-1",
    size === "lg" && "h-9 p-2",
    disabled && "disabled:opacity-50 disabled:pointer-events-none",
    className,
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
      {icon && <Icon className={tw(size === "xs" ? "w-4 h-4" : "w-5 h-5")} />}
      {text && <span className={icon && "ml-1"}>{text}</span>}
      {children}
    </button>
  );
}
