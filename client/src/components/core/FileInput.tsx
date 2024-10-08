import Button from "@/components/core/Button";
import Input from "@/components/core/Input";
import DefaultIcon from "@/icons/file.svg?react";
import CloseCircleOutline from "@/icons/close-circle-outline.svg?react";
import { useState } from "react";
import { primary, secondary } from "@/utils/colors";
import cx from "classix";
import { useValidityState } from "@/hooks/use-validity-state";

type FileInputProps = {
  className?: string;
  help?: string;
  defaultValue?: string;
  defaultSize?: number;
  noIcon?: boolean;
  mode?: "input" | "browser" | "external";

  /**
   * The input is required.
   */
  required?: boolean;

  /**
   * A callback function that is called when the user changes the file.
   *
   * Because the event can be triggered by different inputs depending on the `mode` (a file input or the text input),
   * in addition to the `event` the callback function will receive the file name and size pre-extracted from the event.
   * The size is only available in the browser mode.
   */
  onChange?: (event: React.SyntheticEvent<HTMLInputElement>, name?: string, size?: number) => void;

  /**
   * Name of the form control.
   * Submitted with the form as part of a name/value pair
   */
  name?: string;

  /**
   * The label of the input.
   */
  label?: string;
};

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function splitPath(filePath: string): { directory: string; filename: string } {
  const lastSeparatorIndex = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastSeparatorIndex === -1) {
    return { directory: "", filename: filePath };
  } else {
    return {
      directory: filePath.substring(0, lastSeparatorIndex),
      filename: filePath.substring(lastSeparatorIndex + 1),
    };
  }
}

export default function FileInput({
  className,
  name,
  label,
  onChange,
  help,
  defaultValue,
  defaultSize,
  noIcon,
  mode = "browser",
  required = false,
}: FileInputProps) {
  const [value, setValue] = useState<string>(defaultValue);
  const [size, setSize] = useState<number>(defaultSize);
  const [editMode, setEditMode] = useState<boolean>(false);
  const { validityState, error, handleOnInvalid } = useValidityState();

  const valid = !validityState || validityState?.valid;

  //
  // In browser mode, we are using a hidden file input to get the file name and size.
  //
  const handleBrowserChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.files[0].name;
    const size = event.target.files[0].size;
    onChange?.(event, name, size);
    if (!event.preventDefault) {
      setValue(name);
      setSize(size);
    }
  };

  //
  // The user has clicked on the close button, which basically means that the user wants to remove the file.
  //
  const handleClose = () => {
    setValue(undefined);
    setSize(undefined);
    onChange?.(undefined, undefined);
  };

  const handleClick = () => {
    mode === "input" && setEditMode(true);
  };

  //
  // The text input used to edit the file name is blurred, it's time to change the state with the new value.
  //
  const handleOnTextInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    onChange?.(event, event.target.value, undefined);
    if (!event.defaultPrevented) {
      event.target.checkValidity();
      if (event.target.validity.valid) {
        setValue(event.target.value);
        setSize(undefined);
        setEditMode(false);
      }
    }
  };

  //
  // When the user presses the escape key, we want to close the edit mode.
  //
  const handleSpecialKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      setEditMode(false);
    } else if (event.key === "Enter") {
      const name = event.currentTarget.value;
      onChange?.(event, name, undefined);
      if (!event.defaultPrevented) {
        setValue(name);
        setSize(undefined);
        setEditMode(false);
        event.stopPropagation();
        event.preventDefault();
      }
    }
  };

  //
  // The empty state and the value state are displayed in different colors.
  //
  const colors = value ? primary : secondary;

  const classes = {
    container: cx("w-full", className),
    helper: cx(
      "absolute top-1 right-1 text-xs rounded-sm px-1 py-0.5",
      "bg-red-100 text-red-600 dark:bg-red-600 dark:text-red-100",
    ),
    empty: cx(
      colors("border", "background", "text"),
      "relative w-full py-4 rounded border gap-3 grid cursor-pointer",
      !valid && "invalid-file-input border-red-600 dark:border-red-600",
      valid && mode === "browser" && "border-dashed",
    ),
  };

  let primaryText: string;
  let secondaryText: string;
  if (value && mode === "browser") {
    primaryText = value;
    secondaryText = formatBytes(size);
  } else if (value) {
    ({ directory: secondaryText, filename: primaryText } = splitPath(value));
  }

  return (
    <div className={classes.container}>
      {/*
       * We are using a `hidden` text input to ease the management of the validation.
       */}
      <input type="text" required={required} defaultValue={value} onInvalid={handleOnInvalid} className="hidden" />
      {
        /*
         * The empty state
         */
        !value && !editMode && (
          <div className={classes.empty}>
            <label className="flex flex-col items-center justify-center space-y-2" onClick={handleClick}>
              {validityState && !validityState.valid && <span className={classes.helper}>{error}</span>}
              <div className="grid gap-1">
                {!noIcon && <DefaultIcon className="mx-auto w-9 h-9 text-blue-500 cursor-pointer" />}
                {help && <h2 className="text-center text-xs font-light cursor-pointer">{help}</h2>}
              </div>
              {mode === "browser" && (
                <div className="grid gap-2">
                  <h4 className={cx(colors("heading-text"), "text-center text-sm font-medium cursor-pointer")}>
                    Drag and Drop your file here or
                  </h4>
                  <div className="flex items-center justify-center">
                    <input type="file" hidden onChange={handleBrowserChange} name={name} />
                  </div>
                </div>
              )}
              <Button variant="outline" text="Choose File" />
            </label>
          </div>
        )
      }
      {
        /*
         * The text input displayed in edit mode
         */
        editMode && (
          <>
            <Input
              type="text"
              name={name}
              label={label}
              defaultValue={value}
              className="grow"
              prefix={<DefaultIcon className="w-6 h-6 text-blue-500" />}
              onBlur={handleOnTextInputBlur}
              onKeyDown={handleSpecialKeys}
              required={required}
              autoFocus
            />
            {help && <div className="text-left mt-0.5 text-2xs font-light select-none">{help}</div>}
          </>
        )
      }
      {
        /*
         * The value state
         */
        !editMode && value && (
          <div className={cx("w-full grid gap-1 mb-4", colors("border", "background", "text"))}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!noIcon && <DefaultIcon className="mx-auto w-9 h-9 text-blue-500 flex-shrink-0" />}
                <div className="grid gap-1">
                  <a
                    href="#"
                    className="text-sm font-medium line-clamp-2 text-blue-500 hover:underline"
                    onClick={() => setEditMode(true)}
                  >
                    {primaryText}
                  </a>
                  <div className="font-light text-xs">{secondaryText}</div>
                </div>
              </div>
              <CloseCircleOutline
                className="w-6 h-6 cursor-pointer flex-shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClose}
              />
            </div>
          </div>
        )
      }
    </div>
  );
}
