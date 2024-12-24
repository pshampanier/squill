import cx from "classix";
import * as monaco from "monaco-editor";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom/client";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import { MonacoEditorSettings } from "@/models/user-settings";
import { intoMonacoOptions } from "@/utils/monaco-workers";

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

  /**
   * Force the validation.
   */
  validate(): void;

  /**
   * Set the current value of the editor.
   */
  setValue(value: string): void;

  /**
   * Get the query associated to the current cursor position.
   */
  getCursorQuery(): string;

  /**
   * Set the inline suggestion.
   */
  setInlineSuggestion(content: string): void;

  /**
   * Dismiss the inline suggestion currently displayed in the editor.
   */
  dismissInlineSuggestion(): void;

  /**
   * Apply the inline suggestion currently displayed in the editor.
   */
  applyInlineSuggestion(): void;

  /**
   * Get the size of the editor.
   *
   * The width and height returned by this function are similar to the clientWidth and clientHeight properties of a DOM
   * element in that they represent the inner dimensions of the editor, excluding borders and scrollbars but including
   * padding
   */
  getSize(): { width: number; height: number };
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
  setInlineSuggestion: (content: string) => void;
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

  /**
   * A callback fired when the editor is resized.
   *
   * @param size with new size of the editor.
   */
  onResize?: (size: { width: number; height: number }) => void;

  /**
   * The settings of the Monaco editor that can be adjusted b the user.
   */
  settings?: MonacoEditorSettings;
};

/**
 * Edits and decorations used to display the inline suggestion in the editor.
 */
type EditorInlineSuggestionEdits = {
  decorationIds: string[];
  undoEdits: IValidEditOperation[];
};

/**
 * A prompt for entering queries.
 *
 * This component provides a simple editor for entering queries.
 * It supports basic query validation and suggestion.
 *
 * Validations:
 * [Enter] => Validate the query if the query if terminated by a semicolon, otherwise enter a new line.
 * [Shift + Enter] => Enter a new line without validating the query.
 *
 * Inline Suggestions:
 * [Escape] => Dismiss the current inline suggestion.
 * [Tab] => Accept the current inline suggestion.
 */
export default function QueryInput({
  className,
  value,
  onValidate,
  onSuggest,
  onChange,
  onMount,
  onResize,
  mode = "editor",
  rows,
  colorScheme = "light",
  placeholder,
  settings,
}: QueryInputProps) {
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inlineSuggestionRef = useRef<EditorInlineSuggestionEdits>(null);
  const preventInlineSuggestion = useRef(false);

  // The placeholder is an overlay widget that is displayed in the editor when the editor is empty.
  // It's created once during the useEffect and is shown/hidden when the editor content changes.
  const placeholderRef = useRef<IOverlayWidget>(null);

  if (mode === "editor") {
    // In editor mode, `rows` is not used and we force it to undefined to let the editor adjust its height to the parent
    rows = undefined;
  }

  //
  // Settings or theme updated...
  //
  useEffect(() => {
    editorRef.current?.updateOptions({
      theme: MONACO_THEMES[colorScheme],
      ...DEFAULT_MONACO_OPTIONS[mode],
      ...intoMonacoOptions(settings),
    });
  }, [colorScheme, settings]);

  /**
   * Get the size of the editor.
   */
  const getSize = useCallback(() => {
    const containerStyle = window.getComputedStyle(containerRef.current);
    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;
    width += parseInt(containerStyle.paddingLeft) + parseInt(containerStyle.paddingRight);
    height += parseInt(containerStyle.paddingTop) + parseInt(containerStyle.paddingBottom);
    return { width, height };
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

    const currentLayout = editor.getLayoutInfo();
    if (currentLayout.width !== width || currentLayout.height !== height) {
      editor.layout({ width, height });
      onResize?.(getSize());
      console.log("Query Editor layout updated: ", { width, height });
    }
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
   * Get the query associated to the current cursor position.
   *
   * This function does not return the query if the editor contains multiple selections.
   * This function returns the query associated to the current cursor position. The query is the text between the cursor
   * position and the end of the line.
   */
  const getCursorQuery = useCallback((): string => {
    const editor = editorRef.current;
    if (!editor || editor.getSelections().length > 1) return "";
    const cursor = editor?.getPosition();
    return editor
      ?.getModel()
      .getValueInRange(new monaco.Range(1, 1, cursor.lineNumber, cursor.column))
      .trimStart();
  }, []);

  /**
   * Execute a function without triggering an inline suggestion if the content of the model changes.
   *
   * This function is useful when we want to update the editor content with an inline suggestion or dismiss the inline
   * suggestion but don't want to trigger a new inline suggestion.
   *
   * @param fn the function to execute.
   */
  const applyWithoutTriggeringSuggestion = useCallback((fn: () => void) => {
    try {
      preventInlineSuggestion.current = true;
      fn();
    } finally {
      preventInlineSuggestion.current = false;
    }
  }, []);

  /**
   * Dismiss the inline suggestion currently displayed in the editor.
   */
  const dismissInlineSuggestion = useCallback(() => {
    const suggestion = inlineSuggestionRef.current;
    if (!suggestion) return;
    console.debug("Clear suggestion");
    const model = editorRef.current?.getModel();
    model?.applyEdits(suggestion.undoEdits);
    model?.deltaDecorations(suggestion.decorationIds, []);
    inlineSuggestionRef.current = null;
  }, []);

  /**
   * Accept the inline suggestion currently displayed in the editor.
   */
  const applyInlineSuggestion = useCallback(() => {
    const suggestion = inlineSuggestionRef.current;
    if (!suggestion) return;
    const editor = editorRef.current;
    const model = editor?.getModel();
    // 1. Get the content of the suggestion (stored as decorations in the editor)
    const decorations = model?.getAllDecorations().filter((d) => suggestion.decorationIds.includes(d.id));
    const content = decorations?.map((d) => {
      return d.options.after?.content ?? d.options.before?.content ?? "";
    });

    // 2. Clear the suggestion from the editor
    dismissInlineSuggestion();

    // 3. Apply the edits
    const cursor = editor.getPosition();
    model.pushEditOperations(
      [],
      [
        {
          range: new monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column),
          text: content.join(model.getEOL()),
          forceMoveMarkers: true,
        },
      ],
      () => null,
    );

    // 4. Move the cursor to the end of the suggestion
    editor.revealPosition(editor.getPosition());
    console.log("Accept inline suggestion: ", content);
  }, []);

  /**
   * Set the inline suggestion.
   *
   * @param content the content of the suggestion.
   */
  const setInlineSuggestion = useCallback((content: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    console.debug("Set inline suggestion: ", content);
    const model = editor.getModel();
    const cursor = editor.getPosition();
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
    inlineSuggestionRef.current = {
      undoEdits: model.applyEdits(edits, true),
      decorationIds: model.deltaDecorations([], decorations),
    };

    editor.setPosition(cursor);
  }, []);

  /**
   * Validate the content the editor (terminal mode only).
   */
  const validate = useCallback(() => {
    const editor = editorRef.current;
    applyWithoutTriggeringSuggestion(() => {
      dismissInlineSuggestion();
      onValidate?.(editor.getModel().getValue());
      editor.getModel().setValue("");
    });
  }, [onValidate]);

  /**
   * Creates a suggestion event object.
   *
   * This is a helper function that creates a suggestion event object that will be given to the onSuggest handler.
   */
  const makeSuggestionEvent = (properties: Partial<QuerySuggestionEvent>): QuerySuggestionEvent => {
    return {
      keyboardEvent: properties.keyboardEvent,
      currentQuery: properties.currentQuery,
      setInlineSuggestion: (content) => {
        if (content) {
          applyWithoutTriggeringSuggestion(() => {
            setInlineSuggestion(content);
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
  const handleKeyDown = useCallback(
    (e: monaco.IKeyboardEvent) => {
      const editor = editorRef.current;
      if (
        e.keyCode === monaco.KeyCode.Tab &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        inlineSuggestionRef.current
      ) {
        //
        // [Tab] Accept the current inline suggestion
        //
        applyWithoutTriggeringSuggestion(() => {
          applyInlineSuggestion();
        });
        onSuggest?.(
          makeSuggestionEvent({
            currentQuery: getCursorQuery(),
          }),
        );
        e.preventDefault();
        e.stopPropagation();
      } else if (e.keyCode === monaco.KeyCode.Escape && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        //
        // [Escape] => Remove the inline suggestion
        //
        applyWithoutTriggeringSuggestion(() => {
          dismissInlineSuggestion();
        });
        e.preventDefault();
        e.stopPropagation();
      } else if (
        mode == "terminal" &&
        editor.getSelections().length === 1 &&
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
        const textAfterCursor = editor
          .getModel()
          .getValueInRange(
            new monaco.Range(
              cursor.lineNumber,
              cursor.column,
              lastLineNumber,
              editor.getModel().getLineMaxColumn(lastLineNumber),
            ),
          );
        const value = editor.getModel().getValue();
        if (textAfterCursor.trim().length === 0 && value.trim().endsWith(";")) {
          validate();
          e.preventDefault();
          e.stopPropagation();
        } else {
          applyWithoutTriggeringSuggestion(() => {
            dismissInlineSuggestion();
          });
        }
      } else if (!MODIFIER_KEYS.includes(e.keyCode)) {
        //
        // [Any key other than a modifier] => dismiss the inline suggestion
        //
        applyWithoutTriggeringSuggestion(() => {
          dismissInlineSuggestion();
        });
      } else {
        console.log("Key code: ", e.keyCode);
      }
    },
    [validate],
  );

  // Whenever the callback function changes, we update the keydown event listener in the editor.
  useEffect(() => {
    editorRef.current?.onKeyDown(handleKeyDown);
  }, [handleKeyDown]);

  /**
   * A click anywhere in the editor will dismiss the inline suggestion.
   */
  const handleMouseDown = (_e: IEditorMouseEvent) => {
    applyWithoutTriggeringSuggestion(() => {
      dismissInlineSuggestion();
    });
  };

  /**
   * Handle the event emitted when the content of the current model has changed.
   */
  const handleDidChangeModelContent = (_e: IModelContentChangedEvent) => {
    const editor = editorRef.current;
    if (!preventInlineSuggestion.current) {
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
        const currentQuery = getCursorQuery();
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

  // The public API exposed to the parent component
  const editorInstance: QueryEditorInstance = useMemo(() => {
    return {
      focus() {
        editorRef.current?.focus();
      },
      validate,
      getCursorQuery,
      setValue(value: string) {
        applyWithoutTriggeringSuggestion(() => {
          dismissInlineSuggestion();
          editorRef.current?.getModel().setValue(value);
        });
      },
      setInlineSuggestion(content: string) {
        applyWithoutTriggeringSuggestion(() => {
          setInlineSuggestion(content);
        });
      },
      dismissInlineSuggestion() {
        applyWithoutTriggeringSuggestion(() => {
          dismissInlineSuggestion();
        });
      },
      applyInlineSuggestion() {
        applyWithoutTriggeringSuggestion(() => {
          applyInlineSuggestion();
        });
      },
      getSize,
    };
  }, []);

  useEffect(() => {
    const editor = monaco.editor.create(containerRef.current, {
      theme: MONACO_THEMES[colorScheme],
      ...DEFAULT_MONACO_OPTIONS[mode],
      ...intoMonacoOptions(settings),
    });
    const model = monaco.editor.createModel(value, "pgsql");
    editor.setModel(model);
    editor.onKeyDown(handleKeyDown);
    editor.onMouseDown(handleMouseDown);
    editor.onDidChangeModelContent(handleDidChangeModelContent);
    editor.focus();
    editorRef.current = editor;

    if (mode === "terminal") {
      //
      // Disable the default keybinding for some commands
      //
      [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, monaco.KeyCode.F3, monaco.KeyCode.F3, monaco.KeyCode.F1].forEach(
        (keybinding) => {
          monaco.editor.addKeybindingRule({
            keybinding,
            command: null,
          });
        },
      );

      //
      // Display the placeholder
      //
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
