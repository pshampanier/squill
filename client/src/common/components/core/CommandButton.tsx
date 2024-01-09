import { executeCommand, getCommand } from "@/utils/commands";
import { ColorsFunction } from "@/utils/colors";
import Button from "@/components/core/Button";

type CommandButtonProps = {
  command: string;
  colors?: ColorsFunction;
  className?: string;
};

export default function CommandButton({ command, colors, className }: CommandButtonProps) {
  const cmd = getCommand(command);
  const handleClick = () => {
    executeCommand(cmd.name);
  };
  return (
    <Button icon={cmd.icon} onClick={handleClick} className={className} colors={colors} tooltip={cmd.description} />
  );
}
