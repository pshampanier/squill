import { Connection } from "@/models/connections";
import { agent } from "@/resources/agent";
import { primary as colors } from "@/utils/colors";
import cx from "classix";
import WarningIcon from "@/icons/exclamation-triangle.svg?react";
import { useCallback, useState } from "react";
import { NO_ICON } from "@/utils/constants";
import { useAppStore } from "@/stores/AppStore";
import { produce } from "immer";
import Button from "@/components/core/Button";
import AuthForm from "@/components/forms/connections/AuthForm";
import ConnectForm from "@/components/forms/connections/ConnectForm";
import DatasourcesForm from "@/components/forms/connections/DatasourcesForm";
import ParamForm from "@/components/forms/connections/ParametersForm";
import Modal from "@/components/Modal";
import SettingsPage, { Setting, Settings, SettingsSection } from "@/components/spaces/settings/SettingsPage";
import CommandButton from "@/components/core/CommandButton";
import { Connections } from "@/resources/connections";
import { useUserStore } from "@/stores/UserStore";

type SettingsPageConnectionProps = {
  connection: Connection;
};

export default function SettingsPageConnection({ connection }: SettingsPageConnectionProps) {
  // The visibility of the delete modal (true if visible).
  const [deleteModal, setDeleteModal] = useState(false);

  //
  // Stores actions
  //
  const addNotification = useUserStore((state) => state.addNotification);

  const driver = agent().drivers.find((d) => d.name === connection.driver);
  // The visibility of the steps is determined by the capabilities of the driver.
  const visibility = {
    auth: driver?.capabilities.includes("auth_user_password") || driver?.capabilities.includes("auth_password"),
    datasources: !driver?.capabilities.includes("single_datasource"),
  };

  //
  // Actions
  //
  const changeResourceSettings = useAppStore((state) => state.changeResourceSettings);

  //
  // Handle the delete connection action.
  //
  const handleDelete = (connectionId: string) => {
    // TODO: Implement delete connection.
    setDeleteModal(false);
    Connections.del(connectionId).then(() => {
      addNotification({
        id: crypto.randomUUID(),
        variant: "info",
        message: "The deletion of the connection has been initiated.",
        description: "The connection will be deleted in the background, this may take a few seconds...",
        autoDismiss: true,
      });
    });
  };

  const handleChanges = useCallback(
    (value: Partial<Connection>) => {
      const next = new Connection(
        produce(connection, (draft) => {
          if (value.options && draft.options) {
            // Merge the options with the existing options.
            value.options = { ...draft.options, ...value.options };
          }
          return { ...draft, ...value };
        }),
      );
      changeResourceSettings(next);
    },
    [connection],
  );

  return (
    <SettingsPage title={`Connection settings (${driver?.label})`}>
      <Settings>
        <ParamForm driver={driver} connection={connection} onChange={handleChanges} />
        <SettingsSection title="Connection">
          <ConnectForm driver={driver} connection={connection} onChange={handleChanges} />
        </SettingsSection>
        {visibility.auth && (
          <SettingsSection title="Authentication">
            <AuthForm driver={driver} connection={connection} onChange={handleChanges} />
          </SettingsSection>
        )}
        {visibility.datasources && (
          <SettingsSection title="Datasources">
            <DatasourcesForm
              datasources={connection.datasources}
              onChange={handleChanges}
              defaultDatasource={connection.defaultDatasource}
            />
          </SettingsSection>
        )}
        <SettingsSection title="Danger Zone">
          <Setting
            title="Delete this connection"
            description="Once you delete a connection, there is no going back. Please be certain."
            className="border-t-0"
          >
            <Button variant="danger" onClick={() => setDeleteModal(true)}>
              Delete connection
            </Button>
            {deleteModal && (
              <Modal
                className="w-96 select-none"
                onCancel={() => setDeleteModal(false)}
                onClose={() => handleDelete(connection.id)}
              >
                <div className="p-6">
                  <div className="flex flex-row space-x-6">
                    <div
                      className={cx(
                        "flex flex-none rounded-full w-10 h-10 items-center justify-center",
                        colors("danger:background", "danger:text"),
                      )}
                    >
                      <WarningIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Delete connection</h2>
                      <p className="mt-2">Are you sure you want to delete this connection?</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <CommandButton variant="outline" command="close" text="Cancel" icon={NO_ICON} />
                    <Button
                      variant="danger"
                      text="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(connection.id);
                      }}
                    />
                  </div>
                </div>
              </Modal>
            )}
          </Setting>
        </SettingsSection>
      </Settings>
    </SettingsPage>
  );
}
