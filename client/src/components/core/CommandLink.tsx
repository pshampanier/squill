import { dispatchCommand, getCommand } from "@/utils/commands";
import cx from "classix";

type CommandLinkProps = {
  /**
   * Additional CSS classes to apply to the top element in the component.
   */
  className?: string;

  /**
   * The name of the command to display.
   */
  command: string;
};

/**
 * A link associated with a command.
 */
export default function CommandLink({ className, command: name }: CommandLinkProps) {
  const command = getCommand(name);

  const handleClick = (event: React.MouseEvent) => {
    dispatchCommand(command.name);
    event.preventDefault();
    event.stopPropagation();
  };

  const classes = cx("text-blue-400 dark:text-blue-300 hover:underline", className);

  return (
    <a href="#" draggable="false" className={classes} onClick={handleClick}>
      {command.description}
    </a>
  );
}
