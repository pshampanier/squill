import { editor as monacoEditor } from "monaco-editor";
import { cx } from "classix";
import { editors } from "@/resources/editors";
import React, { useState, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownIcon from "@/icons/markdown-file.svg?react";
import EditCommandIcon from "@/icons/edit.svg?react";
import PreviewCommandIcon from "@/icons/preview.svg?react";
import Button from "@/components/core/Button";
import { useUserStore } from "@/stores/UserStore";
import { intoMonacoOptions } from "@/utils/monaco-workers";
import { useAppStore } from "@/stores/AppStore";

const MarkdownEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId: _pageId }) => {
  const [mode, setMode] = useState<"loading" | "preview" | "editor">("loading");
  const [content, setContent] = useState<string>("");
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor>();
  const initialContent = useRef<string>();
  const modified = useRef<boolean>(false);
  const monacoOptions = useUserStore((state) => intoMonacoOptions(state.settings.editorSettings));
  const colorScheme = useAppStore((state) => state.colorScheme);

  // Options for the Monaco editor
  const options = {
    ...monacoOptions,
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
      // setModified(page.id, true);
      modified.current = true;
    } else if (value === initialContent.current && modified.current) {
      // setModified(page.id, false);
      modified.current = false;
    }
  };

  if (mode === "loading") {
    return null;
  } else {
    return (
      <>
        <div
          className={cx(
            "w-full h-full relative p-2",
            "overflow-y-scroll markdown-body bg-transparent",
            mode === "preview" ? "block" : "hidden",
          )}
        >
          <Button
            className="absolute top-1 right-5 z-50"
            icon={EditCommandIcon}
            onClick={handleShowEditor}
            variant="ghost"
          />
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>

        <div className={"relative w-full h-full " + (mode === "editor" ? "block" : "hidden")}>
          <Button
            className="absolute top-1 right-5 z-50"
            icon={PreviewCommandIcon}
            onClick={handleShowPreview}
            variant="ghost"
          />
          <MonacoEditor
            className="w-full h-full"
            language="markdown"
            theme={`app-${colorScheme}-theme`}
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
