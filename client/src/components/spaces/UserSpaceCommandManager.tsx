import { registerAction, unregisterAction } from "@/utils/commands";
import { useEffect, useState } from "react";
import NewConnectionDialog from "@/components/dialogs/NewConnectionDialog";
import { Connection } from "@/models/connections";
import { useUserStore } from "@/stores/UserStore";

export default function UserSpaceCommandManager() {
  const [Dialog, setDialog] = useState<React.ReactNode>(null);
  const getDefaultResourceFolder = useUserStore((state) => state.getDefaultResourceFolder);

  const handleCancel = () => {
    setDialog(null);
  };

  const handleCommand = (command: string) => {
    switch (command) {
      case "connection.new": {
        const handleClose = (connection: Connection) => {
          console.log("New connection", connection);
          setDialog(null);
        };

        // FIXME: This should be the current active item in the sidebar if compatible with the resource type.
        const parentId = getDefaultResourceFolder("connections")?.id;
        setDialog(<NewConnectionDialog parentId={parentId} onCancel={handleCancel} onClose={handleClose} />);
        break;
      }
    }
  };

  useEffect(() => {
    const commands = [registerAction("connection.new", handleCommand)];
    return () => {
      commands.forEach((command) => unregisterAction(command.name, handleCommand));
    };
  });

  return <>{Dialog}</>;
}
