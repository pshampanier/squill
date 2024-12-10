import { QueryExecution } from "@/models/queries";
import Menu from "@/components/core/Menu";
import HistoryIcon from "@/icons/history.svg?react";
import { KeyboardShortcut } from "@/utils/types";

type QuerySuggestionMenuProps = {
  suggestions: QueryExecution[];
};

/**
 * A React component that renders a menu with query suggestions.
 */
export default function QuerySuggestionMenu({ suggestions }: QuerySuggestionMenuProps) {
  const handleOnClick = (value: string) => {
    console.log("menu: ", value);
  };
  if (!suggestions || suggestions.length === 0) {
    return null;
  }
  return (
    <Menu tabIndex={-1}>
      <Menu.Group>
        {suggestions.map((suggestion, index) => {
          const shortcut: KeyboardShortcut = index < 9 ? [`Meta+${index + 1}`, `Ctrl+${index + 1}`] : undefined;
          return (
            <Menu.Item key={index} onClick={handleOnClick} icon={HistoryIcon} shortcut={shortcut}>
              <pre className="text-xs align-middle max-h-32 text-wrap overflow-hidden">{suggestion.text}</pre>
            </Menu.Item>
          );
        })}
      </Menu.Group>
    </Menu>
  );
}
