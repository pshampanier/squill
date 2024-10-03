import { dispatchCommand, getCommand } from "@/utils/commands";
import { ColorsFunction } from "@/utils/colors";
import Button, { ButtonVariant } from "@/components/core/Button";
import { SVGIcon } from "@/utils/types";

type CommandButtonProps = {
  command: string;
  text?: string;
  icon?: SVGIcon;
  tooltip?: string;
  colors?: ColorsFunction;
  variant?: ButtonVariant;
  className?: string;
};

export default function CommandButton({
  command,
  text,
  icon,
  tooltip,
  colors,
  variant,
  className,
}: CommandButtonProps) {
  const cmd = getCommand(command);
  const handleClick = () => {
    dispatchCommand(cmd.name);
  };
  return (
    <Button
      variant={variant}
      icon={icon === undefined ? cmd.icon : icon}
      onClick={handleClick}
      className={className}
      colors={colors}
      text={text === undefined ? cmd.label : text}
      tooltip={tooltip === undefined ? cmd.description : tooltip}
    />
  );
}
