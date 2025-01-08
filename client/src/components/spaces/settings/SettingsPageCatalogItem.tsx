import { useAppStore } from "@/stores/AppStore";
import { useUserStore } from "@/stores/UserStore";
import { Connection } from "@/models/connections";
import { useCallback, useEffect, useMemo } from "react";
import LoadingContainer from "@/components/core/LoadingContainer";
import SettingsPageConnection from "@/components/spaces/settings/SettingsPageConnection";

export default function SettingsPageCatalogItem() {
  //
  // States
  //
  const selectedPage = useAppStore((state) => state.settings.selectedPage);
  const catalogItemId = selectedPage.substring("catalog:".length);
  const catalogItem = useUserStore((state) => state.getCatalogItem(catalogItemId));
  const resource = useAppStore((state) => state.settings.resources.find((r) => r.id === catalogItemId));

  //
  // Actions
  //
  const loadCatalogResource = useUserStore((state) => state.loadCatalogResource);
  const changeResourceSettings = useAppStore((state) => state.changeResourceSettings);

  // Load the catalog item resource if it is not loaded yet and add it to the resources settings.
  useEffect(() => {
    if (!resource) {
      if (catalogItem && !catalogItem.resource && !catalogItem.lastError) {
        loadCatalogResource(catalogItem.id);
      } else if (catalogItem && catalogItem.resource) {
        // The resource is loaded.
        changeResourceSettings(catalogItem.resource);
      }
    }
  }, [resource, catalogItem]);

  const handleRetry = useCallback(() => {
    loadCatalogResource(catalogItem?.id);
  }, [catalogItem]);

  const status = useMemo(() => {
    if (resource) {
      return "success";
    } else if (catalogItem?.lastError) {
      return "error";
    } else {
      return "running";
    }
  }, [resource, catalogItem]);

  return (
    <LoadingContainer
      size="lg"
      status={status}
      errorFallback="Catalog item cannot be loaded."
      message={`Loading '${catalogItem?.name}'...`}
      onRetry={handleRetry}
    >
      {catalogItem?.type === "connection" && (
        <SettingsPageConnection key={resource?.id} connection={resource as Connection} />
      )}
    </LoadingContainer>
  );
}
