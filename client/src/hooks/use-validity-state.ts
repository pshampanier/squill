import { useCallback, useState } from "react";

export type ValidityStates = {
  validityState?: ValidityState;
  setValidityState: (state: ValidityState) => void;
  error?: string;
  handleOnInvalid: (event: React.FormEvent<HTMLInputElement>) => void;
};

export function useValidityState(): ValidityStates {
  // State for validation
  //
  // Because we want to show the validation message/state only after the user has tried to enter a value or submitted
  // the form, we need to keep track of whether the input has been validated or not. `validated` is a boolean that is
  // set to `true` after the input is validated for the first time, whatever the result of the validation.
  const [validityState, setValidityState] = useState<ValidityState>();

  const handleOnInvalid = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      // We are storing the input validity state.
      setValidityState(event.currentTarget.validity);
      // We don't want the web browser to show the default error message.
      event.preventDefault();
    },
    [setValidityState],
  );

  let error = undefined;
  if (validityState) {
    if (validityState.valueMissing) {
      error = "Required";
    } else if (validityState.typeMismatch) {
      error = "Invalid";
    } else if (validityState.tooShort) {
      error = "Too short";
    } else if (validityState.tooLong) {
      error = "Too long";
    } else if (validityState.rangeUnderflow) {
      error = "Too small";
    } else if (validityState.rangeOverflow) {
      error = "Too big";
    } else if (validityState.stepMismatch) {
      error = "Invalid";
    } else if (validityState.badInput) {
      error = "Bad input";
    } else if (validityState.customError) {
      error = "Error";
    }
  }

  return {
    validityState,
    setValidityState,
    error,
    handleOnInvalid,
  };
}
