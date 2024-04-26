import { registerAction, registerCommand, unregisterAction } from "@/utils/commands";
import { useEffect, useState } from "react";
import NewConnectionDialog from "@/components/dialogs/NewConnectionDialog";
import { Connection } from "@/models/connections";

registerCommand({
  name: "connection.new",
  description: "New connection",
  shortcut: "Ctrl+Alt+C",
});

export default function CommandManager() {
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
    registerAction("connection.new", handleCommand);
    return () => {
      unregisterAction("connection.new", handleCommand);
    };
  });

  return <>{Dialog}</>;
}
