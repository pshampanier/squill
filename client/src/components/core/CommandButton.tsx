import { dispatchCommand, getCommand } from "@/utils/commands";
import { ColorsFunction } from "@/utils/colors";
import Button, { ButtonSize, ButtonVariant } from "@/components/core/Button";
import { SVGIcon } from "@/utils/types";

type CommandButtonProps = {
  command: string;
  text?: string;
  icon?: SVGIcon;
  tooltip?: string;
  colors?: ColorsFunction;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export default function CommandButton({
  command,
  text,
  icon,
  tooltip,
  colors,
  variant,
  size = "lg",
  className,
}: CommandButtonProps) {
  const cmd = getCommand(command);
  const handleClick = () => {
    dispatchCommand(cmd.name);
  };
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon === undefined ? cmd.icon : icon}
      onClick={handleClick}
      className={className}
      colors={colors}
      text={text === undefined ? cmd.label : text}
      tooltip={tooltip === undefined ? cmd.description : tooltip}
    />
  );
}
