import React from "react";
import { editors } from "@/resources/editors";
import { EDITOR_USER_BLANK } from "@/utils/constants";
import PageLinks from "@/components/PageLinks";
import AppLogoIcon from "@/icons/app-logo.svg?react";

/**
 * A blank page displayed in the User Space when no item is selected.
 */
const UserBlankEditor: React.FunctionComponent<{ pageId: string }> = () => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <h1 className="text-xl font-bold">No selection</h1>
        <PageLinks>
          <PageLinks.Link shortcut={"Ctrl+Alt+C"}>Create a new connection</PageLinks.Link>
          <PageLinks.Link shortcut={["Meta+Shift+N", "Ctrl+Shift+N"]}>Create a new folder</PageLinks.Link>
        </PageLinks>
      </div>
    </div>
  );
};

editors.register({
  name: EDITOR_USER_BLANK,
  selector: null,
  icon: AppLogoIcon,
  component: UserBlankEditor,
});

export default UserBlankEditor;
