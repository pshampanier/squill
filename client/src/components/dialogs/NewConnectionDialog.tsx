import { produce } from "immer";
import { Connection, ConnectionMode } from "@/models/connections";
import { SyntheticEvent, useEffect, useRef, useState } from "react";
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
import { useUserStore } from "@/stores/UserStore";
import { useTaskEffect } from "@/hooks/use-task-effect";
import { Connections } from "@/resources/connections";
import Modal from "@/components/Modal";
import Stepper, { StepperNavigation } from "@/components/Stepper";
import DriverForm from "@/components/forms/connections/DriverForm";
import ConnectForm from "@/components/forms/connections/ConnectForm";
import AuthForm from "@/components/forms/connections/AuthForm";
import DatasourcesForm from "@/components/forms/connections/DatasourcesForm";
import ParamForm from "@/components/forms/connections/ParametersForm";
import WrenchIcon from "@/icons/wrench.svg?react";
import ConnectIcon from "@/icons/plug.svg?react";
import OptionsIcon from "@/icons/options.svg?react";
import UserIcon from "@/icons/user.svg?react";
import DatabaseIcon from "@/icons/database.svg?react";
import Overlay from "@/components/Overlay";
import Spinner from "@/components/core/Spinner";

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
    datasources: useRef<HTMLFormElement>(null),
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

  // The definition of the driver that is currently selected.
  const driver = Agent.agent.drivers.find((driver) => driver.name === connection?.driver);

  // The visibility of the steps is determined by the capabilities of the driver.
  const visibility = {
    auth: driver?.capabilities.includes("auth_user_password") || driver?.capabilities.includes("auth_password"),
    datasources: !driver?.capabilities.includes("single_datasource"),
  };

  useEffect(() => {
    if (taskStatus === "error") {
      addNotification({
        id: crypto.randomUUID(),
        variant: "error",
        message: message instanceof Error ? message.message : message,
        autoDismiss: true,
      });
      setTaskStatus("pending");
    }
  }, [taskStatus]);

  const handleClose = () => {
    setMessage("Creation of the connection...");
    const task = async () => {
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
  const handleSubmitStep = (event: SyntheticEvent, name: string, actions: StepperNavigation) => {
    const form = formsRef[name as keyof typeof formsRef];
    if (!form.current?.checkValidity()) {
      actions.cancel();
    } else if (name === "auth" || (name === "connect" && !visibility.auth)) {
      // Once we have all the information we need, we can test the connection.
      setMessage("Testing the connection...");
      actions.cancel();
      const task = async () => {
        const validatedConnection = await Connections.validate(connection);
        setConnection(validatedConnection);
        // Okay, move to the next step...
        actions.proceed();
      };
      setTask(task);
    } else if (name === "datasources") {
      // Leaving the datasources step
      // - the default datasource must be visible.
      if (connection.datasources.find((ds) => ds.name === connection.defaultDatasource)?.hidden === true) {
        addNotification({
          id: "default_datasource_hidden",
          variant: "warning",
          message: `The default datasource '${connection.defaultDatasource}' must be visible.`,
          autoDismiss: true,
        });
        actions.cancel();
      }
    }
  };

  // The key of the `Stepper` component is used to reset it when the driver change.
  //
  // Because the driver change, steps that were in the status completed are not anymore. Here we are leveraging the fact
  // that React React treats the component as a different entity when its key change, so it will reset the states of the
  // children components back to their default values.
  const stepperKey = driver ? `new-${driver.name}` : "new-connection";

  return (
    <Modal className="w-4/5 max-w-4xl h-[525px]" onCancel={onCancel}>
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
              driver={driver}
              onChange={handleChange}
              connection={connection}
            />
          </Stepper.Step>
          <Stepper.Step
            icon={UserIcon}
            title="Authentication"
            name="auth"
            visible={visibility.auth}
            onSubmit={handleSubmitStep}
          >
            <AuthForm ref={formsRef.auth} name="auth" driver={driver} connection={connection} onChange={handleChange} />
          </Stepper.Step>
          <Stepper.Step
            icon={DatabaseIcon}
            title="Datasources"
            name="datasources"
            visible={visibility.datasources}
            onSubmit={handleSubmitStep}
          >
            <DatasourcesForm
              ref={formsRef.datasources}
              name="datasources"
              datasources={connection?.datasources}
              defaultDatasource={connection?.defaultDatasource}
              onChange={handleChange}
            />
          </Stepper.Step>
          <Stepper.Step icon={OptionsIcon} title="Parameters" name="param" onSubmit={handleSubmitStep} visible>
            <ParamForm
              ref={formsRef.param}
              name="param"
              driver={driver}
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
