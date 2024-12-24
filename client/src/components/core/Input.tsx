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
  defaultValue?: string | number;

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
   * If true, the input will be focused when the component is mounted.
   */
  autoFocus?: boolean;

  /**
   * The density/size of the input (`compact` or `normal`).
   */
  density?: "compact" | "comfortable";

  /**
   * The [pattern][MDN Reference] attribute for constraint validation.
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern
   */
  pattern?: string;

  /**
   * The [required][MDN Reference] attribute for constraint validation.
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/required
   */
  required?: boolean;

  /**
   * The [readonly][MDN Reference] attribute, when present, makes the element not mutable.
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/readonly
   */
  readonly?: boolean;

  /**
   * The [min][MDN Reference] attribute defines the minimum value that is acceptable and valid
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/min
   */
  min?: number;

  /**
   * The [max][MDN Reference] attribute defines the maximum value that is acceptable and valid
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/max
   */
  max?: number;

  /**
   * The [step][MDN Reference] attribute is a number that specifies the granularity that the value must adhere to.
   * [MDN Reference]: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/step
   */
  step?: number;

  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: SyntheticEvent) => void;
  disabled?: boolean;
  error?: boolean;
  tabIndex?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
};

function getHelperText(validityState: ValidityState): string {
  if (validityState.valueMissing) {
    return "Required";
  } else if (validityState.typeMismatch || validityState.patternMismatch || validityState.stepMismatch) {
    return "Invalid";
  } else if (validityState.tooShort) {
    return "Too short";
  } else if (validityState.tooLong) {
    return "Too long";
  } else if (validityState.rangeUnderflow) {
    return "Too small";
  } else if (validityState.rangeOverflow) {
    return "Too big";
  } else if (validityState.badInput) {
    return "Bad input";
  } else if (validityState.customError) {
    return "Error";
  }
  return "";
}

export default function Input(props: InputProps) {
  const {
    type,
    size = "auto",
    label,
    onBlur,
    prefix,
    suffix,
    autoFocus = false,
    className,
    density = "comfortable",
  } = props;

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
    pattern: props.pattern,
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
      "relative flex flex-col",
      size === "sm" && "w-32",
      size === "md" && "w-56",
      size === "lg" && "w-80",
      className,
    ),
    label: cx("flex flex-row space-x-1 mb-2 text-sm font-medium items-center"),
    helper: cx(
      "flex text-xs rounded-sm px-1 py-0.5",
      "bg-red-100 text-red-600 dark:bg-red-600 dark:text-red-100",
      "absolute -top-6 end-0 h-5",
    ),
    prefix: cx(
      "absolute inset-y-0 start-0 flex items-center pointer-events-none",
      density === "compact" && "pl-1 pr-2",
      density === "comfortable" && "p-3",
    ),
    input: cx(
      "block shadow-sm bg-transparent",
      "focus:outline-none focus:ring focus:valid:ring-blue-500 focus:valid:border-blue-500 dark:focus:ring-blue-500 dark:focus:valid:border-blue-500",
      "border border-gray-300 text-gray-900 rounded block w-full dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
      density === "compact" && "text-xs p-1",
      density === "comfortable" && "text-sm p-2.5",
      validityState &&
        "invalid:border-red-600 focus:invalid:ring-red-600 dark:invalid:border-red-600 dark:focus:invalid:ring-red-600",
    ),
  };

  return (
    <div className={classes.container}>
      {label && (
        <label htmlFor={inputProperties.id} className={classes.label}>
          <p className="flex grow">{label}</p>
        </label>
      )}
      <div className="relative">
        {prefix && <div className={classes.prefix}>{prefix}</div>}
        <input
          ref={inputRef}
          type={type}
          id="first_name"
          className={classes.input}
          {...inputProperties}
          onInvalid={handleValidation}
          onBlur={handleBlur}
        />
        {validityState && !validityState.valid && (
          <span className={classes.helper}>{getHelperText(validityState)}</span>
        )}
        {suffix && <div className="absolute inset-y-0 end-0 flex items-center px-3 pointer-events-none">{suffix}</div>}
      </div>
    </div>
  );
}
