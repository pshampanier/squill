import { editor as monacoEditor } from "monaco-editor";
import React, { useEffect, useRef, useState } from "react";
import { editors } from "@/resources/editors";

import { WorkspacePage } from "@/stores/WorkspaceStore";

import SqlIdon from "@/icons/sql-file.svg?react";
import MonacoEditor from "react-monaco-editor";
import { PageLoader } from "../PageLoader";
import { User } from "@/resources/user/user";
import { Workspace } from "@/resources/workspace/workspace";

const SqlEditor: React.FunctionComponent<{ page: WorkspacePage }> = ({ page }) => {
  console.log("Rendering SqlEditor");

  const [pageState, setPageState] = useState<"loading" | "ready">("loading");
  const [content, setContent] = useState<string>("");

  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor>();
  const currentUser = User.current;

  // Options for the Monaco editor
  const options = {
    ...currentUser.settings.editor.getMonacoEditorSettings(),
    automaticLayout: true,
  };

  useEffect(() => {
    if (pageState === "loading") {
      console.log("MarkdownEditor SQL: useEffect");
      Workspace.current.loadCollectionItem(page.itemId).then(([resource]) => {
        setContent(resource.asText());
        setPageState("ready");
      });
    }
  }, [pageState, page.itemId]);

  if (pageState === "loading") {
    return <PageLoader />;
  } else {
    return (
      <div className="relative w-full h-full ">
        <MonacoEditor
          className="relative w-full h-full"
          language="sql"
          theme={"vs-" + currentUser.settings.theme}
          value={content}
          options={options}
          editorDidMount={(editor) => {
            editorRef.current = editor;
            editor.focus();
          }}
        />
      </div>
    );
  }
};

editors.register({
  name: "SQL",
  selector: /\.sql$/,
  icon: SqlIdon,
  component: SqlEditor,
});

export default SqlEditor;
