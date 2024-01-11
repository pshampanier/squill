import { SVGIcon } from "@/utils/types";

export type Editor = {
  /**
   * The name of the editor.
   */
  readonly name: string;

  /**
   * Specifies the file which the editor can open.
   */
  readonly selector: RegExp;

  /**
   * The icon to be used for files associated with this editor.
   */
  readonly icon: SVGIcon;

  /**
   * The Readt component to be used for the editor.
   */
  readonly component: React.FunctionComponent<{ pageId: string }>;
};

export const editors = (function () {
  const editors: Editor[] = [];

  return {
    register(editor: Editor) {
      editors.push(editor);
    },

    getEditor(filename: string): Editor | undefined {
      return editors.find((e) => e.selector.test(filename));
    },
  };
})();
