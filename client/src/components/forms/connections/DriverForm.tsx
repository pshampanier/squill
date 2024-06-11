import { primary as colors } from "@/utils/colors";
import { Driver } from "@/models/drivers";
import Radio from "@/components/core/Radio";
import cx from "classix";
import React, { forwardRef } from "react";

type DriverFormProps = {
  name?: string;
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  drivers: Driver[];
};

/**
 * A form to select a driver from a list of drivers.
 */
const DriverForm = forwardRef<HTMLFormElement, DriverFormProps>((props, ref) => {
  const { name, className, value, onChange, drivers } = props;

  const classes = cx(
    "font-medium select-none w-full",
    "divide-y my-1",
    "overflow-hidden",
    colors("background", "text", "border", "divide"),
    "rounded-md",
    "focus:outline-none",
  );

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <form ref={ref} name={name} className={className}>
      <div className={classes} role="radiogroup" aria-labelledby="driver-group">
        {drivers.map((driver) => {
          return (
            <DriverRadio
              key={driver.name}
              driver={driver}
              onChange={handleOnChange}
              defaultChecked={value === driver.name}
            />
          );
        })}
      </div>
    </form>
  );
});

type DriverRadioProps = {
  driver: Driver;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultChecked?: boolean;
};

/**
 * A radio button to select a driver.
 */
function DriverRadio({ driver, onChange, defaultChecked }: DriverRadioProps) {
  const id = `driver-${driver.name}`;
  return (
    <div className="py-1">
      <div className={cx("rounded flex flex-row space-x-4 p-4", colors("hover:ghost-background", "hover:ghost-text"))}>
        <label htmlFor={id} className="flex flex-row space-x-4 grow">
          <div className="flex w-16 h-16 p-3 flex-shrink-0 rounded-full bg-gray-50 dark:bg-gray-700 items-center">
            <img
              src={`/icons/drivers/${driver.icon}`}
              alt={driver.name}
              className="aspect-square w-10 h-10 object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="flex font-semibold">{driver.label}</span>
            <span className="flex text-xs">{driver.description}</span>
          </div>
        </label>
        <Radio id={id} name="driver" value={driver.name} onChange={onChange} defaultChecked={defaultChecked} required />
      </div>
    </div>
  );
}

DriverForm.displayName = "DriverSelectionForm";
export default DriverForm;
