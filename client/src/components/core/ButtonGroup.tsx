import cx from "classix";
import { SVGIcon } from "@/utils/types";
import React, { createContext, useContext, useRef, useState } from "react";
import { assert } from "@/utils/telemetry";
import { secondary as colors } from "@/utils/colors";

type ButtonGroupProps = {
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (name: string) => void;
};

const ButtonGroupContext = createContext(null);

function ButtonGroup({ children, size, className, defaultValue, disabled, onChange }: ButtonGroupProps) {
  const [value, setValue] = useState(defaultValue);

  // collecting the name of the children components
  const childrenNames = useRef(
    React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return child.props.name;
      }
    }),
  );

  // setting the value of the button group when a button is clicked
  const handleSetValue = (name: string) => {
    setValue(name);
    onChange && onChange(name);
  };

  children = React.Children.map(children, (child: React.ReactElement<ButtonGroupItemProps>) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        disabled: child.props.disabled || disabled,
        onClick: handleSetValue,
      });
    }
  });

  // number of buttons & the index of the selected button
  const values = React.Children.count(children);
  const valueIndex = childrenNames.current.indexOf(value);

  assert(valueIndex !== -1, "ButtonGroup: value prop must be one of the children's name");
  assert(values > 0 && values <= 12, "ButtonGroup: must have at least one child and at most 12 children");

  const gridSize = [
    "grid-cols-1",
    "grid-cols-2",
    "grid-cols-3",
    "grid-cols-4",
    "grid-cols-5",
    "grid-cols-6",
    "grid-cols-7",
    "grid-cols-8",
    "grid-cols-9",
    "grid-cols-10",
    "grid-cols-11",
    "grid-cols-12",
  ][values - 1];
  const navClasses = cx(
    `grid ${gridSize} grid-rows-1`,
    size === "xs" && "h-[22px]",
    size === "sm" && "h-6",
    (size === "md" || !size) && "h-7",
    size === "lg" && "h-9",
  );

  // the span element is used to display the selected button
  const spanClasses = cx(
    colors("selected:background"),
    disabled && "disabled:opacity-50 disabled:pointer-events-none",
    "absolute rounded-md shadow-sm",
    "transition-all ease-in-out duration-200",
    size === "xs" && "h-[22px]",
    size === "sm" && "h-6",
    (size === "md" || !size) && "h-7",
    size === "lg" && "h-9",
  );
  const spanStyles = {
    width: `calc((100% / ${values}))`,
    left: `calc((100% / ${values}) * ${valueIndex})`,
  };

  const divClasses = cx("relative rounded-lg transition p-1 flex-shrink-0", colors("background", "text"), className);

  return (
    <div className={divClasses}>
      <div className="relative">
        <span className={spanClasses} style={spanStyles}></span>
        <nav className={navClasses} aria-label="Tabs" role="tablist">
          <ButtonGroupContext.Provider value={{ value, setValue }}>{children}</ButtonGroupContext.Provider>
        </nav>
      </div>
    </div>
  );
}

type ButtonGroupItemProps = {
  name: string;
  label?: string;
  icon?: SVGIcon;
  disabled?: boolean;
  onClick?: (name: string) => void;
};

function ButtonGroupItem({ name, label, icon, disabled, onClick }: ButtonGroupItemProps) {
  const { value } = useContext(ButtonGroupContext);
  const selected = value === name;
  const classes = {
    button: cx(
      "flex flex-row items-center justify-center text-xs font-medium whitespace-nowrap text-ellipsis overflow-hidden",
      "rounded-md px-3 z-50",
      "transition-colors ease-in-out duration-200",
      selected && colors("selected:text"),
      !selected && colors("hover:text", "hover:background"),
      !selected && "hover:bg-opacity-30 dark:hover:bg-opacity-30",
      disabled && "disabled:opacity-50 disabled:pointer-events-none",
    ),
    icon: cx("h-full w-full p-1"),
  };
  const handleClick = () => {
    if (onClick) {
      onClick(name);
    }
  };
  const Icon = icon;
  return (
    <button type="button" className={classes.button} onClick={handleClick} disabled={disabled} role="tab">
      {icon && (
        <span className={cx("h-full", label && "mr-2")}>
          <Icon className={classes.icon} />
        </span>
      )}
      {label}
    </button>
  );
}

ButtonGroup.Item = ButtonGroupItem;
ButtonGroup.Option = ButtonGroupItem;
export default ButtonGroup;
