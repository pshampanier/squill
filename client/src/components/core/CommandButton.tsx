import { dispatchCommand, getCommand } from "@/utils/commands";
import { ColorsFunction } from "@/utils/colors";
import Button, { ButtonSize, ButtonVariant } from "@/components/core/Button";
import { SVGIcon } from "@/utils/types";

type CommandButtonProps = {
  command: string;
  text?: string;

  /**
   * The icon to display on the button.
   *
   * If not provided, the icon from the command will be used, if available.
   * To prevent using the command icon, use the constant `NO_ICON`.
   */
  icon?: SVGIcon;
  tooltip?: string;
  colors?: ColorsFunction;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
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
  disabled,
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
      disabled={disabled}
      text={text === undefined ? cmd.label : text}
      tooltip={tooltip === undefined ? cmd.description : tooltip}
    />
  );
}
