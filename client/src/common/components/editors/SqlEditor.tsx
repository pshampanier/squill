import React, { useEffect, useRef, useState } from "react";
import { editors } from "@/resources/editors";

import { useWorkspaceStore } from "@/stores/WorkspaceStore";

import SqlIcon from "@/icons/sql-file.svg?react";
import MonacoEditor from "react-monaco-editor";
import PageLoader from "@/components/PageLoader";

import { User } from "@/resources/user/user";
import { Workspace } from "@/resources/workspace/workspace";
import { useUserStore } from "@/stores/UserStore";

const SqlEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const colorScheme = useUserStore((state) => state.colorScheme);
  const setModified = useWorkspaceStore((state) => state.setModified);
  const page = useWorkspaceStore((state) => state.pages.find((page) => page.id === pageId));
  const [pageState, setPageState] = useState<"loading" | "ready">("loading");
  const [content, setContent] = useState<string>("");
  const initialContent = useRef<string>();
  const modified = useRef<boolean>(false);

  const currentUser = User.current;

  // Options for the Monaco editor
  const options = {
    ...currentUser.settings.editor.getMonacoEditorSettings(),
    automaticLayout: true,
  };

  // Handle changes to the editor content
  // In order to limit re-renders, we only update the modified state when the modified state changes
  const handleOnChange = (value: string) => {
    if (value !== initialContent.current && !modified.current) {
      setModified(page.id, true);
      modified.current = true;
    } else if (value === initialContent.current && modified.current) {
      setModified(page.id, false);
      modified.current = false;
    }
  };

  useEffect(() => {
    if (pageState === "loading") {
      Workspace.current.loadCollectionItem(page.itemId).then(([resource]) => {
        initialContent.current = resource.asText();
        setContent(initialContent.current);
        setPageState("ready");
      });
    }
  }, [pageState, page.itemId]);

  if (pageState === "loading") {
    return <PageLoader />;
  } else {
    return (
      <MonacoEditor
        className="w-full h-full"
        language="sql"
        theme={`app-${colorScheme}-theme`}
        value={content}
        options={options}
        onChange={handleOnChange}
      />
    );
  }
};

editors.register({
  name: "SQL",
  selector: /\.sql$/,
  icon: SqlIcon,
  component: SqlEditor,
});

export default SqlEditor;
