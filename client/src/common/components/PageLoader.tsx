import Page from "./Page";
import Loader from "./core/Loader";

export function PageLoader() {
  return (
    <Page>
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    </Page>
  );
}
