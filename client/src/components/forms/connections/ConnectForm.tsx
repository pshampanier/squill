import cx from "classix";
import { Connection, ConnectionMode } from "@/models/connections";
import { DRIVER_CONNECTION_STRING, DRIVER_HOST, DRIVER_PORT, DRIVER_SOCKET, Driver } from "@/models/drivers";
import { forwardRef } from "react";
import { primary as colors } from "@/utils/colors";
import Input from "@/components/core/Input";
import ButtonGroup from "@/components/core/ButtonGroup";

type ConnectFormProps = {
  name?: string;
  className?: string;
  onChange: (connection: Partial<Connection>) => void;
  driver: Driver;
  connection: Connection;
};

/**
 * A form to edit the xxx of a connection.
 */
const ConnectForm = forwardRef<HTMLFormElement, ConnectFormProps>((props, ref) => {
  const { name, className, onChange, driver, connection } = props;
  if (!driver) return null;

  const classes = cx("mx-1 w-full flex flex-col divide space-y-4", colors("divide"), className);
  return (
    <form ref={ref} name={name} className={classes}>
      <div className="flex justify-center">
        <ButtonGroup
          key={`mode-${driver.name}`}
          defaultValue={connection.mode}
          size="md"
          onChange={(value) => onChange({ mode: value as ConnectionMode })}
        >
          {driver.capabilities.includes("connect_host") && <ButtonGroup.Item label="Host" name="host" />}
          {driver.capabilities.includes("connect_socket") && <ButtonGroup.Item label="Socket" name="socket" />}
          {driver.capabilities.includes("connect_file") && <ButtonGroup.Item label="File" name="file" />}
          {driver.capabilities.includes("connect_string") && (
            <ButtonGroup.Item label="Connection String" name="connection_string" />
          )}
        </ButtonGroup>
      </div>
      {connection.mode === "host" && (
        <div className="flex flex-row w-full gap-2">
          <Input
            type="text"
            name="host"
            label="Host"
            defaultValue={connection.host}
            placeholder={driver.defaults[DRIVER_HOST]}
            className="grow"
            required
            onChange={(e) => onChange({ host: e.target.value })}
          />
          <Input
            size="sm"
            type="number"
            name="port"
            label="Port"
            defaultValue={connection.port?.toString() ?? ""}
            placeholder={driver.defaults[DRIVER_PORT]}
            onChange={(e) => onChange({ port: parseInt(e.target.value) })}
            min={0}
            max={65535}
          />
        </div>
      )}
      {connection.mode === "socket" && (
        <Input
          type="text"
          name="socket"
          label="Socket"
          defaultValue={connection.socket}
          placeholder={driver.defaults[DRIVER_SOCKET]}
          className="grow"
          required
          onChange={(e) => onChange({ socket: e.target.value })}
        />
      )}
      {connection.mode === "connection_string" && (
        <Input
          type="text"
          name="connection_string"
          label="Connection String"
          defaultValue={connection.connectionString}
          placeholder={driver.defaults[DRIVER_CONNECTION_STRING]}
          className="grow"
          required
          onChange={(e) => onChange({ connectionString: e.target.value })}
        />
      )}
      {connection.mode === "file" && (
        <Input
          type="text"
          name="file"
          label="File"
          defaultValue={connection.file}
          className="grow"
          required
          onChange={(e) => onChange({ file: e.target.value })}
        />
      )}
    </form>
  );
});

ConnectForm.displayName = "ConnectForm";
export default ConnectForm;
