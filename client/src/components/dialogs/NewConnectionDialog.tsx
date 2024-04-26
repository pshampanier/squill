import { produce } from "immer";
import { Connection } from "@/models/connections";
import { SyntheticEvent, useRef, useState } from "react";
import { Agent } from "@/resources/agent";
import { DRIVER_PORT, DRIVER_USER } from "@/models/drivers";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import DriverForm from "@/components/forms/connections/DriverForm";
import ConnectForm from "@/components/forms/connections/ConnectForm";
import AuthForm from "@/components/forms/connections/AuthForm";

import WrenchIcon from "@/icons/wrench.svg?react";
import ConnectIcon from "@/icons/plug.svg?react";
import OptionsIcon from "@/icons/options.svg?react";
import UserIcon from "@/icons/user.svg?react";
import ParamForm from "@/components/forms/connections/ParametersForm";
import Overlay from "@/components/Overlay";
import { useTaskEffect } from "@/hooks/use-task-effect";
import Connections from "@/resources/connections";
import { Spinner } from "../core/Spinner";
import Alert from "../core/Alert";
import Button from "../core/Button";

type NewConnectionDialogProps = {
  onClose?: (connection: Connection) => void;
  onCancel?: () => void;
};

export default function NewConnectionDialog({ onClose, onCancel }: NewConnectionDialogProps) {
  const [connection, setConnection] = useState<Connection>(null);

  const formsRef = {
    driver: useRef<HTMLFormElement>(null),
    connect: useRef<HTMLFormElement>(null),
    auth: useRef<HTMLFormElement>(null),
    param: useRef<HTMLFormElement>(null),
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { taskStatus, message, setTaskStatus, setTask } = useTaskEffect(
    "running",
    async () => {
      const connection = await Connections.create();
      setConnection(connection);
    },
    "Creating a new connection..."
  );
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const selectedDriver = Agent.agent.drivers.find((driver) => driver.name === connection?.driver);

  const handleClose = () => {
    onClose(connection);
  };

  // Selection of the driver.
  // All properties of the connection are set to their default values, except driver, id, name and label.
  const handleDriverChange = (driverName: string) => {
    const driver = Agent.agent.drivers.find((d) => d.name === driverName);
    const connectionMode = (() => {
      if (driver.capabilities.includes("connect_host")) return "host";
      else if (driver.capabilities.includes("connect_socket")) return "socket";
      else if (driver.capabilities.includes("connect_file")) return "file";
      else if (driver.capabilities.includes("connect_string")) return "connection_string";
    })();
    setConnection(
      new Connection({
        driver: driver.name,
        id: connection.id,
        name: connection.name,
        alias: connection.alias,
        mode: connectionMode,
        username: driver.defaults[DRIVER_USER],
        port: parseInt(driver.defaults[DRIVER_PORT]),
      })
    );
  };

  // Change any of the connection properties (except the driver handled by `handleDriverChange`).
  const handleChange = (value: Partial<Connection>) => {
    const c = new Connection(
      produce(connection, (draft) => {
        return { ...draft, ...value };
      })
    );
    setConnection(c);
  };

  const handleSubmitStep = (event: SyntheticEvent, name: string) => {
    const form = formsRef[name as keyof typeof formsRef];
    if (form.current && !form.current.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const driver = Agent.agent.drivers.find((driver) => driver.name === connection?.driver);

  // Show the authentication step if the driver has the capability to authenticate the user.
  const showAuth =
    !driver || driver?.capabilities.includes("auth_user_password") || driver?.capabilities.includes("auth_password");

  // The key of the `Stepper` component is used to reset it when the driver change.
  //
  // Because the driver change, steps that were in the status completed are not anymore. Here we are leveraging the fact
  // that React React treats the component as a different entity when its key change, so it will reset the states of the
  // children components back to their default values.
  const stepperKey = driver ? `new-${driver.name}` : "new-connection";

  return (
    <Modal className="w-4/5 max-w-4xl h-[500px]" onCancel={onCancel}>
      <div className="relative w-full h-full">
        <Stepper key={stepperKey} onCompleted={handleClose} onCancel={onCancel}>
          <Stepper.Step icon={WrenchIcon} name="driver" title="Choose a Driver" onSubmit={handleSubmitStep}>
            <DriverForm
              ref={formsRef.driver}
              drivers={Agent.agent.drivers}
              value={connection?.driver}
              name="driver"
              className="w-full"
              onChange={handleDriverChange}
            />
          </Stepper.Step>
          <Stepper.Step icon={ConnectIcon} name="connect" title="Connection" onSubmit={handleSubmitStep}>
            <ConnectForm
              ref={formsRef.connect}
              name="connect"
              driver={selectedDriver}
              onChange={handleChange}
              connection={connection}
            />
          </Stepper.Step>
          <Stepper.Step
            icon={UserIcon}
            title="Authentication"
            name="auth"
            visible={showAuth}
            onSubmit={handleSubmitStep}
          >
            <AuthForm
              ref={formsRef.auth}
              name="auth"
              driver={selectedDriver}
              connection={connection}
              onChange={handleChange}
            />
          </Stepper.Step>
          <Stepper.Step icon={OptionsIcon} title="Parameters" name="param" onSubmit={handleSubmitStep}>
            <ParamForm
              ref={formsRef.param}
              name="param"
              driver={selectedDriver}
              connection={connection}
              onChange={handleChange}
            />
          </Stepper.Step>
        </Stepper>
        {taskStatus === "running" && (
          <Overlay delay={1000} position="absolute">
            <Spinner size="lg" />
            <p className="text-xs font-semibold">{message.toString()}</p>
          </Overlay>
        )}
        {taskStatus === "error" && (
          <Overlay position="absolute">
            <Alert title={true} icon={true} severity="danger" border className="w-3/4 backdrop-blur-xl">
              <p>{message.toString()}</p>
              <Button onClick={onCancel} className="mt-4 ml-auto" variant="solid" text="Close" />
            </Alert>
          </Overlay>
        )}
      </div>
    </Modal>
  );
}
