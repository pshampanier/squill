import { useWorkspaceStore } from "@/stores/WorkspaceStore";
import Page from "./Page";

export default function Editor() {
  console.debug("Rendering Editor");
  const pages = useWorkspaceStore((state) => state.pages);
  const activePageId = useWorkspaceStore((state) => state.activePageId);
  return (
    <Page>
      {pages.map((page) => {
        const EditorComponent = page.editor.component;
        return (
          <div
            key={"editor-" + page.id}
            className={"p-6 w-full h-full " + (page.id === activePageId ? "block" : "hidden")}
          >
            <EditorComponent key={page.id} page={page} />
          </div>
        );
      })}
    </Page>
  );
}
