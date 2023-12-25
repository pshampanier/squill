import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import Page from "@/components/Page";
import { useClasses } from "@/utils/classes";

export default function Editor() {
  console.debug("Rendering Editor");
  const pages = useWorkspaceStore((state) => state.pages);
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  return pages.map((page) => {
    const EditorComponent = page.editor.component;
    const classes = useClasses(["w-full h-full", page.id === activePageId ? "block" : "hidden"]);
    return (
      <Page key={"editor-" + page.id} className={classes}>
        <EditorComponent key={page.id} page={page} />
      </Page>
    );
  });
}
