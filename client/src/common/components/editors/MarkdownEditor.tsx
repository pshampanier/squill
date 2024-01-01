import "github-markdown-css/github-markdown.css";
import { editor as monacoEditor } from "monaco-editor";

import { User } from "@/resources/user/user";
import { Workspace } from "@/resources/workspace/workspace";
import { editors } from "@/resources/editors";
import { useClasses } from "@/utils/classes";
import { useWorkspaceStore, WorkspacePage } from "@/stores/WorkspaceStore";

import React, { useEffect, useState, useRef } from "react";

import MonacoEditor from "react-monaco-editor";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import IconButton from "@/components/core/IconButton";
import PageLoader from "@/components/PageLoader";

import MarkdownIcon from "@/icons/markdown-file.svg?react";
import EditCommandIcon from "@/icons/edit.svg?react";
import PreviewCommandIcon from "@/icons/preview.svg?react";

const MarkdownEditor: React.FunctionComponent<{ page: WorkspacePage }> = ({ page }) => {
  const [mode, setMode] = useState<"loading" | "preview" | "editor">("loading");
  const [content, setContent] = useState<string>("");
  const setModified = useWorkspaceStore((state) => state.setModified);
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor>();
  const initialContent = useRef<string>();
  const modified = useRef<boolean>(false);

  const workspace = Workspace.current;

  // Options for the Monaco editor
  const options = {
    ...User.current.settings.editor.getMonacoEditorSettings(),
    automaticLayout: true,
  };

  const handleShowPreview = () => {
    setMode("preview");
    const value = editorRef.current?.getValue();
    setContent(value || "");
  };

  const handleShowEditor = () => {
    setMode("editor");
    editorRef.current && editorRef.current.focus();
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
    if (mode === "loading") {
      console.log("MarkdownEditor: useEffect");
      setMode("loading");
      workspace.loadCollectionItem(page.itemId).then(([resource]) => {
        initialContent.current = resource.asText();
        setContent(initialContent.current);
        setMode("preview");
      });
    }
  }, [mode, workspace, page.itemId]);

  if (mode === "loading") {
    return <PageLoader />;
  } else {
    return (
      <>
        <div
          className={useClasses([
            "w-full h-full relative",
            "overflow-y-scroll markdown-body",
            mode === "preview" ? "block" : "hidden",
          ])}
        >
          <IconButton
            className="absolute top-1 right-5 z-50 text-blue-200"
            icon={EditCommandIcon}
            onClick={handleShowEditor}
          />
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>

        <div className={"relative w-full h-full " + (mode === "editor" ? "block" : "hidden")}>
          <IconButton className="absolute top-1 right-5 z-50" icon={PreviewCommandIcon} onClick={handleShowPreview} />
          <MonacoEditor
            className="w-full h-full"
            language="markdown"
            theme={"vs-" + User.current.settings.theme}
            value={content}
            options={options}
            editorDidMount={(editor) => {
              editorRef.current = editor;
              mode === "editor" && editor.focus();
            }}
            onChange={handleOnChange}
          />
        </div>
      </>
    );
  }
};

editors.register({
  name: "Markdown",
  selector: /^README$|^CONTRIBUTING$|.*\.md$/,
  icon: MarkdownIcon,
  component: MarkdownEditor,
});

export default MarkdownEditor;
