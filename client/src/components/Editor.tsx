import { cx } from "classix";
import { useAppStore } from "@/stores/AppStore";
import Page from "@/components/Page";

export default function Editor() {
  const pages = useAppStore((state) => state.pages);
  const activePageId = useAppStore((state) => state.activePageId);
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
