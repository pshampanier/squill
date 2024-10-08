import { useAppStore } from "@/stores/AppStore";
import Page from "@/components/layout/Page";
import { useUserStore } from "@/stores/UserStore";
import { getResourceHandler } from "@/resources/handlers";
import { useEffect } from "react";

export default function Editor() {
  //
  // States & Refs
  //
  const activeSpace = useAppStore((state) => state.activeSpace);
  const pages = useAppStore((state) => state.pages);

  //
  // Logic
  //
  useEffect(() => {
    // Updating the user store when the active item changes and there is not yet a page created for it.
    // We need to use a subscription to the store here because state changes we are about be make are not allowed during
    // the render phase.
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.activeId !== prevState.activeId) {
        console.log("activeId changed from", prevState.activeId, "to", state.activeId);
        const activePage = pages.find((page) => page.id === state.activePageId);
        if (activePage?.itemId !== state.activeId) {
          // The active item is not the same as the active page.
          // If the active page is not modified, we can reuse it for the active item.
          const modified = useUserStore.getState().catalog.get(activePage?.itemId)?.modified;
          if (!modified) {
            // We can reuse the active page for the active item.
            state.replacePage(state.activePageId, state.activeId);
          } else {
            // We need to create a new page for the active item.
            state.addPage(state.activeId);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  //
  // Rendering
  //
  return pages.map((page) => {
    const catalogItem = useUserStore.getState().catalog.get(page.itemId);
    const resourceHandler = getResourceHandler(catalogItem?.type);
    const EditorComponent = resourceHandler.editor(catalogItem, activeSpace);
    return (
      <Page key={"page-" + page.id} pageId={page.id}>
        <EditorComponent key={"editor-" + page.id} pageId={page.id} />
      </Page>
    );
  });
}
