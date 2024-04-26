import cx from "classix";
import { SyntheticEvent, useRef, useState } from "react";
import { ColorsFunction, primary } from "@/utils/colors";
import { SVGIcon } from "@/utils/types";
import { raise } from "@/utils/telemetry";
import { useFloating, offset, autoUpdate, FloatingPortal } from "@floating-ui/react";
import Button, { ButtonVariant } from "@/components/core/Button";
import Menu from "@/components/core/Menu";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import React from "react";

export type DropdownVariant = ButtonVariant;

type DropdownProps = {
  /**
   * Additional classes to be added to the dropdown root element.
   */
  className?: string;

  /**
   * The color palette to be used for rendering the dropdown.
   *
   * By default, the primary color palette will be used.
   */
  colors?: ColorsFunction;

  /**
   * If `true`, the dropdown will be disabled.
   */
  disabled?: boolean;

  /**
   * The variant of the dropdown (`solid`, `outline` or `ghost`).
   */
  variant: DropdownVariant;

  /**
   * The values to be displayed in the dropdown.
   * This is an alternative to using the `Dropdown.Option` component.
   * This prop should not be used with the `children` prop, and vice versa.
   *
   * @example
   * ```tsx
   *  const values: DropdownValue[] = [
   *    { value: "1", label: "Option 1" },
   *    { value: "2", label: "Option 2" },
   *  ];
   *  return <Dropdown values={values} defaultValue="1" />;
   * ```
   */
  values?: DropdownValue[];

  /**
   * The default value of the dropdown.
   *
   * This will be the value of the dropdown when it is first rendered.
   */
  defaultValue?: string;

  /**
   * A collection of `Dropdown.Option` components.
   * This is an alternative to using the `values` prop.
   * This prop should not be used with the `values` prop, and vice versa.
   *
   * @example
   * ```tsx
   * <Dropdown>
   *  <Dropdown.Option value="1" label="Option 1" />
   *  <Dropdown.Option value="2" label="Option 2" />
   * </Dropdown>
   * ```
   */
  children?: React.ReactNode;

  /**
   * A function that will be called when the value of the dropdown changes.
   */
  onChange?: (value: string) => void;

  /**
   * The size of the dropdown (`sm`, `md` or `lg`).
   */
  size?: "sm" | "md" | "lg";
};

Dropdown.defaultProps = {
  variant: "outline",
  size: "md",
  colors: primary,
};

/**
 * A dropdown that can be used to select an option from a list of options.
 *
 * In its simplest form, the dropdown can be used with the `values` prop to display a list of options consisting of a
 * value and a label. The value is the actual value of the option, and the label is the text to be displayed in the
 * dropdown. But the dropdown can also be used with the `children` prop to display a list of `Dropdown.Option`
 * components having a more complex visual representation.
 *
 * @example
 * ```tsx
 * <Dropdown>
 *  <Dropdown.Option value="1" label="Option 1" />
 *  <Dropdown.Option value="2" label="Option 2" />
 * </Dropdown>
 * ```
 *
 * # Keyboard interaction
 * - `Enter`, `Space`, `↑` `↓` when the dropdown is focused: Open the dropdown.
 * - `Esc` when the dropdown is opened: Close the dropdown.
 */

function Dropdown({
  className,
  children,
  colors,
  disabled,
  variant,
  size,
  values,
  defaultValue,
  onChange,
}: DropdownProps) {
  // A reference to the top element used to handle the focus
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The open state of the dropdown
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);

  // The text to be displayed by the dropdown button (empty string if no value is selected)
  let label = value || "";

  // Setup of the menu using Floating UI
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(1)],
    open,
    onOpenChange: setOpen,
    placement: "bottom-end",
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
  });

  const handleButtonClick = () => {
    setOpen(!open);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    console.log(event.key);
    if ((!open && event.key === "Enter") || event.key === "ArrowDown" || event.key === " " || event.key === "ArrowUp") {
      setOpen(!open);
    }
  };

  const handleOptionClick = (value: string) => {
    setValue(value);
    if (onChange) {
      onChange(value);
    }
  };

  const handleClose = (event: React.SyntheticEvent) => {
    setOpen(false);
    if (event.type !== "blur") {
      event.preventDefault();
      dropdownRef.current?.focus();
    }
  };

  const setReferences = (element: HTMLDivElement) => {
    dropdownRef.current = element;
    refs.setReference(element);
  };

  values && children && raise("Dropdown component should not have both values and children.");
  if (values) {
    children = values.map((value) => (
      <Dropdown.Option
        key={value.value}
        value={value.value}
        icon={value.icon}
        label={value.label}
        command={value.command}
        disabled={value.disabled}
        onClick={handleOptionClick}
      />
    ));
    if (value) {
      label = values.find((v) => v.value === value)?.label ?? label;
    }
  } else if (children) {
    children = React.Children.map(children, (child: React.ReactElement<DropdownOptionProps>) => {
      if (React.isValidElement(child)) {
        if (child.props.value === value) {
          label = child.props.label ?? label;
        }
        return React.cloneElement(child, { onClick: handleOptionClick, disabled: child.props.disabled || disabled });
      }
      return child;
    });
  }

  const classes = cx("relative", size === "sm" && "w-32", size === "md" && "w-56", size === "lg" && "w-80", className);
  const iconClasses = cx(
    "flex w-4 h-4 ml-auto shrink-0",
    "transition-transform",
    !open && "rotate-90",
    open && "-rotate-90"
  );

  return (
    <div ref={setReferences} className="relative inline-block" onKeyDown={handleKeyDown} tabIndex={0}>
      <Button
        variant={variant}
        colors={colors}
        className={classes}
        disabled={disabled}
        onClick={handleButtonClick}
        tabIndex={-1}
      >
        <span className="flex flex-grow truncate">{label}</span>
        <ChevronIcon className={iconClasses} />
      </Button>
      {open && (
        <FloatingPortal>
          <div ref={refs.setFloating} style={floatingStyles}>
            <Menu onClose={handleClose} size={size}>
              <Menu.Group>{children}</Menu.Group>
            </Menu>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

export type DropdownValue = {
  value: string;
  label?: string;
  icon?: SVGIcon;
  command?: string;
  disabled?: boolean;
};

type DropdownOptionProps = DropdownValue & {
  className?: string;
  children?: React.ReactNode;
  onClick?: (value: string, event: SyntheticEvent) => void;
};

function DropdownOption({ className, value, icon, label, command, children, disabled, onClick }: DropdownOptionProps) {
  return (
    <Menu.Item
      className={className}
      label={label}
      icon={icon}
      command={command}
      disabled={disabled}
      id={value}
      onClick={onClick}
    >
      {children}
    </Menu.Item>
  );
}

Dropdown.Option = DropdownOption;
export default Dropdown;
