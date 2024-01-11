import { cx } from "classix";

import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import Page from "@/components/Page";

export default function Editor() {
  console.debug("Rendering Editor");
  const pages = useWorkspaceStore((state) => state.pages);
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  return pages.map((page) => {
    const EditorComponent = page.editor.component;
    const classes = cx("w-full h-full", page.id === activePageId ? "block" : "hidden");
    return (
      <Page key={"editor-" + page.id} className={classes}>
        <EditorComponent key={page.id} pageId={page.id} />
      </Page>
    );
  });
}
