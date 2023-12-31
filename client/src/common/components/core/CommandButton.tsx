import { executeCommand, getCommand } from "@/utils/commands";
import { IconButton } from "@/components/core/IconButton";

type CommandButtonProps = {
  command: string;
  className?: string;
};

export default function CommandButton({ command, className }: CommandButtonProps) {
  const cmd = getCommand(command);
  const handleClick = () => {
    executeCommand(cmd.name);
  };
  return <IconButton icon={cmd.icon} onClick={handleClick} className={className} tooltip={cmd.description} />;
}
