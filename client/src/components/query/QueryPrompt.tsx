import * as monaco from "monaco-editor";
import { type editor } from "monaco-editor";
import { useEffect, useRef } from "react";

const MODIFIER_KEYS = [
  monaco.KeyCode.Shift,
  monaco.KeyCode.Ctrl,
  monaco.KeyCode.Alt,
  monaco.KeyCode.Meta,
  monaco.KeyCode.CapsLock,
];

export interface QuerySuggestionEvent {
  readonly keyboardEvent?: KeyboardEvent;
  readonly currentQuery: string;
  setSuggestion: (content: string) => void;
  preventDefault(): void;
}

type QueryPromptProps = {
  /**
   * The initial value of the editor.
   */
  value?: string;

  /**
   * The className property of the editor container.
   */
  className?: string;

  /**
   * A callback function that is called when the user validates a query.
   *
   * If the editor contains multiple queries (separated by a semicolon), this function is called for each query.
   */
  onValidate?: (query: string) => void;

  /**
   * A callback function that is called when the editor is ready for a suggestion.
   */
  onSuggest?: (event: QuerySuggestionEvent) => void;

  /**
   * The maximum number of rows to display in the editor (default is 10).
   */
  rows?: number;
};

/**
 * Edits and decorations used to display suggestions in the editor.
 */
type EditorSuggestionsEdits = {
  decorationIds: string[];
  undoEdits: editor.IValidEditOperation[];
};

/**
 * A prompt for entering queries.
 *
 * This component provides a simple editor for entering queries.
 * It supports basic query validation and suggestions.
 *
 * Validations:
 * [Enter] => Validate the query if the query if terminated by a semicolon, otherwise enter a new line.
 * [Meta + Enter] => Validate the query (regardless if the query is terminated by a semicolon or not).
 * [Shift + Enter] => Enter a new line without validating the query.
 *
 * Suggestions:
 * [Escape] => Remove the current suggestion.
 * [Tab] => Accept the current suggestion.
 */
export default function QueryPrompt({ className, value, onValidate, onSuggest, rows = 10 }: QueryPromptProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const suggestionRef = useRef<EditorSuggestionsEdits>(null);
  const preventSuggestion = useRef(false);

  /**
   * Execute a function without triggering a suggestion if the content of the model changes.
   *
   * This function is useful when we want to update the editor content with a suggestion or clear a suggestion but don't
   * want to trigger a new suggestion.
   *
   * @param fn the function to execute.
   */
  const applyWithoutTriggeringSuggestion = (fn: () => void) => {
    try {
      preventSuggestion.current = true;
      fn();
    } finally {
      preventSuggestion.current = false;
    }
  };

  /**
   * Creates a suggestion event object.
   *
   * This is a helper function that creates a suggestion event object that will be given to the onSuggest handler.
   */
  const makeSuggestionEvent = (properties: Partial<QuerySuggestionEvent>): QuerySuggestionEvent => {
    return {
      keyboardEvent: properties.keyboardEvent,
      currentQuery: properties.currentQuery,
      setSuggestion: (content) => {
        if (content) {
          applyWithoutTriggeringSuggestion(() => {
            suggestionRef.current = setSuggestion(editorRef.current, content);
          });
        }
      },
      preventDefault: () => {
        properties.keyboardEvent?.preventDefault();
      },
    };
  };

  /**
   * Handle the key down event in the editor.
   */
  const handleKeyDown = (e: monaco.IKeyboardEvent) => {
    const editor = editorRef.current;
    if (
      e.keyCode === monaco.KeyCode.Tab &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      suggestionRef.current
    ) {
      //
      // [Tab] Accept the current suggestion
      //
      applyWithoutTriggeringSuggestion(() => {
        acceptSuggestions(editor, suggestionRef.current);
        suggestionRef.current = null;
      });
      onSuggest?.(
        makeSuggestionEvent({
          currentQuery: getCurrentQuery(editor),
        })
      );
      e.preventDefault();
      e.stopPropagation();
    } else if (e.keyCode === monaco.KeyCode.Escape && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      //
      // [Escape] => Remove the suggestion
      //
      applyWithoutTriggeringSuggestion(() => {
        suggestionRef.current = clearSuggestions(editor, suggestionRef.current);
      });
      e.preventDefault();
      e.stopPropagation();
    } else if (e.keyCode === monaco.KeyCode.Enter && e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      //
      // [Meta + Enter] => Validate the query
      //
      applyWithoutTriggeringSuggestion(() => {
        acceptSuggestions(editor, suggestionRef.current);
        onValidate?.(getCurrentQuery(editor));
      });
      editor.getModel().setValue("");
      e.preventDefault();
      e.stopPropagation();
    } else if (!MODIFIER_KEYS.includes(e.keyCode)) {
      //
      // [Any key other than a modifier] => clear the suggestion
      //
      applyWithoutTriggeringSuggestion(() => {
        suggestionRef.current = clearSuggestions(editor, suggestionRef.current);
      });
    }
  };

  /**
   * A click anywhere in the editor will remove the suggestion.
   */
  const handleMouseDown = (_e: monaco.editor.IEditorMouseEvent) => {
    applyWithoutTriggeringSuggestion(() => {
      suggestionRef.current = clearSuggestions(editorRef.current, suggestionRef.current);
    });
  };

  /**
   * Handle the event emitted when the content of the current model has changed.
   */
  const handleDidChangeModelContent = (_e: monaco.editor.IModelContentChangedEvent) => {
    const editor = editorRef.current;
    if (!preventSuggestion.current) {
      // Trigger the suggest event if the cursor is at the end of the line
      applyWithoutTriggeringSuggestion(() => {
        const model = editor.getModel();
        const cursor = editor.getPosition();
        const endOfLine = model.getValueInRange(
          new monaco.Range(
            cursor.lineNumber,
            cursor.column,
            cursor.lineNumber,
            model?.getLineMaxColumn(cursor.lineNumber)
          )
        );
        const currentQuery = getCurrentQuery(editor);
        if (endOfLine.trim().length === 0 && currentQuery.length > 0) {
          onSuggest?.(
            makeSuggestionEvent({
              currentQuery,
            })
          );
        }
      });
    }
    updateLayout(editor, rows);
  };

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
      quickSuggestions: false,
    });
    const model = monaco.editor.createModel(value, "sql");
    editor.setModel(model);
    editor.onKeyDown(handleKeyDown);
    editor.onMouseDown(handleMouseDown);
    editor.onDidChangeModelContent(handleDidChangeModelContent);
    editor.focus();

    // Set the initial layout
    updateLayout(editor, rows);

    // Register a resize observer to update the layout of the editor when the container size changes
    // We want to make sure that the editor is always the same width as its container.
    const resizeObserver = new ResizeObserver(() => {
      updateLayout(editor, rows, containerRef.current?.clientWidth);
    });
    resizeObserver.observe(containerRef.current);

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

/**
 * Set the suggestion in the editor.
 *
 * @param editor the monaco editor instance.
 * @param prevSuggestions the list of previous suggestions ids.
 * @param content the content of the suggestion.
 * @returns the list of new suggestions ids.
 */
function setSuggestion(editor: editor.IStandaloneCodeEditor, content: string): EditorSuggestionsEdits {
  console.log("Set suggestion: ", content);
  const cursor = editor.getPosition();
  const model = editor.getModel();
  const decorations: editor.IModelDeltaDecoration[] = [];
  const edits: editor.IIdentifiedSingleEditOperation[] = [];
  const lines = content.split("\n");
  let text = "";
  lines.forEach((line, index) => {
    text += " " + model.getEOL();
    if (index === 0) {
      // The suggestion is on the same line as the cursor, we only need a decoration
      decorations.push({
        range: new monaco.Range(cursor.lineNumber, cursor.column - 1, cursor.lineNumber, cursor.column),
        options: {
          after: {
            content: line,
            inlineClassName: "suggestion",
          },
        },
      });
    } else {
      decorations.push({
        range: new monaco.Range(cursor.lineNumber + index, 2, cursor.lineNumber + index, 1),
        options: {
          before: {
            content: line,
            inlineClassName: "suggestion",
          },
        },
      });
    }
  });

  if (lines.length > 1) {
    edits.push({
      range: new monaco.Range(cursor.lineNumber + 1, 1, cursor.lineNumber + 1, 1),
      text,
    });
  }

  // Apply the edits and decorations
  const suggestionEdits: EditorSuggestionsEdits = {
    undoEdits: model.applyEdits(edits, true),
    decorationIds: model.deltaDecorations([], decorations),
  };

  editor.setPosition(cursor);
  return suggestionEdits;
}

function clearSuggestions(editor: editor.IStandaloneCodeEditor, suggestions: EditorSuggestionsEdits): null {
  if (!suggestions) return;
  console.log("Clear suggestions");
  const model = editor.getModel();
  model.applyEdits(suggestions.undoEdits);
  model.deltaDecorations(suggestions.decorationIds, []);
  return null;
}

/**
 * Accept the suggestions currently displayed in the editor.
 */
function acceptSuggestions(editor: editor.IStandaloneCodeEditor, suggestions: EditorSuggestionsEdits) {
  if (!suggestions) return;
  console.log("Accept suggestions");
  // 1. Get the content of the suggestion (stored as decorations in the editor)
  const model = editor.getModel();
  const decorations = model.getAllDecorations().filter((d) => suggestions.decorationIds.includes(d.id));
  const content = decorations.map((d) => {
    return d.options.after?.content ?? d.options.before?.content ?? "";
  });

  // 2. Clear the suggestion from the editor
  clearSuggestions(editor, suggestions);

  // 3. Apply the edits
  const cursor = editor.getPosition();
  model.pushEditOperations(
    [],
    [
      {
        range: new monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column),
        text: content.join(editor.getModel().getEOL()),
        forceMoveMarkers: true,
      },
    ],
    () => null
  );

  // 4. Move the cursor to the end of the suggestion
  editor.revealPosition(editor.getPosition());
}

/**
 * Get the query currently edited.
 */
function getCurrentQuery(editor: editor.IStandaloneCodeEditor): string {
  const cursor = editor.getPosition();
  return editor.getModel().getValueInRange(new monaco.Range(1, 1, cursor.lineNumber, cursor.column)).trimStart();
}
