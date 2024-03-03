import { useState } from "react";

export type UseRadioProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  required?: boolean;
};

export function useRadio(props: UseRadioProps) {
  const [validated, setValidated] = useState(false);

  // Validation handler
  //
  // By default the web browser will set the input as invalid if it's required and none of the radio buttons are
  // checked. We want to show the validation message/state only after the user has focused on one of the radio or
  // submitted the form. In other words, we want to avoid having errors showing up when first displaying the form
  // before any user interaction.
  const handleValidation = (event: React.FormEvent<HTMLInputElement>) => {
    setValidated(true);
    event.preventDefault(); // Prevent the web browser to show the default error message.
  };

  const inputProperties = {
    ...props,
    id: props.id || "radio-" + crypto.randomUUID().substring(0, 8),
    onInvalid: handleValidation,
  };

  return {
    validated,
    inputProperties,
  };
}
