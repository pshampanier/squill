import * as monaco from "monaco-editor";
import { type editor } from "monaco-editor";
import { useEffect, useRef } from "react";

type QueryPromptProps = {
  value?: string;
  className?: string;
  onValidate?: (value: string) => void;
  rows?: number;
};

/**
 * A prompt for entering queries.
 */
export default function QueryPrompt({ className, value, onValidate, rows = 10 }: QueryPromptProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = monaco.editor.create(containerRef.current, {
      theme: "vs-light",
      automaticLayout: false,
      minimap: { enabled: false },
      cursorStyle: "underline",
      renderLineHighlight: "none",
      wordWrap: "on",
      contextmenu: false,
      padding: { top: 0, bottom: 0 },
      /** the following option are used to remove the left margin */
      lineNumbers: "off",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      /** the next 4 options hide the scrollbars */
      scrollbar: { vertical: "hidden", horizontal: "hidden", useShadows: false, alwaysConsumeMouseWheel: false },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      overviewRulerLanes: 0,
      scrollBeyondLastLine: false,
    });
    const model = monaco.editor.createModel(value, "sql");
    editor.setModel(model);

    editor.onKeyDown((e: monaco.IKeyboardEvent) => {
      if (e.keyCode === monaco.KeyCode.Enter && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        onValidate?.(editor.getValue());
        editor.setValue("");
      }
    });

    // Set the initial layout
    updateLayout(editor, rows);

    editor.onDidChangeModelContent(() => {
      updateLayout(editor, rows);
    });

    // Register a resize observer to update the layout of the editor when the container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateLayout(editor, rows, containerRef.current?.clientWidth);
    });
    resizeObserver.observe(containerRef.current);

    editor.focus();
    editorRef.current = editor;

    return () => {
      resizeObserver.disconnect();
      editor.dispose();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}

/**
 * Resize the editor.
 *
 * The editor is resized to display up tp the maximum number of rows specified and use the width of the container.
 *
 * @param editor the monaco editor instance.
 * @param rows the maximum number of rows to display.
 * @param containerWidth (optional) the width of the container (default is the current width of the editor).
 */
function updateLayout(editor: editor.IStandaloneCodeEditor, rows: number, containerWidth?: number) {
  const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
  const width = containerWidth === undefined ? editor.getLayoutInfo().width : containerWidth;
  const height = Math.min(editor.getContentHeight(), rows * lineHeight);
  editor.layout({ width, height });
}
