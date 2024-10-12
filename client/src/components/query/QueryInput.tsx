import cx from "classix";
import * as monaco from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom/client";
import ChevronIcon from "@/icons/chevron-right.svg?react";

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
type IEditorOptions = monaco.editor.IEditorOptions;
type IValidEditOperation = monaco.editor.IValidEditOperation;
type IOverlayWidget = monaco.editor.IOverlayWidget;
type IModelContentChangedEvent = monaco.editor.IModelContentChangedEvent;
type IEditorMouseEvent = monaco.editor.IEditorMouseEvent;
type IModelDeltaDecoration = monaco.editor.IModelDeltaDecoration;
type IIdentifiedSingleEditOperation = monaco.editor.IIdentifiedSingleEditOperation;

/**
 * The list of modifier keys.
 * This is used to prevent triggering a suggestion when a modifier key is pressed.
 */
const MODIFIER_KEYS = [
  monaco.KeyCode.Shift,
  monaco.KeyCode.Ctrl,
  monaco.KeyCode.Alt,
  monaco.KeyCode.Meta,
  monaco.KeyCode.CapsLock,
];

const DEFAULT_MONACO_OPTIONS: { editor: IEditorOptions; terminal: IEditorOptions } = {
  editor: {
    scrollBeyondLastLine: false,
  },
  terminal: {
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
  },
};

export interface QueryEditorInstance {
  /**
   * Set the focus to the editor.
   */
  focus(): void;
}

/**
 * Themes used by the monaco editor.
 *
 * Those themes have been created in the monaco-workers.ts.
 */
const MONACO_THEMES = { light: "app-light-theme", dark: "app-dark-theme" };

export interface QuerySuggestionEvent {
  readonly keyboardEvent?: KeyboardEvent;
  readonly currentQuery: string;
  setSuggestion: (content: string) => void;
  preventDefault(): void;
}

type QueryInputProps = {
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

  onChange?: (value: string) => void;

  /**
   * The mode of the editor (default is "editor").
   *
   * - "terminal": the input is in terminal mode, onValidate() is called when the user hits `⌘+[Enter]` or `Ctrl+[Enter]`
   *   or just [Enter] if the input ends with a semicolon (';').
   *   The input is cleared after the query is validated.
   * - "editor": the input is in editor mode, onValidate() is never called.
   */
  mode?: "terminal" | "editor";

  /**
   * The maximum number of rows to display in the input (default is 10).
   *
   * The `row` property is used to set the height of the input in the "terminal" mode only and will adjust the height to
   * fit the content up to the number of specified rows. Otherwise, in "editor" mode, the height of the input is
   * adjusted to fit the parent HTML element.
   */
  rows?: number;

  /**
   * The color scheme of the editor (default is "light").
   */
  colorScheme: "light" | "dark";

  /**
   * The placeholder to display when the editor is empty.
   *
   * If the placeholder height is greater than the editor height, the style min-height of the editor should be set to
   * accommodate the placeholder height (using className="min-h-[height]").
   */
  placeholder?: React.ReactNode;

  /**
   * A callback fired when the editor is mounted.
   */
  onMount?: (editor: QueryEditorInstance) => void;
};

/**
 * Edits and decorations used to display suggestions in the editor.
 */
type EditorSuggestionsEdits = {
  decorationIds: string[];
  undoEdits: IValidEditOperation[];
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
export default function QueryInput({
  className,
  value,
  onValidate,
  onSuggest,
  onChange,
  onMount,
  mode = "editor",
  rows,
  colorScheme = "light",
  placeholder,
}: QueryInputProps) {
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const suggestionRef = useRef<EditorSuggestionsEdits>(null);
  const preventSuggestion = useRef(false);

  // The placeholder is an overlay widget that is displayed in the editor when the editor is empty.
  // It's created once during the useEffect and is shown/hidden when the editor content changes.
  const placeholderRef = useRef<IOverlayWidget>(null);

  if (mode === "editor") {
    // In editor mode, `rows` is not used and we force it to undefined to let the editor adjust its height to the parent
    rows = undefined;
  }

  if (editorRef.current) {
    // If the editor is already mounted, we update the properties that may have changed.
    editorRef.current.updateOptions({
      theme: MONACO_THEMES[colorScheme],
    });
  }

  // The public API exposed to the parent component
  const editorInstance: QueryEditorInstance = useMemo(() => {
    return {
      focus() {
        editorRef.current?.focus();
      },
    };
  }, []);

  /**
   * Resize the editor.
   *
   * The editor is resized to display up to the maximum number of rows specified or takes the full height and width of
   * its parent HTML element.
   */
  const updateLayout = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const parentElement = containerRef.current;
    let width = parentElement.clientWidth;
    let height = parentElement.clientHeight;
    if (mode === "terminal") {
      const minHeight = parseInt(window.getComputedStyle(parentElement).minHeight);
      height = Math.min(
        editor.getContentHeight(),
        rows ? rows * editor.getOption(monaco.editor.EditorOption.lineHeight) : Number.MAX_VALUE,
      );
      if (!Number.isNaN(minHeight) && height < minHeight) {
        height = minHeight;
      }
      width = Math.max(0, width - 24); // pl-6=24px is the padding of the editor in terminal mode
    }
    editor.layout({ width, height });
  }, [rows]);

  /**
   * Show/hide the placeholder in the editor.
   */
  const showPlaceholder = useCallback((show: boolean) => {
    if (placeholderRef.current) {
      if (show) {
        editorRef.current.addOverlayWidget(placeholderRef.current);
      } else {
        editorRef.current.removeOverlayWidget(placeholderRef.current);
      }
    }
  }, []);

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
        }),
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
      // [Enter] => Validate the query
      //
      applyWithoutTriggeringSuggestion(() => {
        acceptSuggestions(editor, suggestionRef.current);
        onValidate?.(getCurrentQuery(editor));
      });
      editor.getModel().setValue("");
      e.preventDefault();
      e.stopPropagation();
    } else if (
      mode == "terminal" &&
      e.keyCode === monaco.KeyCode.Enter &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      //
      // [Enter] => If at the end of the input, check the input value is terminated by a semicolon, otherwise enter a
      // new line.
      //
      const lastLineNumber = editor.getModel().getLineCount();
      const cursor = editor.getPosition();
      const value = editor.getModel().getValue();
      if (cursor.lineNumber === lastLineNumber && value.trim().endsWith(";")) {
        applyWithoutTriggeringSuggestion(() => {
          acceptSuggestions(editor, suggestionRef.current);
          onValidate?.(getCurrentQuery(editor));
        });
        editor.getModel().setValue("");
        e.preventDefault();
        e.stopPropagation();
      } else {
        applyWithoutTriggeringSuggestion(() => {
          suggestionRef.current = clearSuggestions(editor, suggestionRef.current);
        });
      }
    } else if (!MODIFIER_KEYS.includes(e.keyCode)) {
      //
      // [Any key other than a modifier] => clear the suggestion
      //
      applyWithoutTriggeringSuggestion(() => {
        suggestionRef.current = clearSuggestions(editor, suggestionRef.current);
      });
    } else {
      console.log("Key code: ", e.keyCode);
    }
  };

  /**
   * A click anywhere in the editor will remove the suggestion.
   */
  const handleMouseDown = (_e: IEditorMouseEvent) => {
    applyWithoutTriggeringSuggestion(() => {
      suggestionRef.current = clearSuggestions(editorRef.current, suggestionRef.current);
    });
  };

  /**
   * Handle the event emitted when the content of the current model has changed.
   */
  const handleDidChangeModelContent = (_e: IModelContentChangedEvent) => {
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
            model?.getLineMaxColumn(cursor.lineNumber),
          ),
        );
        const currentQuery = getCurrentQuery(editor);
        if (endOfLine.trim().length === 0 && currentQuery.length > 0) {
          onSuggest?.(
            makeSuggestionEvent({
              currentQuery,
            }),
          );
        }
      });
    }

    const value = editor.getValue();

    // Show or hide the placeholder
    showPlaceholder(value.length === 0);

    // Notify the parent component that the value has changed
    onChange?.(value);

    // Update the layout of the editor
    updateLayout();
  };

  useEffect(() => {
    const editor = monaco.editor.create(containerRef.current, {
      theme: MONACO_THEMES[colorScheme],
      ...DEFAULT_MONACO_OPTIONS[mode],
    });
    const model = monaco.editor.createModel(value, "pgsql");
    editor.setModel(model);
    editor.onKeyDown(handleKeyDown);
    editor.onMouseDown(handleMouseDown);
    editor.onDidChangeModelContent(handleDidChangeModelContent);
    editor.focus();
    editorRef.current = editor;

    if (placeholder) {
      const root = document.createElement("div");
      root.className = "flex text-xs items-center select-none opacity-50 pointer-events-none";
      ReactDOM.createRoot(root).render(placeholder);
      placeholderRef.current = {
        getId: () => "widget.placeholder",
        getDomNode: () => root,
        getPosition() {
          return {
            preference: null,
          };
        },
      };
      showPlaceholder(model.getValue().length === 0);
    }

    // Notify the parent component that the editor is mounted
    onMount?.(editorInstance);

    // Set the initial layout
    updateLayout();

    // Register a resize observer to update the layout of the editor when the container size changes
    // We want to make sure that the editor is always the same width as its container.
    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      editor.dispose();
    };
  }, []);

  //
  // Rendering
  //
  const classes = cx("relative", mode === "terminal" && "query-terminal pl-6", className);
  return (
    <div ref={containerRef} className={classes} data-component="query-input">
      {mode === "terminal" && <ChevronIcon className="absolute left-0 top-1 inline-block w-4 h-4" />}
    </div>
  );
}

/**
 * Set the suggestion in the editor.
 *
 * @param editor the monaco editor instance.
 * @param prevSuggestions the list of previous suggestions ids.
 * @param content the content of the suggestion.
 * @returns the list of new suggestions ids.
 */
function setSuggestion(editor: IStandaloneCodeEditor, content: string): EditorSuggestionsEdits {
  console.log("Set suggestion: ", content);
  const cursor = editor.getPosition();
  const model = editor.getModel();
  const decorations: IModelDeltaDecoration[] = [];
  const edits: IIdentifiedSingleEditOperation[] = [];
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

function clearSuggestions(editor: IStandaloneCodeEditor, suggestions: EditorSuggestionsEdits): null {
  if (!suggestions) return;
  console.debug("Clear suggestions");
  const model = editor.getModel();
  model.applyEdits(suggestions.undoEdits);
  model.deltaDecorations(suggestions.decorationIds, []);
  return null;
}

/**
 * Accept the suggestions currently displayed in the editor.
 */
function acceptSuggestions(editor: IStandaloneCodeEditor, suggestions: EditorSuggestionsEdits) {
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
    () => null,
  );

  // 4. Move the cursor to the end of the suggestion
  editor.revealPosition(editor.getPosition());
}

/**
 * Get the query currently edited.
 */
function getCurrentQuery(editor: IStandaloneCodeEditor): string {
  const cursor = editor.getPosition();
  return editor
    .getModel()
    .getValueInRange(new monaco.Range(1, 1, cursor.lineNumber, cursor.column))
    .trimStart();
}
