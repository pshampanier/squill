import { registerAction, unregisterAction } from "@/utils/commands";
import { useEffect, useState } from "react";
import NewConnectionDialog from "@/components/dialogs/NewConnectionDialog";
import { Connection } from "@/models/connections";

export default function UserSpaceCommandManager() {
  const [Dialog, setDialog] = useState<React.ReactNode>(null);

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

        setDialog(<NewConnectionDialog onCancel={handleCancel} onClose={handleClose} />);
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
