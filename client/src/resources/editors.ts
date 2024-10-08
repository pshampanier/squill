import { SVGIcon } from "@/utils/types";

export type Editor = {
  /**
   * The name of the editor.
   */
  readonly name: string;

  /**
   * Specifies the file which the editor can open.
   */
  readonly selector?: RegExp;

  /**
   * The icon to be used for files associated with this editor.
   */
  readonly icon: SVGIcon;

  /**
   * The React component to be used for the editor.
   */
  readonly component: React.FunctionComponent<{ pageId: string }>;
};

export const editors = (function () {
  const editors: Editor[] = [];

  return {
    register(editor: Editor) {
      editors.push(editor);
    },

    /**
     * Get the editor by its name.
     */
    getEditorByName(name: string): Editor | undefined {
      return editors.find((e) => e.name === name);
    },

    /**
     * Get the editor that can open the given file.
     */
    getEditorByFilename(filename: string): Editor | undefined {
      return editors.find((e) => e.selector?.test(filename));
    },
  };
})();
