import cx from "classix";
import React, { ChangeEvent, SyntheticEvent, KeyboardEvent, useEffect, useState } from "react";

type InputProps = {
  type: "text" | "password" | "number";

  /**
   * An identifier (ID) which must be unique in the whole document.
   */
  id?: string;

  /**
   * Name of the form control.
   *
   * Submitted with the form as part of a name/value pair
   */
  name?: string;

  /**
   * The initial value of the input.
   */
  defaultValue?: string;

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
  size?: "sm" | "md" | "lg" | "auto";

  /**
   * The step attribute works with the number type input field.
   * It indicates the precision of the number field.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number#step
   */
  step?: number;

  /**
   * If true, the input will be focused when the component is mounted.
   */
  autoFocus?: boolean;

  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: SyntheticEvent) => void;
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

function getHelperText(validityState: ValidityState): string {
  if (validityState.valueMissing) {
    return "Required";
  } else if (validityState.typeMismatch) {
    return "Invalid";
  } else if (validityState.tooShort) {
    return "Too short";
  } else if (validityState.tooLong) {
    return "Too long";
  } else if (validityState.rangeUnderflow) {
    return "Too small";
  } else if (validityState.rangeOverflow) {
    return "Too big";
  } else if (validityState.stepMismatch) {
    return "Invalid";
  } else if (validityState.badInput) {
    return "Bad input";
  } else if (validityState.customError) {
    return "Error";
  }
  return "";
}

export default function Input(props: InputProps) {
  const { type, size = "auto", label, onBlur, prefix, suffix, autoFocus = false, className } = props;

  // State for validation
  //
  // Because we want to show the validation message/state only after the user has tried to enter a value or submitted
  // the form, we need to keep track of whether the input has been validated or not. `validated` is a boolean that is
  // set to `true` after the input is validated for the first time, whatever the result of the validation.
  const [validityState, setValidityState] = useState<ValidityState>();

  // Ref for the input, this is used to calculate the padding of the input when a prefix or a suffix is used.
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Properties for the input element
  const inputProperties = {
    id: props.id || "input-" + crypto.randomUUID().substring(0, 8),
    name: props.name,
    defaultValue: props.defaultValue,
    placeholder: props.placeholder,
    disabled: props.disabled,
    readOnly: props.readonly,
    required: props.required,
    step: props.step,
    min: props.min,
    max: props.max,
    onChange: props.onChange,
    onKeyDown: props.onKeyDown,
  };

  const handleValidation = (event: React.FormEvent<HTMLInputElement>) => {
    // We are storing the input validity state.
    setValidityState(event.currentTarget.validity);
    // We don't want the web browser to show the default error message.
    event.preventDefault();
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
      if (autoFocus) {
        inputRef.current.focus();
      }
    }
  });

  const classes = {
    container: cx(
      "flex flex-col",
      size === "sm" && "w-32",
      size === "md" && "w-56",
      size === "lg" && "w-80",
      className,
    ),
    label: cx("flex flex-row space-x-1 mb-2 text-sm font-medium items-center"),
    helper: cx("flex text-xs rounded-sm px-1 py-0.5", "bg-red-100 text-red-600 dark:bg-red-600 dark:text-red-100"),
    input: cx(
      "block shadow-sm bg-transparent",
      "focus:outline-none focus:ring focus:valid:ring-blue-500 focus:valid:border-blue-500 dark:focus:ring-blue-500 dark:focus:valid:border-blue-500",
      "border border-gray-300 text-gray-900 text-sm rounded block w-full p-2.5 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
      validityState &&
        "invalid:border-red-600 focus:invalid:ring-red-600 dark:invalid:border-red-600 dark:focus:invalid:ring-red-600",
    ),
  };

  return (
    <div className={classes.container}>
      {label && (
        <label htmlFor={inputProperties.id} className={classes.label}>
          <p className="flex grow">{label}</p>
          {validityState && !validityState.valid && (
            <span className={classes.helper}>{getHelperText(validityState)}</span>
          )}
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
