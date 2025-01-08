import { createContext, ReactNode, useRef, useState } from "react";

/**
 * A callback that is called when the form is validated.
 *
 * Returns `true` if the validation passed, `false` is validity problems were encountered.
 */
type CheckValidityCallback = () => Promise<boolean>;

/**
 * A callback that is called when the form is submitted.
 */
type SubmitCallback = () => Promise<void>;

export type FormStatus = "validating" | "valid" | "invalid" | "submitting" | "submitted" | "error";

export interface FormContextType {
  /**
   * The current state of the form.
   */
  status?: FormStatus;

  /**
   * Register a callback to be called when the form is validated.
   * The name is optional and is used to identify the callback when `validate()` is called with a name.
   */
  registerCheckValidity: (callback: CheckValidityCallback, name?: string) => void;

  /**
   * Unregister a callback that was previously registered with `register()`.
   */
  unregisterCheckValidity: (callback: CheckValidityCallback) => void;

  /**
   * Validate the form.
   * If a name is provided, only the callback with that name will be called.
   */
  validate: (name?: string) => Promise<boolean>;

  /**
   * Submit the form.
   * This will validate the form and call the `onSubmit()` callback if the form is valid.
   */
  submit: (onSubmit: SubmitCallback) => Promise<void>;
}

// Create the form context.
export const FormContext = createContext<FormContextType | null>(null);

// FormProvider component to provide context value
export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<FormStatus>();
  const callbacks = useRef<Map<string, CheckValidityCallback>>(new Map());

  const registerCheckValidity = (callback: CheckValidityCallback, name?: string) => {
    callbacks.current.set(
      name ?? `anonymous-${Math.random().toString(36).substring(2, 10)}}-${Date.now().toString(36)}`,
      callback,
    );
  };

  const unregisterCheckValidity = (callback: CheckValidityCallback) => {
    for (const [key, value] of callbacks.current.entries()) {
      if (value === callback) {
        callbacks.current.delete(key);
        break;
      }
    }
  };

  const validate = async (name?: string) => {
    setStatus("validating");
    let selectedCallbacks: CheckValidityCallback[];
    if (name) {
      selectedCallbacks = [callbacks.current.get(name)];
    } else {
      selectedCallbacks = Array.from(callbacks.current.values());
    }
    try {
      const results = await Promise.all(selectedCallbacks.map((checkValidity) => checkValidity()));
      const valid = results.every((result) => result);
      setStatus(valid ? "valid" : "invalid");
      return valid;
    } catch (error) {
      setStatus("error");
      throw error;
    }
  };

  const submit = async (onSubmit: SubmitCallback) => {
    const valid = await validate();
    if (valid) {
      setStatus("submitting");
      try {
        await onSubmit();
        setStatus("submitted");
      } catch (error) {
        setStatus("error");
        throw error;
      }
    }
  };

  const value: FormContextType = {
    status,
    registerCheckValidity,
    unregisterCheckValidity,
    validate,
    submit,
  };

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};
