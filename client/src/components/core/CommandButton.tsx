import { executeCommand, getCommand } from "@/utils/commands";
import { ColorsFunction } from "@/utils/colors";
import Button, { ButtonType } from "@/components/core/Button";
import { SVGIcon } from "@/utils/types";

type CommandButtonProps = {
  command: string;
  text?: string;
  icon?: SVGIcon;
  tooltip?: string;
  colors?: ColorsFunction;
  type?: ButtonType;
  className?: string;
};

export default function CommandButton({ command, text, icon, tooltip, colors, type, className }: CommandButtonProps) {
  const cmd = getCommand(command);
  const handleClick = () => {
    executeCommand(cmd.name);
  };
  return (
    <Button
      type={type}
      icon={icon === undefined ? cmd.icon : icon}
      onClick={handleClick}
      className={className}
      colors={colors}
      text={text === undefined ? cmd.label : text}
      tooltip={tooltip === undefined ? cmd.description : tooltip}
    />
  );
}
