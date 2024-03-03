import { ColorsFunction, primary } from "@/utils/colors";
import cx from "classix";
import React, { SyntheticEvent, useEffect, useState } from "react";

type InputProps = {
  type: "text" | "password" | "number";

  name?: string;

  /**
   * The initial value of the input.
   */
  value?: string;

  /**
   * The label of the input.
   */
  label?: string;

  /**
   * Text that appears in the input when it has no value set.
   */
  placeholder?: string;

  /**
   * The size of the dropdown (`sm`, `md` or `lg`).
   */
  size?: "sm" | "md" | "lg" | "full";

  /**
   * The step attribute works with the number type input field.
   * It indicates the precision of the number field.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number#step
   */
  step?: number;

  onChange?: (event: SyntheticEvent) => void;
  onBlur?: (event: SyntheticEvent) => void;
  colors?: ColorsFunction;
  disabled?: boolean;
  error?: boolean;
  tabIndex?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;

  readonly?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
};

Input.defaultProps = {
  size: "full",
  colors: primary,
};

export default function Input(props: InputProps) {
  const { type, size, label, onBlur, prefix, suffix, className } = props;

  // State for validation
  //
  // Because we want to show the validation message/state only after the user has tried to enter a value or submitted
  // the form, we need to keep track of whether the input has been validated or not. `validated` is a boolean that is
  // set to `true` after the input is validated for the first time, whatever the result of the validation.
  const [validated, setValidated] = useState<boolean>(false);

  // Ref for the input, this is used to calculate the padding of the input when a prefix or a suffix is used.
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Properties for the input element
  const inputProperties = {
    value: props.value,
    placeholder: props.placeholder,
    disabled: props.disabled,
    readOnly: props.readonly,
    required: props.required,
    step: props.step,
    min: props.min,
    max: props.max,
  };

  const handleValidation = (event: React.FormEvent<HTMLInputElement>) => {
    // TODO: We need to handle the validation of the input here.
    // const validity = event.currentTarget.validity;

    // We are setting the input `validated` state to `true` so that the input shows the validation message/state.
    setValidated(true);

    // We don't want the web browser to show the default error message.
    event.preventDefault();
    return;
  };

  // When the input loses focus, we bubble the event and if the event is not cancelled we force the input to check
  // it's validity.
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    if (!event.defaultPrevented) {
      event.target.checkValidity();
    }
  };

  // When the input is rendered, we calculate the padding of the input based on the prefix and suffix.
  useEffect(() => {
    if (inputRef.current) {
      if (prefix) {
        const htmlPrefix = inputRef.current.previousElementSibling;
        const prefixWidth = htmlPrefix.getBoundingClientRect().width;
        inputRef.current.style.paddingLeft = `${prefixWidth}px`;
      }
      if (suffix) {
        const htmlSuffix = inputRef.current.nextElementSibling;
        const suffixWidth = htmlSuffix.getBoundingClientRect().width;
        inputRef.current.style.paddingRight = `${suffixWidth}px`;
      }
    }
  });

  const classes = {
    container: cx(size === "sm" && "w-32", size === "md" && "w-56", size === "lg" && "w-80", className),
    label: cx("block mb-2 text-sm font-medium text-gray-900 dark:text-white"),
    input: cx(
      "block",
      "focus:outline-none focus:ring focus:valid:ring-blue-500 focus:valid:border-blue-500 dark:focus:ring-blue-500 dark:focus:valid:border-blue-500",
      "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
      validated &&
        "invalid:border-red-600 focus:invalid:ring-red-600 dark:invalid:border-red-600 dark:focus:invalid:ring-red-600"
    ),
  };

  return (
    <div className={classes.container}>
      {label && (
        <label htmlFor="first_name" className={classes.label}>
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 start-0 flex items-center px-3 pointer-events-none">{prefix}</div>
        )}
        <input
          ref={inputRef}
          type={type}
          id="first_name"
          step="0.01"
          className={classes.input}
          {...inputProperties}
          onInvalid={handleValidation}
          onBlur={handleBlur}
        />
        {suffix && <div className="absolute inset-y-0 end-0 flex items-center px-3 pointer-events-none">{suffix}</div>}
      </div>
    </div>
  );
}
