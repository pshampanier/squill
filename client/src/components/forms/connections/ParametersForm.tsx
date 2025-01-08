import cx from "classix";
import { Connection } from "@/models/connections";
import { Driver } from "@/models/drivers";
import { useContext, useEffect, useRef } from "react";
import { primary as colors } from "@/utils/colors";
import Input from "@/components/core/Input";
import { FormContext } from "@/stores/FormContext";

type ParamFormProps = {
  name?: string;
  className?: string;
  onChange: (connection: Partial<Connection>) => void;
  driver: Driver;
  connection: Connection;
};

/**
 * A form to edit the xxx of a connection.
 */
export default function ParamForm({ name, className, onChange, driver, connection }: ParamFormProps) {
  if (!driver) return null;

  const ref = useRef<HTMLFormElement>(null);
  const { registerCheckValidity, unregisterCheckValidity } = useContext(FormContext);

  //
  // Form validation
  //
  useEffect(() => {
    const handleValidation = async () => {
      return ref.current?.checkValidity() ?? true;
    };
    registerCheckValidity(handleValidation, name);
    return () => {
      unregisterCheckValidity(handleValidation);
    };
  }, []);

  const classes = cx("w-full flex flex-col divide space-y-4", colors("divide"), className);
  return (
    <form ref={ref} name={name} className={classes}>
      <div className="flex w-full justify-center">
        <div className="flex flex-row w-full space-x-2">
          <Input
            type="text"
            name="name"
            label="Name"
            defaultValue={connection.name}
            className="flex-grow"
            required
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <Input
            size="md"
            type="text"
            name="alias"
            label="Alias"
            defaultValue={connection.alias}
            required
            onChange={(e) => onChange({ alias: e.target.value })}
          />
        </div>
      </div>
    </form>
  );
}
