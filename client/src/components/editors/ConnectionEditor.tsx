import React from "react";
import { editors } from "@/resources/editors";
import ConnectionIcon from "@/icons/plug.svg?react";
import { EDITOR_CONNECTION } from "@/utils/constants";
import { useAppStore } from "@/stores/AppStore";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));

  return (
    <div className="w-full h-full">
      <div>{page.title}</div>
    </div>
  );
};

editors.register({
  name: EDITOR_CONNECTION,
  selector: null,
  icon: ConnectionIcon,
  component: ConnectionEditor,
});

export default ConnectionEditor;
