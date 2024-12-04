import { produce } from "immer";
import { Connection, ConnectionMode } from "@/models/connections";
import { SyntheticEvent, useRef, useState } from "react";
import { Agent } from "@/resources/agent";
import {
  DRIVER_CONNECTION_MODE,
  DRIVER_CONNECTION_STRING,
  DRIVER_HOST,
  DRIVER_PORT,
  DRIVER_SOCKET,
  DRIVER_URI,
  DRIVER_USER,
} from "@/models/drivers";
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
import { Connections } from "@/resources/connections";
import Spinner from "@/components/core/Spinner";
import { useUserStore } from "@/stores/UserStore";

type NewConnectionDialogProps = {
  /// The identifier of the parent resource (could be a collection or an environment).
  parentId: string;
  onClose?: (connection: Connection) => void;
  onCancel?: () => void;
};

export default function NewConnectionDialog({ parentId, onClose, onCancel }: NewConnectionDialogProps) {
  const [connection, setConnection] = useState<Connection>(null);

  const formsRef = {
    driver: useRef<HTMLFormElement>(null),
    connect: useRef<HTMLFormElement>(null),
    auth: useRef<HTMLFormElement>(null),
    param: useRef<HTMLFormElement>(null),
  };

  const { taskStatus, setTaskStatus, message, setMessage, setTask } = useTaskEffect(
    "running",
    async () => {
      const defaults = await Connections.defaults();
      const connection = new Connection({ ...defaults, parentId });
      setConnection(connection);
    },
    "Creating a new connection...",
  );

  // The creation of the connection is performed by the UserStore which will reflect the changes in the UI.
  const createCatalogResource = useUserStore((state) => state.createCatalogResource);

  // Any error that occurs during the connection creation will be displayed as a notification.
  const addNotification = useUserStore((state) => state.addNotification);

  if (taskStatus === "error") {
    addNotification({
      id: crypto.randomUUID(),
      variant: "error",
      message: message instanceof Error ? message.message : message,
      autoDismiss: true,
    });
    setTaskStatus("pending");
  }

  const handleClose = () => {
    setMessage("Testing the connection...");
    const task = async () => {
      await Connections.test(connection);
      await createCatalogResource("connection", connection);
      onClose(connection);
    };
    setTask(task);
  };

  // Selection of the driver.
  // All properties of the connection are set to their default values, except driver, id, name and label.
  const handleDriverChange = (driverName: string) => {
    const driver = Agent.agent.drivers.find((d) => d.name === driverName);
    setConnection(
      new Connection({
        ...connection,
        driver: driver.name,
        mode: driver.defaults[DRIVER_CONNECTION_MODE] as ConnectionMode, // FIXME: This MUST be a ConnectionMode
        username: driver.defaults[DRIVER_USER],
        host: driver.defaults[DRIVER_HOST],
        port: parseInt(driver.defaults[DRIVER_PORT]),
        socket: driver.defaults[DRIVER_SOCKET],
        uri: driver.defaults[DRIVER_URI],
        connectionString: driver.defaults[DRIVER_CONNECTION_STRING],
      }),
    );
  };

  // Change any of the connection properties (except the driver handled by `handleDriverChange`).
  const handleChange = (value: Partial<Connection>) => {
    const c = new Connection(
      produce(connection, (draft) => {
        if (value.options && draft.options) {
          // Merge the options with the existing options.
          value.options = { ...draft.options, ...value.options };
        }
        return { ...draft, ...value };
      }),
    );
    setConnection(c);
  };

  // When we submit a step, we check if the form is valid inside the current step is valid. If not, we prevent the move
  // the next step.
  const handleSubmitStep = (event: SyntheticEvent, name: string) => {
    const form = formsRef[name as keyof typeof formsRef];
    if (form.current && !form.current.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const selectedDriver = Agent.agent.drivers.find((driver) => driver.name === connection?.driver);

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
          <Stepper.Step icon={WrenchIcon} name="driver" title="Choose a Driver" onSubmit={handleSubmitStep} visible>
            <DriverForm
              ref={formsRef.driver}
              drivers={Agent.agent.drivers}
              value={connection?.driver}
              name="driver"
              className="w-full"
              onChange={handleDriverChange}
            />
          </Stepper.Step>
          <Stepper.Step icon={ConnectIcon} name="connect" title="Connection" onSubmit={handleSubmitStep} visible>
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
          <Stepper.Step icon={OptionsIcon} title="Parameters" name="param" onSubmit={handleSubmitStep} visible>
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
      </div>
    </Modal>
  );
}
