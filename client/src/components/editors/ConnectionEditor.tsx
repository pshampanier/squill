import React from "react";
import { editors } from "@/resources/editors";
import ConnectionIcon from "@/icons/plug.svg?react";
import { EDITOR_CONNECTION } from "@/utils/constants";
import { useAppStore } from "@/stores/AppStore";
import QueryTerminal from "@/components/query/QueryTerminal";
import QueryPrompt from "@/components/query/QueryPrompt";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  const _page = useAppStore((state) => state.pages.find((page) => page.id === pageId));

  return (
    <div className="w-full h-full px-2">
      <QueryTerminal prompt={<ConnectionPrompt />} colorScheme={colorScheme} history={[]} />
    </div>
  );
};

function ConnectionPrompt() {
  return (
    <QueryPrompt>
      <span className="flex space-x-2 items-center">
        <span>postgres@adworks</span>
      </span>
      <QueryPrompt.DateTimeSegment date={new Date()} />
    </QueryPrompt>
  );
}

editors.register({
  name: EDITOR_CONNECTION,
  selector: null,
  icon: ConnectionIcon,
  component: ConnectionEditor,
});

export default ConnectionEditor;
