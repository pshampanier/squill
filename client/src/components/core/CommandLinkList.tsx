import { dispatchCommand, getCommand } from "@/utils/commands";
import Kbd from "@/components/core/Kbd";

type CommandLinksProps = {
  children: React.ReactNode;
};

/**
 * A list of command links.
 */
const CommandLinkList = ({ children }: CommandLinksProps) => {
  return <div className="mt-2">{children}</div>;
};

type CommandLinkProps = {
  /**
   * The name of the command to display.
   */
  command: string;
};

/**
 * A link associated with a command.
 */
function Link(props: CommandLinkProps) {
  const command = getCommand(props.command);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dispatchCommand(command.name, event.nativeEvent);
  };

  return (
    <dl className="text-sm table-row h-6 cursor-pointer" onClick={handleClick}>
      <dt className="table-cell text-right pr-1 align-middle">
        <a href="#">{command.description}</a>
      </dt>
      {command.shortcut && (
        <dd className="table-cell text-left">
          <Kbd shortcut={command.shortcut} />
        </dd>
      )}
    </dl>
  );
}

CommandLinkList.Link = Link;
export default CommandLinkList;
