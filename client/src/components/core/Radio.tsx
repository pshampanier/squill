import { ColorsFunction, primary } from "@/utils/colors";
import cx from "classix";
import { useRadio } from "@/hooks/use-radio";

type RadioProps = {
  id?: string;
  name?: string;
  value?: string;
  label?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  tabIndex?: number;
  className?: string;
  required?: boolean;
  colors?: ColorsFunction;
};

Radio.defaultProps = {
  colors: primary,
};

export default function Radio(props: RadioProps) {
  const { label, colors, disabled, className } = props;
  const { inputProperties, validated } = useRadio(props);

  const classes = {
    container: cx("flex items-center", disabled && "opacity-50 cursor-not-allowed", className),
    input: cx(
      "flex h-4 w-4 items-center justify-center transition-all duration-200 cursor-pointer rounded-full",
      "border checked:border-4",
      colors("border"),
      "checked:border-blue-600 dark:checked:border-blue-500",
      "text-gray-100 dark:text-gray-900 dark:checked:text-gray-100",
      "focus:outline outline-1 outline-offset-2 outline-blue-600 dark:outline-blue-500",
      validated &&
        "invalid:border-2 invalid:border-red-600 focus:invalid:ring-red-600 dark:invalid:border-red-500 dark:focus:invalid:ring-red-600"
    ),
    label: cx("ms-2 text-sm font-medium select-none", colors("text")),
  };

  // onInvalid={handleValidation}

  return (
    <div className={classes.container}>
      <input type="radio" className={classes.input} {...inputProperties} />
      {label && (
        <label htmlFor={inputProperties.id} className={classes.label}>
          {label}
        </label>
      )}
    </div>
  );
}
