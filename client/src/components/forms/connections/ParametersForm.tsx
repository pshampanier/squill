import cx from "classix";
import { Connection } from "@/models/connections";
import { Driver } from "@/models/drivers";
import { forwardRef } from "react";
import { primary as colors } from "@/utils/colors";
import Input from "@/components/core/Input";

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
const ParamForm = forwardRef<HTMLFormElement, ParamFormProps>((props, ref) => {
  const { name, className, onChange, driver, connection } = props;
  if (!driver) return null;

  const classes = cx("mx-1 w-full flex flex-col divide space-y-4", colors("divide"), className);
  return (
    <form ref={ref} name={name} className={classes}>
      <div className="flex justify-center">
        <div className="flex flex-row w-full gap-2">
          <Input
            type="text"
            name="name"
            label="Name"
            defaultValue={connection.name}
            className="grow"
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
});

ParamForm.displayName = "ParamForm";
export default ParamForm;
