import Page from "@/components/Page";
import Loader from "@/components/core/Loader";

export function PageLoader() {
  return (
    <Page>
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    </Page>
  );
}
