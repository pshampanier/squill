import cx from "classix";
import { Connection, ConnectionMode } from "@/models/connections";
import {
  DRIVER_CONNECTION_STRING,
  DRIVER_HOST,
  DRIVER_PORT,
  DRIVER_SOCKET,
  DRIVER_URI,
  Driver,
} from "@/models/drivers";
import { useContext, useEffect, useRef } from "react";
import { primary as colors } from "@/utils/colors";
import Input from "@/components/core/Input";
import ButtonGroup from "@/components/core/ButtonGroup";
import Switch from "@/components/core/Switch";
import FileInput from "@/components/core/FileInput";
import { FormContext } from "@/stores/FormContext";

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
export default function ConnectForm({ name, className, onChange, driver, connection }: ConnectFormProps) {
  if (!driver) return null;

  //
  // Form validation
  //
  const ref = useRef<HTMLFormElement>(null);
  const { registerCheckValidity, unregisterCheckValidity } = useContext(FormContext);
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
          {driver.capabilities.includes("connect_uri") && <ButtonGroup.Item label="URI" name="uri" />}
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
      {connection.mode === "uri" && (
        <Input
          type="text"
          name="uri"
          label="URI"
          defaultValue={connection.uri}
          placeholder={driver.defaults[DRIVER_URI]}
          className="grow"
          required
          onChange={(e) => onChange({ connectionString: e.target.value })}
        />
      )}
      {connection.mode === "file" && (
        <FileInput
          name="file"
          label="File"
          mode="input"
          defaultValue={connection.file}
          className="grow"
          required
          onChange={(_e, value) => onChange({ file: value })}
        />
      )}
      {driver.capabilities.includes("read_only") && (
        <>
          <div className={cx("flex flex-row border-t py-2", colors("border"))}>
            <div className="flex flex-col space-y-1">
              <label htmlFor="read_only">Read only</label>
              <label htmlFor="read_only" className="text-xs">
                Opens the connection in read-only mode. Write will be prohibited.
              </label>
            </div>
            <div className="flex flex-col ml-auto justify-center">
              <Switch
                id="read_only"
                defaultChecked={connection.options?.["read_only"] === "on"}
                onChange={(e) => onChange({ options: { ["read_only"]: e.target.checked ? "on" : "off" } })}
              />
            </div>
          </div>
          <div className="flex flex-row w-full gap-2"></div>
        </>
      )}
    </form>
  );
}
