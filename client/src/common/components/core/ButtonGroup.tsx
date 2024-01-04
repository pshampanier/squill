import cx from "classix";
import { SVGIcon } from "@/utils/types";
import React, { createContext, useContext, useRef, useState } from "react";

type ButtonGroupProps = {
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (name: string) => void;
};

const ButtonGroupContext = createContext(null);

function ButtonGroup({ children, size, defaultValue, disabled, onChange }: ButtonGroupProps) {
  const [value, setValue] = useState(defaultValue);

  // collecting the name of the chidren components
  const childrenNames = useRef(
    React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return child.props.name;
      }
    })
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
    size === "lg" && "h-9"
  );

  const spanClasses = cx(
    disabled ? "bg-gray-300" : "bg-blue-600",
    "absolute rounded-md shadow-sm",
    "transition-all ease-in-out duration-200",
    size === "xs" && "h-[22px]",
    size === "sm" && "h-6",
    (size === "md" || !size) && "h-7",
    size === "lg" && "h-9"
  );
  const spanStyles = {
    width: `calc((100% / ${values}))`,
    left: `calc((100% / ${values}) * ${valueIndex})`,
  };

  const divClasses = cx(
    "relative bg-gray-100 rounded-lg transition p-1 dark:bg-gray-700",
    !disabled && "hover:bg-gray-200 dark:hover:bg-gray-700"
  );

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
  const classes = cx(
    !disabled && selected && "text-white dark:bg-gray-800 dark:text-gray-400",
    !disabled && !selected && "hover:text-gray-700 dark:hover:text-white",
    disabled && "text-gray-400",
    "flex flex-row items-center text-xs font-medium whitespace-nowrap text-ellipsis overflow-hidden",
    "bg-transparent rounded-md px-3",
    "dark:text-gray-400 z-50",
    "transition-colors ease-in-out duration-200"
  );
  const handleClick = () => {
    if (onClick) {
      onClick(name);
    }
  };
  const Icon = icon;
  return (
    <button type="button" className={classes} onClick={handleClick} disabled={disabled} role="tab">
      {icon && (
        <span className={label && "mr-2"}>
          <Icon />
        </span>
      )}
      {label}
    </button>
  );
}

ButtonGroup.Item = ButtonGroupItem;
export default ButtonGroup;
